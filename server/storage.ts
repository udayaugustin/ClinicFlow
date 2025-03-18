import { InsertUser, User, Clinic, Appointment, attenderDoctors, AttenderDoctor, doctorDetails, insertDoctorDetailSchema, doctorSchedules, type DoctorSchedule, type InsertDoctorSchedule } from "@shared/schema";
import { users, clinics, appointments, doctorAvailability } from "@shared/schema"; // Added doctorAvailability import
import { eq, or, and, sql, inArray, lte, gte, count } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { Pool } from '@neondatabase/serverless';
import { pool } from "./db";
import { DoctorDetail } from "@shared/schema";

const pgSession = connectPg(session);

const sessionStore = new pgSession({
  pool: pool as any,
  tableName: 'session',
  createTableIfMissing: true
});

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDoctors(): Promise<User[]>;
  getDoctorsBySpecialty(specialty: string): Promise<User[]>;
  getDoctorWithClinic(id: number): Promise<(User & { clinic?: Clinic }) | undefined>;
  getDoctorsNearLocation(lat: number, lng: number, radiusInMiles?: number): Promise<User[]>;
  getClinics(): Promise<Clinic[]>;
  getAppointments(userId: number): Promise<(Appointment & { doctor: User; patient?: User })[]>;
  createAppointment(appointment: Omit<Appointment, "id" | "tokenNumber">): Promise<Appointment>;
  getNextTokenNumber(doctorId: number, clinicId: number, date: Date): Promise<number>;
  sessionStore: session.Store;

  getAttenderDoctors(attenderId: number): Promise<(AttenderDoctor & { doctor: User })[]>;
  addDoctorToAttender(attenderId: number, doctorId: number, clinicId: number): Promise<AttenderDoctor>;
  removeDoctorFromAttender(attenderId: number, doctorId: number): Promise<void>;
  getAttendersByClinic(clinicId: number): Promise<User[]>;
  updateAppointmentStatus(
    appointmentId: number, 
    status: "scheduled" | "start" | "hold" | "pause" | "cancel" | "completed", 
    statusNotes?: string
  ): Promise<Appointment>;
  updateDoctorAvailability(
    doctorId: number,
    date: Date,
    isAvailable: boolean,
    currentToken?: number
  ): Promise<typeof doctorAvailability.$inferSelect>;
  getDoctorAvailability(doctorId: number, date: Date): Promise<typeof doctorAvailability.$inferSelect | undefined>;
  getPatientAppointments(patientId: number): Promise<(Appointment & { doctor: User })[]>;
  getAttenderDoctorsAppointments(attenderId: number): Promise<(AttenderDoctor & { doctor: User, appointments: (Appointment & { patient?: User })[] })[]>;

  // Token Progress method
  getCurrentTokenProgress(doctorId: number, clinicId: number, date: Date, retryCount?: number): Promise<{ currentToken: number; status: 'start' | 'completed' | 'scheduled' | 'hold' | 'pause' | 'cancel' | 'not_started' | 'no_appointments'; appointment?: Appointment }>;

  // Doctor management methods
  createDoctor(user: Omit<InsertUser, "role">, details: { consultationFee: number | string; consultationDuration: number; qualifications?: string; experience?: number; registrationNumber?: string; isEnabled?: boolean; }): Promise<User & { details: DoctorDetail }>;
  getDoctorDetails(doctorId: number): Promise<DoctorDetail | undefined>;
  updateDoctorDetails(doctorId: number, details: Partial<{
    consultationFee: number | string;
    consultationDuration: number;
    qualifications: string;
    experience: number;
    registrationNumber: string;
  }>): Promise<DoctorDetail>;
  toggleDoctorStatus(doctorId: number, isEnabled: boolean): Promise<DoctorDetail>;

  // Doctor schedules methods
  createDoctorSchedule(schedule: InsertDoctorSchedule): Promise<DoctorSchedule>;
  getDoctorSchedules(doctorId: number): Promise<DoctorSchedule[]>;
  getDoctorSchedulesByClinic(clinicId: number): Promise<(DoctorSchedule & { doctor: User })[]>;
  getDoctorSchedulesByDay(day: number): Promise<(DoctorSchedule & { doctor: User, clinic: Clinic })[]>;
  updateDoctorSchedule(id: number, schedule: Partial<InsertDoctorSchedule>): Promise<DoctorSchedule>;
  deleteDoctorSchedule(id: number): Promise<void>;
  getAvailableDoctors(clinicId: number, day: number, time: string): Promise<User[]>;
  getDoctorAvailableTimeSlots(doctorId: number, date: Date): Promise<{ 
    schedules: (DoctorSchedule & { clinic: Clinic, currentTokenCount?: number })[], 
    availableSlots: { 
      startTime: string, 
      endTime: string, 
      clinicId: number,
      clinicName: string
    }[] 
  }>;

  getAppointmentCountForDoctor(
    doctorId: number,
    clinicId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = sessionStore;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getDoctors(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "doctor"));
  }

  async getDoctorsBySpecialty(specialty: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.specialty, specialty));
  }

  async getDoctorWithClinic(id: number): Promise<(User & { clinic?: Clinic }) | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        name: users.name,
        role: users.role,
        specialty: users.specialty,
        bio: users.bio,
        imageUrl: users.imageUrl,
        address: users.address,
        city: users.city,
        state: users.state,
        zipCode: users.zipCode,
        latitude: users.latitude,
        longitude: users.longitude,
        clinicId: users.clinicId,
        clinic: clinics,
      })
      .from(users)
      .leftJoin(clinics, eq(users.clinicId, clinics.id))
      .where(eq(users.id, id));

    if (!result) return undefined;

    const { clinic, ...user } = result;
    return {
      ...user,
      clinic: clinic || undefined,
    };
  }

  async getDoctorsNearLocation(lat: number, lng: number, radiusInMiles: number = 10): Promise<User[]> {
    const haversineDistance = sql`
      69.0 * DEGREES(ACOS(
        COS(RADIANS(${lat})) * 
        COS(RADIANS(CAST(latitude AS FLOAT))) * 
        COS(RADIANS(CAST(longitude AS FLOAT)) - RADIANS(${lng})) + 
        SIN(RADIANS(${lat})) * 
        SIN(RADIANS(CAST(latitude AS FLOAT)))
      ))`;

    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "doctor"),
          sql`${haversineDistance} <= ${radiusInMiles}`
        )
      )
      .orderBy(haversineDistance);
  }

  async getClinics(): Promise<Clinic[]> {
    return await db.select().from(clinics);
  }

  async getAppointments(userId: number): Promise<(Appointment & { doctor: User; patient?: User })[]> {
    try {
      console.log('Getting appointments for user:', userId);

      // Get user first to determine the role
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      let appointmentsResult;

      if (user.role === "attender") {
        // For attenders, first get their managed doctors
        const managedDoctors = await this.getAttenderDoctors(userId);
        const doctorIds = managedDoctors.map(rel => rel.doctorId);

        console.log('Attender managed doctor IDs:', doctorIds);

        // Then get appointments for all managed doctors
        appointmentsResult = await db
          .select()
          .from(appointments)
          .where(inArray(appointments.doctorId, doctorIds));

      } else if (user.role === "doctor") {
        // For doctors, get appointments where they are the doctor
        appointmentsResult = await db
          .select()
          .from(appointments)
          .where(eq(appointments.doctorId, userId));

      } else {
        // For patients, only get their own appointments
        appointmentsResult = await db
          .select()
          .from(appointments)
          .where(eq(appointments.patientId, userId));
      }

      console.log('Basic appointments query result:', JSON.stringify(appointmentsResult, null, 2));

      if (!appointmentsResult?.length) {
        console.log('No appointments found for user:', userId);
        return [];
      }

      // Get all unique doctor IDs from the appointments
      const doctorIds = Array.from(new Set(appointmentsResult.map(apt => apt.doctorId)));
      console.log('Doctor IDs to fetch:', doctorIds);

      // Get all doctors in one query
      const doctors = await db
        .select()
        .from(users)
        .where(inArray(users.id, doctorIds));

      console.log('Doctors data:', JSON.stringify(doctors, null, 2));

      const doctorsMap = new Map(doctors.map(d => [d.id, d]));

      // Get patient data if needed (for doctor or attender view)
      let patientsMap = new Map<number, User>();
      if (user.role === "doctor" || user.role === "attender") {
        const patientIds = Array.from(new Set(appointmentsResult.map(apt => apt.patientId)));
        const patients = await db
          .select()
          .from(users)
          .where(inArray(users.id, patientIds));
        patientsMap = new Map(patients.map(p => [p.id, p]));
      }

      // Combine the data
      const fullAppointments = appointmentsResult.map(appointment => ({
        ...appointment,
        doctor: doctorsMap.get(appointment.doctorId)!,
        patient: (user.role === "doctor" || user.role === "attender")
          ? patientsMap.get(appointment.patientId)
          : undefined
      }));

      console.log('Final appointments data:', JSON.stringify(fullAppointments, null, 2));
      return fullAppointments;
    } catch (error) {
      console.error('Error in getAppointments:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  async getNextTokenNumber(doctorId: number, clinicId: number, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [result] = await db
      .select({
        maxToken: sql<number>`COALESCE(MAX(token_number), 0)`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.clinicId, clinicId),
          sql`date >= ${startOfDay} AND date < ${endOfDay}`
        )
      );

    return (result?.maxToken || 0) + 1;
  }

  async createAppointment(appointment: Omit<Appointment, "id" | "tokenNumber">): Promise<Appointment> {
    // Use the provided clinicId or get it from the doctor
    let clinicId = appointment.clinicId;
    
    if (!clinicId) {
      // If no clinicId provided, get the doctor's default clinic
      const doctor = await this.getUser(appointment.doctorId);
      if (!doctor || !doctor.clinicId) {
        throw new Error("Invalid doctor or doctor has no default clinic");
      }
      clinicId = doctor.clinicId;
    }
    
    // Get the day of week for the appointment date
    const appointmentDate = new Date(appointment.date);
    const dayOfWeek = appointmentDate.getDay();
    
    // Get the doctor's schedule for this day and clinic
    const [schedule] = await db
      .select()
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.doctorId, appointment.doctorId),
          eq(doctorSchedules.clinicId, clinicId),
          eq(doctorSchedules.dayOfWeek, dayOfWeek),
          eq(doctorSchedules.isActive, true)
        )
      );
      
    if (!schedule) {
      throw new Error("No active schedule found for this doctor on the selected day");
    }
    
    // Get current token count for this date
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [tokenCount] = await db
      .select({
        count: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, appointment.doctorId),
          eq(appointments.clinicId, clinicId),
          sql`date >= ${startOfDay} AND date < ${endOfDay}`
        )
      );
      
    // Check if token limit has been reached
    if (schedule.maxTokens !== null && tokenCount.count >= schedule.maxTokens) {
      throw new Error(`Maximum number of tokens (${schedule.maxTokens}) has been reached for this schedule`);
    }
    
    const tokenNumber = await this.getNextTokenNumber(
      appointment.doctorId,
      clinicId,
      appointment.date
    );

    const [created] = await db
      .insert(appointments)
      .values({
        ...appointment,
        clinicId,
        tokenNumber,
        status: appointment.status || "scheduled"
      })
      .returning();

    return created;
  }

  async getAttenderDoctors(attenderId: number): Promise<(AttenderDoctor & { doctor: User })[]> {
    try {
      console.log('Getting doctors for attender:', attenderId);

      // Step 1: Get attender-doctor relationships
      const relations = await db
        .select()
        .from(attenderDoctors)
        .where(eq(attenderDoctors.attenderId, attenderId));

      console.log('Attender-doctor relations:', JSON.stringify(relations, null, 2));

      if (!relations.length) {
        console.log(`No doctor relations found for attender: ${attenderId}`);
        return [];
      }

      // Step 2: Get all doctors in one query
      const doctorIds = relations.map(r => r.doctorId);
      console.log('Doctor IDs to fetch:', doctorIds);

      const doctors = await db
        .select()
        .from(users)
        .where(
          and(
            inArray(users.id, doctorIds),
            eq(users.role, "doctor")
          )
        );

      console.log('Doctors data:', JSON.stringify(doctors, null, 2));

      const doctorsMap = new Map(doctors.map(d => [d.id, d]));

      // Step 3: Combine the data
      const fullRelations = relations
        .map(relation => {
          const doctor = doctorsMap.get(relation.doctorId);
          if (!doctor) {
            console.error(`Doctor not found for relation: ${relation.id}`);
            return null;
          }
          return {
            ...relation,
            doctor
          };
        })
        .filter((rel): rel is (AttenderDoctor & { doctor: User }) => rel !== null);

      console.log('Final attender-doctor data:', JSON.stringify(fullRelations, null, 2));
      return fullRelations;
    } catch (error) {
      console.error('Error in getAttenderDoctors:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  async addDoctorToAttender(attenderId: number, doctorId: number, clinicId: number): Promise<AttenderDoctor> {
    try {
      const [relation] = await db
        .insert(attenderDoctors)
        .values({
          attenderId,
          doctorId,
          clinicId
        })
        .returning();

      if (!relation) {
        throw new Error('Failed to create attender-doctor relationship');
      }

      return relation;
    } catch (error) {
      console.error('Error adding doctor to attender:', error);
      throw error;
    }
  }

  async removeDoctorFromAttender(attenderId: number, doctorId: number): Promise<void> {
    await db
      .delete(attenderDoctors)
      .where(
        and(
          eq(attenderDoctors.attenderId, attenderId),
          eq(attenderDoctors.doctorId, doctorId)
        )
      );
  }

  async getAttendersByClinic(clinicId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.clinicId, clinicId),
          eq(users.role, "attender")
        )
      );
  }

  async updateAppointmentStatus(
    appointmentId: number, 
    status: "scheduled" | "start" | "hold" | "pause" | "cancel" | "completed", 
    statusNotes?: string
  ): Promise<Appointment> {
    try {
      const updateData: Partial<typeof appointments.$inferInsert> = { 
        status 
      };
      
      if (statusNotes !== undefined) {
        updateData.statusNotes = statusNotes;
      }
      
      const [updated] = await db
        .update(appointments)
        .set(updateData)
        .where(eq(appointments.id, appointmentId))
        .returning();

      if (!updated) {
        throw new Error('Appointment not found');
      }

      return updated;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  async updateDoctorAvailability(
    doctorId: number,
    date: Date,
    isAvailable: boolean,
    currentToken?: number
  ): Promise<typeof doctorAvailability.$inferSelect> {
    try {
      // Round date to start of day for consistency
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      // Try to update existing record first
      const [existing] = await db
        .select()
        .from(doctorAvailability)
        .where(
          and(
            eq(doctorAvailability.doctorId, doctorId),
            eq(doctorAvailability.date, dayStart)
          )
        );

      if (existing) {
        const [updated] = await db
          .update(doctorAvailability)
          .set({
            isAvailable,
            ...(currentToken !== undefined ? { currentToken } : {}),
          })
          .where(eq(doctorAvailability.id, existing.id))
          .returning();
        return updated;
      }

      // Create new record if none exists
      const [created] = await db
        .insert(doctorAvailability)
        .values({
          doctorId,
          date: dayStart,
          isAvailable,
          currentToken: currentToken || 0,
        })
        .returning();

      return created;
    } catch (error) {
      console.error('Error updating doctor availability:', error);
      throw error;
    }
  }

  async getDoctorAvailability(
    doctorId: number,
    date: Date
  ): Promise<typeof doctorAvailability.$inferSelect | undefined> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const [availability] = await db
        .select()
        .from(doctorAvailability)
        .where(
          and(
            eq(doctorAvailability.doctorId, doctorId),
            eq(doctorAvailability.date, dayStart)
          )
        );

      return availability;
    } catch (error) {
      console.error('Error getting doctor availability:', error);
      throw error;
    }
  }

  async getPatientAppointments(patientId: number): Promise<(Appointment & { doctor: User })[]> {
    try {
      console.log('Getting appointments for patient:', patientId);

      // Get patient's appointments
      const appointmentsResult = await db
        .select()
        .from(appointments)
        .where(eq(appointments.patientId, patientId));

      console.log('Patient appointments:', JSON.stringify(appointmentsResult, null, 2));

      if (!appointmentsResult.length) {
        return [];
      }

      // Get all unique doctor IDs
      const doctorIds = Array.from(new Set(appointmentsResult.map(apt => apt.doctorId)));
      const doctors = await db
        .select()
        .from(users)
        .where(inArray(users.id, doctorIds));

      const doctorsMap = new Map(doctors.map(d => [d.id, d]));

      // Combine the data
      return appointmentsResult.map(appointment => ({
        ...appointment,
        doctor: doctorsMap.get(appointment.doctorId)!,
      }));
    } catch (error) {
      console.error('Error in getPatientAppointments:', error);
      throw error;
    }
  }

  async getAttenderDoctorsAppointments(attenderId: number): Promise<(AttenderDoctor & { doctor: User, appointments: (Appointment & { patient?: User })[] })[]> {
    try {
      console.log('Getting appointments for attender:', attenderId);

      // First get attender-doctor relationships
      const doctorRelations = await this.getAttenderDoctors(attenderId);
      if (!doctorRelations.length) {
        return [];
      }

      // Get appointments for each doctor
      const doctorsWithAppointments = await Promise.all(
        doctorRelations.map(async (relation) => {
          const { doctor } = relation;

          // Get appointments for this doctor
          const appointmentsForDoctor = await db
            .select()
            .from(appointments)
            .where(eq(appointments.doctorId, doctor.id));

          // Get patient data for these appointments
          const patientIds = Array.from(new Set(appointmentsForDoctor.map(apt => apt.patientId)));
          const patients = await db
            .select()
            .from(users)
            .where(inArray(users.id, patientIds));

          const patientsMap = new Map(patients.map(p => [p.id, p]));

          // Add patient data to appointments
          const appointmentsWithPatients = appointmentsForDoctor.map(apt => ({
            ...apt,
            patient: patientsMap.get(apt.patientId),
          }));

          return {
            ...relation,
            doctor,
            appointments: appointmentsWithPatients,
          };
        })
      );

      return doctorsWithAppointments;
    } catch (error) {
      console.error('Error in getAttenderDoctorsAppointments:', error);
      throw error;
    }
  }

  async getCurrentTokenProgress(
    doctorId: number, 
    clinicId: number, 
    date: Date,
    retryCount = 3
  ): Promise<{ currentToken: number; status: 'start' | 'completed' | 'scheduled' | 'hold' | 'pause' | 'cancel' | 'not_started' | 'no_appointments'; appointment?: Appointment }> {
    try {
      console.log('Getting token progress for:', { doctorId, clinicId, date });

      // Round date to start of day for consistency
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Get all appointments for the doctor at the specific clinic on this date
      const todayAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            eq(appointments.clinicId, clinicId),
            sql`${appointments.date}::date = ${dayStart}::date`
          )
        )
        .orderBy(appointments.tokenNumber);

      console.log('Found appointments:', todayAppointments);

      if (!todayAppointments || todayAppointments.length === 0) {
        return {
          currentToken: 0,
          status: 'no_appointments'
        };
      }

      // Find appointment in progress
      const inProgressAppointment = todayAppointments.find(apt => apt.status === 'in_progress');
      
      if (inProgressAppointment) {
        console.log('Found in-progress appointment:', inProgressAppointment);
        return {
          currentToken: inProgressAppointment.tokenNumber,
          status: 'start',
          appointment: inProgressAppointment
        };
      }

      // If no appointment is in progress, find the last completed appointment
      const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed');
      const lastCompleted = completedAppointments[completedAppointments.length - 1];

      console.log('Completed appointments:', { count: completedAppointments.length, lastCompleted });

      if (lastCompleted) {
        // Find the next scheduled appointment after the last completed one
        const nextAppointment = todayAppointments.find(apt => 
          apt.tokenNumber > lastCompleted.tokenNumber && 
          apt.status === 'scheduled'
        );

        return {
          currentToken: lastCompleted.tokenNumber,
          status: 'completed',
          appointment: nextAppointment
        };
      }

      // If no appointments are completed or in progress, return the first scheduled appointment
      const firstScheduled = todayAppointments.find(apt => apt.status === 'scheduled');
      return {
        currentToken: 0,
        status: 'not_started',
        appointment: firstScheduled
      };

    } catch (error) {
      console.error('Error in getCurrentTokenProgress:', error);
      
      // If we have retries left and it's a connection error, retry
      if (retryCount > 0 && (
        error instanceof Error && 
        (error.message.includes('ETIMEDOUT') || 
         error.message.includes('connection') ||
         error.message.includes('network'))
      )) {
        console.log(`Retrying getCurrentTokenProgress... (${retryCount} attempts left)`);
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getCurrentTokenProgress(doctorId, clinicId, date, retryCount - 1);
      }
      
      throw error;
    }
  }

  async createDoctor(
    user: Omit<InsertUser, "role">, 
    details: {
      consultationFee: number | string;
      consultationDuration: number;
      qualifications?: string;
      experience?: number;
      registrationNumber?: string;
      isEnabled?: boolean;
    }
  ): Promise<User & { details: DoctorDetail }> {
    // Ensure the role is set to doctor
    const doctorUser: InsertUser = {
      ...user,
      role: "doctor"
    };

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Create the user first
      const [createdUser] = await tx.insert(users).values(doctorUser).returning();
      
      // Then create the doctor details with the doctorId
      const [createdDetails] = await tx.insert(doctorDetails).values({
        doctorId: createdUser.id,
        consultationFee: typeof details.consultationFee === 'string' 
          ? details.consultationFee 
          : details.consultationFee.toString(),
        consultationDuration: details.consultationDuration,
        qualifications: details.qualifications || null,
        experience: details.experience || null,
        registrationNumber: details.registrationNumber || null,
        isEnabled: details.isEnabled ?? true
      }).returning();
      
      return {
        ...createdUser,
        details: createdDetails
      };
    });
  }

  async getDoctorDetails(doctorId: number): Promise<DoctorDetail | undefined> {
    const [details] = await db
      .select()
      .from(doctorDetails)
      .where(eq(doctorDetails.doctorId, doctorId));
    
    return details;
  }

  async updateDoctorDetails(
    doctorId: number, 
    details: Partial<{
      consultationFee: number | string;
      consultationDuration: number;
      qualifications: string;
      experience: number;
      registrationNumber: string;
    }>
  ): Promise<DoctorDetail> {
    // Convert consultationFee to string if it's a number
    const updatedDetails = { ...details };
    if (typeof updatedDetails.consultationFee === 'number') {
      updatedDetails.consultationFee = updatedDetails.consultationFee.toString();
    }

    const [updated] = await db
      .update(doctorDetails)
      .set(updatedDetails)
      .where(eq(doctorDetails.doctorId, doctorId))
      .returning();

    return updated;
  }

  async toggleDoctorStatus(doctorId: number, isEnabled: boolean): Promise<DoctorDetail> {
    const [updatedDetails] = await db
      .update(doctorDetails)
      .set({
        isEnabled,
        updatedAt: new Date()
      })
      .where(eq(doctorDetails.doctorId, doctorId))
      .returning();
    
    if (!updatedDetails) {
      throw new Error(`Doctor details not found for doctor ID: ${doctorId}`);
    }
    
    return updatedDetails;
  }

  // Doctor schedules methods
  async createDoctorSchedule(schedule: InsertDoctorSchedule): Promise<DoctorSchedule> {
    const [result] = await db.insert(doctorSchedules).values(schedule).returning();
    return result;
  }

  async getDoctorSchedules(doctorId: number): Promise<DoctorSchedule[]> {
    return db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, doctorId))
      .orderBy(doctorSchedules.dayOfWeek, doctorSchedules.startTime);
  }

  async getDoctorSchedulesByClinic(clinicId: number): Promise<(DoctorSchedule & { doctor: User })[]> {
    return db
      .select({
        ...doctorSchedules,
        doctor: users,
      })
      .from(doctorSchedules)
      .innerJoin(users, eq(doctorSchedules.doctorId, users.id))
      .where(eq(doctorSchedules.clinicId, clinicId))
      .orderBy(doctorSchedules.dayOfWeek, doctorSchedules.startTime);
  }

  async getDoctorSchedulesByDay(day: number): Promise<(DoctorSchedule & { doctor: User, clinic: Clinic })[]> {
    const results = await db
      .select()
      .from(doctorSchedules)
      .innerJoin(users, eq(doctorSchedules.doctorId, users.id))
      .innerJoin(clinics, eq(doctorSchedules.clinicId, clinics.id))
      .where(eq(doctorSchedules.dayOfWeek, day))
      .orderBy(doctorSchedules.startTime);

    return results.map(row => ({
      ...row.doctor_schedules,
      doctor: row.users,
      clinic: row.clinics
    }));
  }

  async updateDoctorSchedule(id: number, schedule: Partial<InsertDoctorSchedule>): Promise<DoctorSchedule> {
    const [result] = await db
      .update(doctorSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(doctorSchedules.id, id))
      .returning();
    return result;
  }

  async deleteDoctorSchedule(id: number): Promise<void> {
    await db.delete(doctorSchedules).where(eq(doctorSchedules.id, id));
  }

  async getAvailableDoctors(clinicId: number, day: number, time: string): Promise<User[]> {
    const results = await db
      .select()
      .from(doctorSchedules)
      .innerJoin(users, eq(doctorSchedules.doctorId, users.id))
      .where(
        and(
          eq(doctorSchedules.clinicId, clinicId),
          eq(doctorSchedules.dayOfWeek, day),
          lte(doctorSchedules.startTime, time),
          gte(doctorSchedules.endTime, time),
          eq(doctorSchedules.isActive, true)
        )
      );

    return results.map(row => row.users);
  }

  async getDoctorAvailableTimeSlots(doctorId: number, date: Date): Promise<{ 
    schedules: (DoctorSchedule & { clinic: Clinic, currentTokenCount?: number })[], 
    availableSlots: { 
      startTime: string, 
      endTime: string, 
      clinicId: number,
      clinicName: string
    }[] 
  }> {
    // Get the day of week (0-6) for the given date
    const dayOfWeek = date.getDay();
    
    // Get all schedules for the doctor on this day of week
    const results = await db
      .select()
      .from(doctorSchedules)
      .innerJoin(clinics, eq(doctorSchedules.clinicId, clinics.id))
      .where(
        and(
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.dayOfWeek, dayOfWeek),
          eq(doctorSchedules.isActive, true)
        )
      )
      .orderBy(doctorSchedules.startTime);
    
    // Transform the results
    const schedules = results.map(row => ({
      ...row.doctor_schedules,
      clinic: row.clinics
    }));
    
    // Get existing appointments for this doctor on this date
    const appointmentsForDate = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          sql`DATE(${appointments.date}) = DATE(${date.toISOString()})`
        )
      );
    
    // Extract booked time slots from the appointments
    const bookedTimes = new Set(
      appointmentsForDate.map(appt => {
        const apptTime = new Date(appt.date);
        return `${String(apptTime.getHours()).padStart(2, '0')}:${String(apptTime.getMinutes()).padStart(2, '0')}`;
      })
    );

    // Create a map of clinic to appointment count
    const clinicAppointmentCount = new Map<number, number>();
    appointmentsForDate.forEach(appt => {
      if (appt.clinicId) {
        const count = clinicAppointmentCount.get(appt.clinicId) || 0;
        clinicAppointmentCount.set(appt.clinicId, count + 1);
      }
    });
    
    // Add the current token count to each schedule
    const schedulesWithTokenCount = schedules.map(schedule => ({
      ...schedule,
      currentTokenCount: clinicAppointmentCount.get(schedule.clinicId) || 0
    }));
    
    // Generate available time slots from schedules
    const availableSlots = [];
    
    for (const schedule of schedules) {
      // Parse start and end time
      const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
      
      // Generate 30-minute slots
      let slotTime = new Date(date);
      slotTime.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      while (slotTime < endTime) {
        const timeString = `${String(slotTime.getHours()).padStart(2, '0')}:${String(slotTime.getMinutes()).padStart(2, '0')}`;
        
        // Only add if the slot is not already booked
        if (!bookedTimes.has(timeString)) {
          availableSlots.push({
            startTime: timeString,
            endTime: `${String(slotTime.getHours()).padStart(2, '0')}:${String(slotTime.getMinutes() + 30).padStart(2, '0')}`,
            clinicId: schedule.clinicId,
            clinicName: schedule.clinic.name
          });
        }
        
        // Advance by 30 minutes
        slotTime.setMinutes(slotTime.getMinutes() + 30);
      }
    }
    
    return { schedules: schedulesWithTokenCount, availableSlots };
  }

  async getAppointmentCountForDoctor(
    doctorId: number,
    clinicId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const [result] = await db
        .select({
          count: count(),
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            eq(appointments.clinicId, clinicId),
            sql`date >= ${startDate} AND date < ${endDate}`
          )
        );
      
      return result?.count || 0;
    } catch (error) {
      console.error('Error counting appointments:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();