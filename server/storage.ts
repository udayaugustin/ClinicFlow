import {
  doctorDailyPresence,
  appointments,
  doctorSchedules,
  clinics,
  users,
  attenderDoctors,
  doctorDetails,
  doctorClinics,
  patientFavorites,
  type User,
  type AttenderDoctor,
  type InsertUser,
  type Appointment,
  type Clinic,
  type DoctorDetail,
  type DoctorSchedule,
  type InsertDoctorSchedule,
  type PatientFavorite,
  type InsertPatientFavorite,
} from "@shared/schema";
import { eq, or, and, sql, inArray, lte, gte, count, not, gt, lt } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { Pool } from '@neondatabase/serverless';
import { pool } from "./db";
import { number } from "zod";

const pgSession = connectPg(session);

const sessionStore = new pgSession({
  pool: pool as any,
  tableName: 'session',
  createTableIfMissing: true
});

export interface IStorage {
  // Attender Dashboard methods
  getAttenderClinicOverview(attenderId: number): Promise<{
    clinic: {
      id: number;
      name: string;
      address: string;
      phone: string;
      openingHours: string;
    };
    todayStats: {
      totalDoctors: number;
      activeDoctors: number;
      totalAppointments: number;
    };
  }>;
  getAttenderDoctorsSummary(attenderId: number): Promise<{
    doctors: Array<{
      id: number;
      name: string;
      specialty: string;
      isPresent: boolean;
      todayAppointments: number;
    }>;
    totalAssigned: number;
  }>;
  getAttenderSchedulesToday(attenderId: number): Promise<{
    schedules: Array<{
      id: number;
      doctorName: string;
      timeSlot: string;
      appointmentCount: number;
      status: 'token_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
    }>;
    summary: {
      totalSchedules: number;
      activeSchedules: number;
      totalAppointments: number;
    };
  }>;

  // Schedule methods
  updateSchedule(scheduleId: number, data: { isActive?: boolean; isPaused?: boolean; cancelReason?: string }): Promise<DoctorSchedule>;
  pauseSchedule(scheduleId: number, reason: string): Promise<void>;
  resumeSchedule(scheduleId: number): Promise<void>;
  getAppointment(appointmentId: number): Promise<Appointment | null>;
  getAppointmentsBySchedule(scheduleId: number): Promise<Appointment[]>;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getDoctors(): Promise<User[]>;
  getDoctorsBySpecialty(specialty: string): Promise<User[]>;
  getDoctorWithClinic(id: number): Promise<(User & { clinic?: Clinic }) | undefined>;
  getDoctorsNearLocation(lat: number, lng: number, radiusInMiles?: number): Promise<User[]>;
  getClinics(): Promise<Clinic[]>;
  getClinic(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: typeof clinics.$inferInsert): Promise<Clinic>;
  updateClinic(id: number, clinicData: Partial<typeof clinics.$inferInsert>): Promise<Clinic>;
  deleteClinic(id: number): Promise<void>;
  getAppointments(userId: number): Promise<(Appointment & { doctor: User; patient?: User })[]>;
  getDoctorAppointmentsByDate(doctorId: number, date: Date, clinicId?: number): Promise<Appointment[]>;
  createAppointment(appointment: Omit<Appointment, "id"> & { tokenNumber?: number }): Promise<Appointment>;
  getNextTokenNumber(doctorId: number, clinicId: number, scheduleId: number): Promise<number>;
  sessionStore: session.Store;
  
  // Doctor-Clinic relationships
  getDoctorClinics(doctorId: number): Promise<Clinic[]>;
  addDoctorToClinic(doctorId: number, clinicId: number): Promise<void>;
  updateDoctorClinics(doctorId: number, clinicIds: number[]): Promise<void>;

  getAttenderDoctors(attenderId: number): Promise<(AttenderDoctor & { doctor: User })[]>;
  addDoctorToAttender(attenderId: number, doctorId: number, clinicId: number): Promise<AttenderDoctor>;
  removeDoctorFromAttender(attenderId: number, doctorId: number): Promise<void>;
  getAttendersByClinic(clinicId: number): Promise<User[]>;
  getAttendersByRole(): Promise<User[]>;
  updateAppointmentStatus(
    appointmentId: number, 
    status: "scheduled" | "in_progress" | "hold" | "pause" | "cancel" | "completed", 
    statusNotes?: string
  ): Promise<Appointment>;
  updateDoctorAvailability(
    doctorId: number,
    date: Date,
    isAvailable: boolean,
    currentToken?: number
  ): Promise<typeof doctorDailyPresence.$inferSelect>;
  getDoctorAvailability(doctorId: number, date: Date): Promise<typeof doctorDailyPresence.$inferSelect | undefined>;
  getPatientAppointments(patientId: number): Promise<(Appointment & { doctor: User })[]>;
  getAttenderDoctorsAppointments(attenderId: number): Promise<(AttenderDoctor & { 
    doctor: User, 
    appointments: (Appointment & { patient?: User })[], 
    schedules: (typeof doctorSchedules.$inferSelect & { 
      appointments: (Appointment & { patient?: User })[]
    })[]
  })[]>;

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
  getDoctorSchedule(scheduleId: number): Promise<DoctorSchedule | null>;
  getDoctorSchedules(doctorId: number, date?: Date): Promise<DoctorSchedule[]>;
  getDoctorSchedulesByClinic(clinicId: number): Promise<(DoctorSchedule & { doctor: User })[]>;
  getSpecificSchedule(doctorId: number, clinicId: number, scheduleId: number, date: Date): Promise<DoctorSchedule | null>;
  getDoctorAvailableTimeSlots(doctorId: number, date: Date): Promise<{ 
    schedules: (DoctorSchedule & { clinic: Clinic, currentTokenCount?: number })[], 
    availableSlots: { 
      startTime: string, 
      endTime: string, 
      clinicId: number,
      clinicName: string
    }[] 
  }>;
  updateDoctorSchedule(id: number, schedule: Partial<InsertDoctorSchedule>): Promise<DoctorSchedule>;
  deleteDoctorSchedule(id: number): Promise<{ deletedSchedule: any, cancelledAppointments: any[] }>;
  getAvailableDoctors(clinicId: number, date: Date, time: string): Promise<User[]>;

  getAppointmentCountForDoctor(
    doctorId: number,
    clinicId: number,
    scheduleId: number
  ): Promise<number>;

  // Add these to the IStorage interface
  updateDoctorArrivalStatus(
    doctorId: number,
    clinicId: number,
    scheduleId: number | null,
    date: Date,
    hasArrived: boolean
  ): Promise<typeof doctorDailyPresence.$inferSelect>;
  
  getDoctorArrivalStatus(
    doctorId: number,
    clinicId: number,
    date: Date
  ): Promise<typeof doctorDailyPresence.$inferSelect | undefined>;

  // Add this new method to the interface
  createWalkInAppointment(appointment: {
    doctorId: number;
    clinicId: number;
    scheduleId?: number;
    date: Date;
    guestName: string;
    guestPhone?: string;
    isWalkIn: boolean;
    status?: string;
  }): Promise<Appointment>;

  // Add this new method to count walk-in patients ahead
  countWalkInPatientsAhead(
    doctorId: number,
    clinicId: number,
    currentToken: number,
    patientToken: number
  ): Promise<number>;

  updateDoctor(
    doctorId: number,
    user: Omit<InsertUser, "role" | "password" | "username" | "phone">,
    details: {
      consultationFee: number | string;
      consultationDuration: number;
      qualifications?: string;
      experience?: number;
      registrationNumber?: string;
      isEnabled?: boolean;
    }
  ): Promise<User & { details: DoctorDetail }>;

  // Patient Favorites methods
  addFavoriteSchedule(patientId: number, scheduleId: number, doctorId: number, clinicId: number): Promise<PatientFavorite>;
  removeFavoriteSchedule(patientId: number, scheduleId: number): Promise<void>;
  getPatientFavorites(patientId: number): Promise<(PatientFavorite & { 
    doctor: User; 
    schedule: DoctorSchedule; 
    clinic: Clinic 
  })[]>;
  checkIsFavorite(patientId: number, scheduleId: number): Promise<boolean>;
  getPatientsFavoritingSchedule(scheduleId: number): Promise<number[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = sessionStore;
  }

  async getAppointment(appointmentId: number): Promise<Appointment | null> {
    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  }

  async getAppointmentsBySchedule(scheduleId: number): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .where(eq(appointments.scheduleId, scheduleId));
  }

  async pauseSchedule(scheduleId: number, reason: string): Promise<void> {
    await db
      .update(doctorSchedules)
      .set({
        isPaused: true,
        pauseReason: reason,
        pausedAt: sql`CURRENT_TIMESTAMP`,
        resumedAt: null
      })
      .where(eq(doctorSchedules.id, scheduleId));
  }

  async resumeSchedule(scheduleId: number): Promise<void> {
    await db
      .update(doctorSchedules)
      .set({
        isPaused: false,
        pauseReason: null,
        resumedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(doctorSchedules.id, scheduleId));
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

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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

  async getClinic(id: number): Promise<Clinic | undefined> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }

  async createClinic(clinicData: typeof clinics.$inferInsert): Promise<Clinic> {
    // Convert camelCase to snake_case for database fields
    const formattedData = {
      name: clinicData.name,
      address: clinicData.address,
      city: clinicData.city,
      state: clinicData.state,
      zip_code: clinicData.zipCode,
      phone: clinicData.phone,
      email: clinicData.email,
      opening_hours: clinicData.openingHours,
      description: clinicData.description,
      image_url: clinicData.imageUrl
    };
    
    const [clinic] = await db.insert(clinics).values(formattedData).returning();
    return clinic;
  }

  async updateClinic(id: number, clinicData: Partial<typeof clinics.$inferInsert>): Promise<Clinic> {
    // Convert camelCase to snake_case for database fields
    const formattedData: Record<string, any> = {};
    
    if (clinicData.name !== undefined) formattedData.name = clinicData.name;
    if (clinicData.address !== undefined) formattedData.address = clinicData.address;
    if (clinicData.city !== undefined) formattedData.city = clinicData.city;
    if (clinicData.state !== undefined) formattedData.state = clinicData.state;
    if (clinicData.zipCode !== undefined) formattedData.zip_code = clinicData.zipCode;
    if (clinicData.phone !== undefined) formattedData.phone = clinicData.phone;
    if (clinicData.email !== undefined) formattedData.email = clinicData.email;
    if (clinicData.openingHours !== undefined) formattedData.opening_hours = clinicData.openingHours;
    if (clinicData.description !== undefined) formattedData.description = clinicData.description;
    if (clinicData.imageUrl !== undefined) formattedData.image_url = clinicData.imageUrl;
    
    const [updatedClinic] = await db
      .update(clinics)
      .set(formattedData)
      .where(eq(clinics.id, id))
      .returning();
    return updatedClinic;
  }

  async deleteClinic(id: number): Promise<void> {
    await db.delete(clinics).where(eq(clinics.id, id));
  }

  async getAppointments(userId: number): Promise<(Appointment & { doctor: User; patient?: User })[]> {
    try {

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

  async getDoctorAppointmentsByDate(doctorId: number, date: Date, clinicId?: number): Promise<Appointment[]> {
    try {
      // Convert date to start and end of day for proper comparison
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      let whereConditions = [
        eq(appointments.doctorId, doctorId),
        gte(appointments.date, dayStart),
        lte(appointments.date, dayEnd)
      ];

      // Add clinic filter if specified
      if (clinicId) {
        whereConditions.push(eq(appointments.clinicId, clinicId));
      }

      const result = await db
        .select()
        .from(appointments)
        .where(and(...whereConditions))
        .orderBy(appointments.tokenNumber);

      return result;
    } catch (error) {
      console.error('Error in getDoctorAppointmentsByDate:', error);
      throw error;
    }
  }

  async getNextTokenNumber(doctorId: number, clinicId: number, scheduleId: number): Promise<number> {
    const [result] = await db
      .select({
        maxToken: sql<number>`COALESCE(MAX(token_number), 0)`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.clinicId, clinicId),
          eq(appointments.scheduleId, scheduleId)
        )
      );

    return (result?.maxToken || 0) + 1;
  }

  async createAppointment(appointment: Omit<Appointment, "id"> & { tokenNumber?: number }): Promise<Appointment> {
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
    
    // Get the doctor's schedule for this day and clinic
    const [schedule] = await db
      .select()
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.doctorId, appointment.doctorId),
          eq(doctorSchedules.clinicId, clinicId),
          eq(doctorSchedules.id, appointment.scheduleId),
          eq(doctorSchedules.isActive, true)
        )
      );
      
    if (!schedule) {
      throw new Error("No active schedule found for this doctor on the selected day");
    }
    
    // Get current token count
    const [tokenCount] = await db
      .select({
        count: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, appointment.doctorId),
          eq(appointments.clinicId, clinicId),
          eq(appointments.scheduleId, schedule.id)
        )
      );
      
    // Check if token limit has been reached
    if (schedule.maxTokens !== null && tokenCount.count >= schedule.maxTokens) {
      throw new Error(`Maximum number of tokens (${schedule.maxTokens}) has been reached for this schedule`);
    }
    
    // Use provided tokenNumber or generate a new one
    const tokenNumber = appointment.tokenNumber ?? await this.getNextTokenNumber(
      appointment.doctorId,
      clinicId,
      schedule.id
    );

    const [created] = await db
      .insert(appointments)
      .values({
        ...appointment,
        clinicId,
        tokenNumber,
        status: appointment.status || "scheduled" as "scheduled" | "completed" | "cancelled" | "in_progress"
      })
      .returning();

    return created;
  }

  // async getAttenderDoctors(attenderId: number): Promise<(AttenderDoctor & { doctor: User })[]> {
  //   try {
  //     console.log('Getting doctors for attender:', attenderId);

  //     // Step 1: Get attender-doctor relationships
  //     const relations = await db
  //       .select()
  //       .from(attenderDoctors)
  //       .where(eq(attenderDoctors.attenderId, attenderId));

  //     console.log('Attender-doctor relations:', JSON.stringify(relations, null, 2));

  //     if (!relations.length) {
  //       console.log(`No doctor relations found for attender: ${attenderId}`);
  //       return [];
  //     }

  //     // Step 2: Get all doctors in one query
  //     const doctorIds = relations.map(r => r.doctorId);
  //     console.log('Doctor IDs to fetch:', doctorIds);

  //     const doctors = await db
  //       .select()
  //       .from(users)
  //       .where(
  //         and(
  //           inArray(users.id, doctorIds),
  //           eq(users.role, "doctor")
  //         )
  //       );

  //     console.log('Doctors data:', JSON.stringify(doctors, null, 2));

  //     const doctorsMap = new Map(doctors.map(d => [d.id, d]));

  //     // Step 3: Combine the data
  //     const fullRelations = relations
  //       .map(relation => {
  //         const doctor = doctorsMap.get(relation.doctorId);
  //         if (!doctor) {
  //           console.error(`Doctor not found for relation: ${relation.id}`);
  //           return null;
  //         }
  //         return {
  //           ...relation,
  //           doctor
  //         };
  //       })
  //       .filter((rel): rel is (AttenderDoctor & { doctor: User }) => rel !== null);

  //     console.log('Final attender-doctor data:', JSON.stringify(fullRelations, null, 2));
  //     return fullRelations;
  //   } catch (error) {
  //     console.error('Error in getAttenderDoctors:', error);
  //     if (error instanceof Error) {
  //       console.error('Error message:', error.message);
  //       console.error('Error stack:', error.stack);
  async getAttenderDoctors(attenderId: number): Promise<(AttenderDoctor & { doctor: User; })[]> {
    try {
      // Get all relations where this user is the attender
      const relations = await db
        .select()
        .from(attenderDoctors)
        .where(eq(attenderDoctors.attenderId, attenderId));

      if (relations.length === 0) {
        return [];
      }

      // Get all doctors from the relations
      const doctors = await db
        .select()
        .from(users)
        .where(
          and(
            inArray(users.id, relations.map(r => r.doctorId)),
            eq(users.role, "doctor")
          )
        );

      // Create a map for quick doctor lookup
      const doctorsMap = new Map(doctors.map(d => [d.id, d]));

      // Combine the relation data with the doctor data
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

      return fullRelations;
    } catch (error) {
      console.error('Error fetching attender doctors:', error);
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
    try {
      return await db
        .select()
        .from(users)
        .where(and(
          eq(users.role, "attender"),
          eq(users.clinicId, clinicId)
        ));
    } catch (error) {
      console.error('Error fetching attenders by clinic:', error);
      throw error;
    }
  }

  async getAttendersByRole(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(eq(users.role, "attender"));
    } catch (error) {
      console.error('Error fetching attenders by role:', error);
      throw error;
    }
  }

  async updateAppointmentStatus(
    appointmentId: number, 
    status: "scheduled" | "in_progress" | "hold" | "pause" | "cancel" | "completed", 
    statusNotes?: string
  ): Promise<Appointment> {
    try {
      const updateData: Partial<typeof appointments.$inferInsert> = { 
        status 
      };
      
      if (statusNotes !== undefined) {
        updateData.statusNotes = statusNotes;
      }

      // Add timestamp updates based on status
      const now = new Date();
      if (status === "in_progress") {
        updateData.actualStartTime = now;
      } else if (status === "completed") {
        updateData.actualEndTime = now;
        // If no actualStartTime exists, estimate it
        const existingAppointment = await db
          .select({ actualStartTime: appointments.actualStartTime })
          .from(appointments)
          .where(eq(appointments.id, appointmentId))
          .limit(1);
        
        if (existingAppointment.length > 0 && !existingAppointment[0].actualStartTime) {
          // Estimate start time as 15 minutes before end time
          updateData.actualStartTime = new Date(now.getTime() - 15 * 60 * 1000);
        }
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

  async updateAppointmentETA(
    appointmentId: number,
    estimatedStartTime: Date
  ): Promise<void> {
    try {
      await db
        .update(appointments)
        .set({ estimatedStartTime })
        .where(eq(appointments.id, appointmentId));
    } catch (error) {
      console.error('Error updating appointment ETA:', error);
      throw error;
    }
  }

  async updateDoctorAvailability(
    doctorId: number,
    date: Date,
    isAvailable: boolean,
    currentToken?: number
  ): Promise<typeof doctorDailyPresence.$inferSelect> {
    // Since the purpose of this table has changed, we'll update it to use the new schema
    // We'll repurpose isAvailable to hasArrived since that's what we're tracking now
    try {
      // Round date to start of day for consistency
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      // Get a default clinic for this doctor (first one found)
      const [doctorWithClinic] = await db
        .select()
        .from(users)
        .where(eq(users.id, doctorId));
        
      // Use the doctor's clinic or get the first clinic if none assigned
      let clinicId = doctorWithClinic.clinicId;
      
      if (!clinicId) {
        const [firstClinic] = await db.select().from(clinics).limit(1);
        if (firstClinic) {
          clinicId = firstClinic.id;
        } else {
          throw new Error('No clinic found for doctor availability');
        }
      }
      
      // Try to update existing record first
      const [existing] = await db
        .select()
        .from(doctorDailyPresence)
        .where(
          and(
            eq(doctorDailyPresence.doctorId, doctorId),
            eq(doctorDailyPresence.clinicId, clinicId),
            eq(doctorDailyPresence.date, dayStart)
          )
        );
      
      if (existing) {
        const [updated] = await db
          .update(doctorDailyPresence)
          .set({
            hasArrived: isAvailable, // Repurposing isAvailable to hasArrived
          })
          .where(eq(doctorDailyPresence.id, existing.id))
          .returning();
        return updated;
      }
      
      // Create new record if none exists
      const [created] = await db
        .insert(doctorDailyPresence)
        .values({
          doctorId,
          clinicId,
          date: dayStart,
          hasArrived: isAvailable, // Repurposing isAvailable to hasArrived
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
  ): Promise<typeof doctorDailyPresence.$inferSelect | undefined> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      // Get the doctor's clinic
      const [doctorWithClinic] = await db
        .select()
        .from(users)
        .where(eq(users.id, doctorId));
        
      // Use the doctor's clinic or get the first clinic if none assigned
      let clinicId = doctorWithClinic.clinicId;
      
      if (!clinicId) {
        const [firstClinic] = await db.select().from(clinics).limit(1);
        if (firstClinic) {
          clinicId = firstClinic.id;
        } else {
          return undefined; // No clinic to check availability for
        }
      }

      const [availability] = await db
        .select()
        .from(doctorDailyPresence)
        .where(
          and(
            eq(doctorDailyPresence.doctorId, doctorId),
            eq(doctorDailyPresence.clinicId, clinicId),
            eq(doctorDailyPresence.date, dayStart)
          )
        );

      return availability;
    } catch (error) {
      console.error('Error getting doctor availability:', error);
      throw error;
    }
  }

  async getDoctorClinics(doctorId: number): Promise<Clinic[]> {
    try {
      const result = await db
        .select({
          clinic: clinics
        })
        .from(doctorClinics)
        .innerJoin(clinics, eq(doctorClinics.clinicId, clinics.id))
        .where(eq(doctorClinics.doctorId, doctorId));
      
      return result.map(r => r.clinic);
    } catch (error) {
      console.error('Error fetching doctor clinics:', error);
      throw error;
    }
  }
  
  async getDoctorsByClinic(clinicId: number): Promise<User[]> {
    try {
      const result = await db
        .select({
          doctor: users
        })
        .from(doctorClinics)
        .innerJoin(users, eq(doctorClinics.doctorId, users.id))
        .where(eq(doctorClinics.clinicId, clinicId));
      
      return result.map(r => r.doctor);
    } catch (error) {
      console.error('Error fetching clinic doctors:', error);
      throw error;
    }
  }

  async addDoctorToClinic(doctorId: number, clinicId: number): Promise<void> {
    try {
      await db.insert(doctorClinics).values({
        doctorId,
        clinicId,
      });
    } catch (error) {
      console.error('Error adding doctor to clinic:', error);
      throw error;
    }
  }

  async updateDoctorClinics(doctorId: number, clinicIds: number[]): Promise<void> {
    try {
      // Delete existing relationships
      await db.delete(doctorClinics).where(eq(doctorClinics.doctorId, doctorId));
      
      // Add new relationships
      if (clinicIds.length > 0) {
        await db.insert(doctorClinics).values(
          clinicIds.map(clinicId => ({
            doctorId,
            clinicId,
          }))
        );
      }
    } catch (error) {
      console.error('Error updating doctor clinics:', error);
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

  async getAttenderDoctorsAppointments(attenderId: number): Promise<(AttenderDoctor & { 
    doctor: User, 
    appointments: (Appointment & { patient?: User })[], 
    schedules: (typeof doctorSchedules.$inferSelect & { 
      appointments: (Appointment & { patient?: User })[]
    })[]
  })[]> {
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
          const today = new Date();          

          // Get doctor's schedules for today
          const schedules = await db
            .select()
            .from(doctorSchedules)
            .where(
              and(
                eq(doctorSchedules.doctorId, doctor.id),
                eq(doctorSchedules.isActive, true),
                eq(doctorSchedules.date, today)
              )
            )
            .orderBy(doctorSchedules.startTime);

          // Get appointments for this doctor
          const appointmentsForDoctor = await db
            .select()
            .from(appointments)
            .where(
              and(
                eq(appointments.doctorId, doctor.id),
                gte(appointments.date, new Date(today.setHours(0, 0, 0, 0))),
                lte(appointments.date, new Date(today.setHours(23, 59, 59, 999)))
              )
            );

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

          // Map schedules with their appointments
          const schedulesWithAppointments = schedules.map(schedule => {
            // Find appointments that belong to this schedule by scheduleId
            const scheduleAppointments = appointmentsWithPatients.filter(apt => {
              // Use scheduleId as primary association
              if (apt.scheduleId === schedule.id) {
                return true;
              }
                         
              return false;
            });
            
            return {
              ...schedule,
              appointments: scheduleAppointments
            };
          });

          return {
            ...relation,
            doctor,
            appointments: appointmentsWithPatients, // Keep all appointments
            schedules: schedulesWithAppointments,
          };
        })
      );

      return doctorsWithAppointments;
    } catch (error) {
      console.error('Error in getAttenderDoctorsAppointments:', error);
      throw error;
    }
  }
  
  // Helper method to parse time strings like "09:00" to minutes since midnight
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async getCurrentTokenProgress(
    doctorId: number, 
    clinicId: number, 
    date: Date,
    retryCount = 3
  ): Promise<{ currentToken: number; status: 'in_progress' | 'completed' | 'token_started' | 'hold' | 'pause' | 'cancel' | 'not_started' | 'no_appointments'; appointment?: Appointment }> {
    try {
      console.log('Getting token progress for:', { doctorId, clinicId, date });

      // Round date to start of day for consistency
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Get all appointments for the doctor at the specific clinic on this date
      // Include both registered patient appointments and walk-ins
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

      // Check if doctor has arrived today
      const doctorPresence = await this.getDoctorArrivalStatus(doctorId, clinicId, date);
      const doctorHasArrived = doctorPresence?.hasArrived || false;
      
      console.log('Doctor presence status:', { doctorHasArrived, presence: doctorPresence });

      // Find appointment currently in progress
      const inProgressAppointment = todayAppointments.find(apt => apt.status === 'in_progress');
      
      if (inProgressAppointment) {
        console.log('Found in-progress appointment:', inProgressAppointment);
        return {
          currentToken: inProgressAppointment.tokenNumber,
          status: 'in_progress',
          appointment: inProgressAppointment
        };
      }

      // Find appointment in pause state
      const pausedAppointment = todayAppointments.find(apt => apt.status === 'pause');
      
      if (pausedAppointment) {
        console.log('Found paused appointment:', pausedAppointment);
        return {
          currentToken: pausedAppointment.tokenNumber,
          status: 'pause',
          appointment: pausedAppointment
        };
      }

      // Find appointment in hold state
      const heldAppointment = todayAppointments.find(apt => apt.status === 'hold');
      
      if (heldAppointment) {
        console.log('Found held appointment:', heldAppointment);
        return {
          currentToken: heldAppointment.tokenNumber,
          status: 'hold',
          appointment: heldAppointment
        };
      }

      // Find appointment in token_started state
      const tokenStartedAppointment = todayAppointments.find(apt => apt.status === 'token_started');
      
      if (tokenStartedAppointment) {
        console.log('Found token started appointment:', tokenStartedAppointment);
        return {
          currentToken: tokenStartedAppointment.tokenNumber,
          status: 'token_started',
          appointment: tokenStartedAppointment
        };
      }

      // If no appointment is currently active, find the last completed appointment
      const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed');
      const lastCompleted = completedAppointments[completedAppointments.length - 1];

      console.log('Completed appointments:', { count: completedAppointments.length, lastCompleted });

      if (lastCompleted) {
        // Find the next token_started appointment after the last completed one
        const nextAppointment = todayAppointments.find(apt => 
          apt.tokenNumber > lastCompleted.tokenNumber && 
          apt.status === 'token_started'
        );

        if (nextAppointment) {
          return {
            currentToken: nextAppointment.tokenNumber,
            status: 'token_started',
            appointment: nextAppointment
          };
        }

        return {
          currentToken: lastCompleted.tokenNumber,
          status: 'completed',
          appointment: lastCompleted
        };
      }

      // If no completed appointment, find the earliest token_started appointment
      const earliestPending = todayAppointments.find(apt => apt.status === 'token_started');
      
      if (earliestPending) {
        console.log('Found earliest pending appointment:', earliestPending);
        return {
          currentToken: earliestPending.tokenNumber,
          status: 'token_started',
          appointment: earliestPending
        };
      }

      // If no token_started appointments, find the last appointment in any other state
      const lastAppointment = todayAppointments[todayAppointments.length - 1];
      
      console.log('Last appointment in any state:', lastAppointment);
      return {
        currentToken: lastAppointment.tokenNumber,
        status: lastAppointment.status as any,
        appointment: lastAppointment
      };
    } catch (error) {
      console.error('Error in getCurrentTokenProgress:', error);
      if (retryCount > 0) {
        console.log(`Retrying... (${retryCount} attempts left)`);
        // Short delay before retry
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.getCurrentTokenProgress(doctorId, clinicId, date, retryCount - 1);
      }
      return {
        currentToken: 0,
        status: 'no_appointments'
      };
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
    return db.insert(doctorSchedules).values(schedule).returning();
  }

  async getDoctorSchedules(doctorId: number, date?: Date, visibleOnly: boolean = false): Promise<DoctorSchedule[]> {
    let conditions = [eq(doctorSchedules.doctorId, doctorId)];
    
    if (date) {
      // If date is provided, filter schedules for that specific date
      conditions.push(eq(doctorSchedules.date, date));
    }
    
    if (visibleOnly) {
      // For patient views, only show visible schedules
      conditions.push(eq(doctorSchedules.isVisible, true));
    }

    return db
      .select()
      .from(doctorSchedules)
      .where(and(...conditions))
      .orderBy(doctorSchedules.date, doctorSchedules.startTime);
  }

  async getDoctorSchedule(scheduleId: number): Promise<DoctorSchedule | null> {
    const [schedule] = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId));
    
    return schedule || null;
  }

  async getSpecificSchedule(doctorId: number, clinicId: number, scheduleId: number, date: Date): Promise<DoctorSchedule | null> {
    const dateStr = date.toISOString().split('T')[0];
    
    const [schedule] = await db
      .select()
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.id, scheduleId),
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.clinicId, clinicId),
          eq(doctorSchedules.date, dateStr),
          eq(doctorSchedules.isActive, true), // Schedule must be active to accept bookings
          eq(doctorSchedules.isVisible, true) // Schedule must be visible to patients
        )
      );

    return schedule || null;
  }

  async getDoctorSchedulesByClinic(clinicId: number): Promise<(DoctorSchedule & { doctor: User })[]> {
    const results = await db
      .select({
        schedule: doctorSchedules,
        doctor: users,
      })
      .from(doctorSchedules)
      .innerJoin(users, eq(doctorSchedules.doctorId, users.id))
      .where(eq(doctorSchedules.clinicId, clinicId))
      .orderBy(doctorSchedules.date, doctorSchedules.startTime);

    return results.map(row => ({
      ...row.schedule,
      doctor: row.doctor,
    }));
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
    // Get all schedules for the doctor on this specific date
    const results = await db
      .select({
        schedule: doctorSchedules,
        clinic: clinics,
      })
      .from(doctorSchedules)
      .innerJoin(clinics, eq(doctorSchedules.clinicId, clinics.id))
      .where(
        and(
          eq(doctorSchedules.doctorId, doctorId),
          sql`DATE(${doctorSchedules.date}) = DATE(${date.toISOString()})`,
          eq(doctorSchedules.isVisible, true) // Only show visible schedules to patients
        )
      )
      .orderBy(doctorSchedules.startTime);
  
    // Transform the results
    const schedules = results.map(row => ({
      ...row.schedule,
      clinic: row.clinic,
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
  
    // Create a map of clinic to appointment count
    const clinicAppointmentCount = new Map<number, number>();
    appointmentsForDate.forEach(appt => {
      if (appt.clinicId) {
        const count = clinicAppointmentCount.get(appt.clinicId) || 0;
        clinicAppointmentCount.set(appt.clinicId, count + 1);
      }
    });

    // Add current token count to each schedule
    schedules.forEach(schedule => {
      schedule.currentTokenCount = clinicAppointmentCount.get(schedule.clinicId) || 0;
    });

    // Calculate available slots
    const availableSlots = schedules
      .filter(schedule => (schedule.currentTokenCount || 0) < schedule.maxTokens)
      .map(schedule => ({
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        clinicId: schedule.clinic.id,
        clinicName: schedule.clinic.name
      }));

    return { schedules, availableSlots };
  }

  async updateDoctorSchedule(id: number, schedule: Partial<InsertDoctorSchedule>): Promise<DoctorSchedule> {
    const [updated] = await db
      .update(doctorSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(doctorSchedules.id, id))
      .returning();
    return updated;
  }

  async deleteDoctorSchedule(id: number): Promise<{ deletedSchedule: any, cancelledAppointments: any[] }> {
    // Use a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // First, get the schedule info
      const [schedule] = await tx
        .select()
        .from(doctorSchedules)
        .where(eq(doctorSchedules.id, id));

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Get all appointments for this schedule BEFORE deleting
      const scheduleAppointments = await tx
        .select()
        .from(appointments)
        .where(eq(appointments.scheduleId, id));

      // Get all doctor presence records for this schedule
      const presenceRecords = await tx
        .select()
        .from(doctorDailyPresence)
        .where(eq(doctorDailyPresence.scheduleId, id));

      console.log(`Found ${scheduleAppointments.length} appointments and ${presenceRecords.length} presence records for schedule ${id}`);

      // Cancel all appointments and remove schedule reference (double protection)
      if (scheduleAppointments.length > 0) {
        await tx
          .update(appointments)
          .set({ 
            status: 'cancel',
            statusNotes: 'Schedule was deleted by clinic admin',
            scheduleId: null // Explicitly set to null as backup
          })
          .where(eq(appointments.scheduleId, id));

        console.log(`Cancelled ${scheduleAppointments.length} appointments and removed schedule references`);
      }

      // Remove schedule reference from doctor presence records (double protection)
      if (presenceRecords.length > 0) {
        await tx
          .update(doctorDailyPresence)
          .set({ 
            scheduleId: null // Explicitly set to null as backup
          })
          .where(eq(doctorDailyPresence.scheduleId, id));

        console.log(`Removed schedule references from ${presenceRecords.length} presence records`);
      }

      // Now delete the schedule - should work since all references are removed
      await tx.delete(doctorSchedules).where(eq(doctorSchedules.id, id));
      
      console.log(`Successfully deleted schedule ${id}`);

      return {
        deletedSchedule: schedule,
        cancelledAppointments: scheduleAppointments
      };
    });
  }

  async getAvailableDoctors(clinicId: number, date: Date, time: string): Promise<User[]> {
    // First get all doctors who have schedules for this date and time
    const availableDoctors = await db
      .select({
        doctorId: doctorSchedules.doctorId,
      })
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.clinicId, clinicId),
          eq(doctorSchedules.date, date),
          eq(doctorSchedules.isActive, true),
          lte(doctorSchedules.startTime, time),
          gte(doctorSchedules.endTime, time)
        )
      );

    if (availableDoctors.length === 0) {
      return [];
    }

    // Then get the actual doctor details
    const doctorIds = availableDoctors.map(d => d.doctorId).filter((id): id is number => id !== null);
    
    return db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, doctorIds),
          eq(users.role, "doctor")
        )
      );
  }

  async getAppointmentCountForDoctor(
    doctorId: number,
    clinicId: number,
    scheduleId: number
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
            eq(appointments.scheduleId, scheduleId)
          )
        );
      
      return result?.count || 0;
    } catch (error) {
      console.error('Error counting appointments:', error);
      throw error;
    }
  }

  async updateDoctorArrivalStatus(
    doctorId: number,
    clinicId: number,
    scheduleId: number | null,
    date: Date,
    hasArrived: boolean
  ): Promise<typeof doctorDailyPresence.$inferSelect> {
    try {
      // Round date to start of day for consistency
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      // Try to update existing record first
      const [existing] = await db
        .select()
        .from(doctorDailyPresence)
        .where(
          and(
            eq(doctorDailyPresence.doctorId, doctorId),
            eq(doctorDailyPresence.clinicId, clinicId),
            eq(doctorDailyPresence.date, dayStart)
          )
        );
        
      if (existing) {
        // Always update scheduleId when specified, otherwise keep existing
        const scheduleIdToUse = scheduleId !== undefined ? scheduleId : existing.scheduleId;
        
        const [updated] = await db
          .update(doctorDailyPresence)
          .set({ 
            hasArrived,
            scheduleId: scheduleIdToUse,
            updatedAt: new Date() 
          })
          .where(eq(doctorDailyPresence.id, existing.id))
          .returning();
        return updated;
      }
      
      // Create new record if none exists
      const [created] = await db
        .insert(doctorDailyPresence)
        .values({
          doctorId,
          clinicId,
          scheduleId,
          date: dayStart,
          hasArrived,
        })
        .returning();
        
      return created;
    } catch (error) {
      console.error('Error updating doctor arrival status:', error);
      throw error;
    }
  }

  async getDoctorArrivalStatus(
    doctorId: number,
    clinicId: number,
    date: Date
  ): Promise<typeof doctorDailyPresence.$inferSelect | undefined> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      console.log(`Getting doctor arrival status for doctor ${doctorId}, clinic ${clinicId}, date ${dayStart.toISOString()}`);

      const [presence] = await db
        .select()
        .from(doctorDailyPresence)
        .where(
          and(
            eq(doctorDailyPresence.doctorId, doctorId),
            eq(doctorDailyPresence.clinicId, clinicId),
            eq(doctorDailyPresence.date, dayStart)
          )
        );

      console.log(`Found presence record:`, presence);
      return presence;
    } catch (error) {
      console.error('Error getting doctor arrival status:', error);
      throw error;
    }
  }

  async createWalkInAppointment(appointment: {
    doctorId: number;
    clinicId: number;
    scheduleId?: number;
    date: Date;
    guestName: string;
    guestPhone?: string;
    isWalkIn: boolean;
    status?: string;
  }): Promise<Appointment> {
    // Get the day of week for the appointment date
    const appointmentDate = new Date(appointment.date);    
    
    // Get the doctor's schedule for this day and clinic if not provided
    let scheduleId = appointment.scheduleId;
    
    if (!scheduleId) {
      const [schedule] = await db
        .select()
        .from(doctorSchedules)
        .where(
          and(
            eq(doctorSchedules.doctorId, appointment.doctorId),
            eq(doctorSchedules.clinicId, appointment.clinicId),
            eq(doctorSchedules.isActive, true)
          )
        );
        
      if (!schedule) {
        throw new Error("No active schedule found for this doctor on the selected day");
      }
      
      scheduleId = schedule.id;
    }
    
    // Get current token count
    const [tokenCount] = await db
      .select({
        count: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, appointment.doctorId),
          eq(appointments.clinicId, appointment.clinicId),
          eq(appointments.scheduleId, scheduleId)
        )
      );
      
    // Get the schedule to check token limit
    const [scheduleData] = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId));
      
    if (!scheduleData) {
      throw new Error("Schedule not found");
    }
      
    // Check if token limit has been reached
    if (scheduleData.maxTokens !== null && tokenCount.count >= scheduleData.maxTokens) {
      throw new Error(`Maximum number of tokens (${scheduleData.maxTokens}) has been reached for this schedule`);
    }
    
    // Get the next token number
    const tokenNumber = await this.getNextTokenNumber(
      appointment.doctorId,
      appointment.clinicId,
      scheduleId
    );
    
    // Create the appointment - explicitly set patientId to null for walk-ins
    const [created] = await db
      .insert(appointments)
      .values({
        doctorId: appointment.doctorId,
        clinicId: appointment.clinicId,
        scheduleId,
        patientId: null, // Explicitly set to null for walk-ins
        date: appointment.date,
        tokenNumber,
        guestName: appointment.guestName,
        guestPhone: appointment.guestPhone || null,
        isWalkIn: true,
        status: appointment.status || "scheduled"
      })
      .returning();
    
    return created;
  }

  async countWalkInPatientsAhead(
    doctorId: number,
    clinicId: number,
    currentToken: number,
    patientToken: number
  ): Promise<number> {
    // Get the current date (start and end of day)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Find walk-in appointments with token numbers between currentToken and patientToken
    const result = await db
      .select({
        count: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.clinicId, clinicId),
          eq(appointments.isWalkIn, true),
          gt(appointments.tokenNumber, currentToken),
          lt(appointments.tokenNumber, patientToken),
          gte(appointments.date, startOfDay),
          lte(appointments.date, endOfDay),
          // Only count active appointments (not cancelled)
          not(eq(appointments.status, "cancel"))
        )
      );
    
    return result[0]?.count || 0;
  }

  async updateDoctor(
    doctorId: number,
    user: Omit<InsertUser, "role" | "password" | "username" | "phone">,
    details: {
      consultationFee: number | string;
      consultationDuration: number;
      qualifications?: string;
      experience?: number;
      registrationNumber?: string;
      isEnabled?: boolean;
    }
  ): Promise<User & { details: DoctorDetail }> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Update the user first
      const [updatedUser] = await tx
        .update(users)
        .set(user)
        .where(eq(users.id, doctorId))
        .returning();
      
      // Then update the doctor details
      const [updatedDetails] = await tx
        .update(doctorDetails)
        .set({
          consultationFee: typeof details.consultationFee === 'string' 
            ? details.consultationFee 
            : details.consultationFee.toString(),
          consultationDuration: details.consultationDuration,
          qualifications: details.qualifications || null,
          experience: details.experience || null,
          registrationNumber: details.registrationNumber || null,
          isEnabled: details.isEnabled ?? true
        })
        .where(eq(doctorDetails.doctorId, doctorId))
        .returning();
      
      return {
        ...updatedUser,
        details: updatedDetails
      };
    });
  }

  // Patient Favorites methods implementation
  async addFavoriteSchedule(patientId: number, scheduleId: number, doctorId: number, clinicId: number): Promise<PatientFavorite> {
    try {
      const [favorite] = await db
        .insert(patientFavorites)
        .values({
          patientId,
          scheduleId,
          doctorId,
          clinicId,
        })
        .returning();
      
      return favorite;
    } catch (error) {
      // Handle unique constraint violation (patient already favorited this schedule)
      if (error instanceof Error && error.message.includes('unique')) {
        throw new Error('Schedule is already in favorites');
      }
      console.error('Error adding favorite schedule:', error);
      throw error;
    }
  }

  async removeFavoriteSchedule(patientId: number, scheduleId: number): Promise<void> {
    try {
      await db
        .delete(patientFavorites)
        .where(
          and(
            eq(patientFavorites.patientId, patientId),
            eq(patientFavorites.scheduleId, scheduleId)
          )
        );
    } catch (error) {
      console.error('Error removing favorite schedule:', error);
      throw error;
    }
  }

  async getPatientFavorites(patientId: number): Promise<(PatientFavorite & { 
    doctor: User; 
    schedule: DoctorSchedule; 
    clinic: Clinic 
  })[]> {
    try {
      const favorites = await db
        .select({
          id: patientFavorites.id,
          patientId: patientFavorites.patientId,
          doctorId: patientFavorites.doctorId,
          scheduleId: patientFavorites.scheduleId,
          clinicId: patientFavorites.clinicId,
          createdAt: patientFavorites.createdAt,
          doctor: users,
          schedule: doctorSchedules,
          clinic: clinics,
        })
        .from(patientFavorites)
        .innerJoin(users, eq(patientFavorites.doctorId, users.id))
        .innerJoin(doctorSchedules, eq(patientFavorites.scheduleId, doctorSchedules.id))
        .innerJoin(clinics, eq(patientFavorites.clinicId, clinics.id))
        .where(eq(patientFavorites.patientId, patientId))
        .orderBy(patientFavorites.createdAt);

      return favorites;
    } catch (error) {
      console.error('Error getting patient favorites:', error);
      throw error;
    }
  }

  async checkIsFavorite(patientId: number, scheduleId: number): Promise<boolean> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(patientFavorites)
        .where(
          and(
            eq(patientFavorites.patientId, patientId),
            eq(patientFavorites.scheduleId, scheduleId)
          )
        );

      return result.count > 0;
    } catch (error) {
      console.error('Error checking if favorite:', error);
      throw error;
    }
  }

  async getPatientsFavoritingSchedule(scheduleId: number): Promise<number[]> {
    try {
      const results = await db
        .select({ patientId: patientFavorites.patientId })
        .from(patientFavorites)
        .where(eq(patientFavorites.scheduleId, scheduleId));

      return results.map(result => result.patientId);
    } catch (error) {
      console.error('Error getting patients favoriting schedule:', error);
      throw error;
    }
  }

  async getAttenderClinicOverview(attenderId: number) {
    try {
      // Get the current date (start and end of day)
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Get the attender's assigned doctors and their clinic
      const [attenderClinic] = await db
        .select({
          clinicId: attenderDoctors.clinicId,
        })
        .from(attenderDoctors)
        .where(eq(attenderDoctors.attenderId, attenderId));

      if (!attenderClinic) {
        console.log('No clinic found for attender:', attenderId);
        return {
          clinic: {
            id: 0,
            name: 'Not Assigned',
            address: '',
            phone: '',
            openingHours: ''
          },
          todayStats: {
            totalDoctors: 0,
            activeDoctors: 0,
            totalAppointments: 0
          }
        };
      }

      const clinicId = attenderClinic.clinicId;

      // Get clinic details
      const clinicResult = await db
        .select({
          id: clinics.id,
          name: clinics.name,
          address: clinics.address,
          phone: clinics.phone,
          openingHours: clinics.openingHours,
        })
        .from(clinics)
        .where(eq(clinics.id, clinicId));

      if (!clinicResult || clinicResult.length === 0) {
        console.log('Clinic not found:', clinicId);
        return {
          clinic: {
            id: 0,
            name: 'Not Found',
            address: '',
            phone: '',
            openingHours: ''
          },
          todayStats: {
            totalDoctors: 0,
            activeDoctors: 0,
            totalAppointments: 0
          }
        };
      }

      const clinic = clinicResult[0];

      // Get total doctors assigned to this attender
      const [{ totalDoctors }] = await db
        .select({
          totalDoctors: count(),
        })
        .from(attenderDoctors)
        .where(eq(attenderDoctors.attenderId, attenderId));

      // Get active doctors count (present today)
      const [{ activeDoctors }] = await db
        .select({
          activeDoctors: count(),
        })
        .from(doctorDailyPresence)
        .where(
          and(
            eq(doctorDailyPresence.clinicId, clinicId),
            gte(doctorDailyPresence.date, startOfDay),
            lte(doctorDailyPresence.date, endOfDay),
            eq(doctorDailyPresence.hasArrived, true)
          )
        );

      // Get total appointments for today
      const [{ totalAppointments }] = await db
        .select({
          totalAppointments: count(),
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            gte(appointments.date, startOfDay),
            lte(appointments.date, endOfDay)
          )
        );

      return {
        clinic,
        todayStats: {
          totalDoctors,
          activeDoctors,
          totalAppointments,
        },
      };
    } catch (error) {
      console.error('Error in getAttenderClinicOverview:', error);
      throw error;
    }
  }

  async getAttenderDoctorsSummary(attenderId: number) {
    try {
      console.log('Getting doctors summary for attender:', attenderId);
      
      // Get the current date (start and end of day)
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all doctors assigned to this attender with their daily presence status
      const doctorsResult = await db
        .select({
          id: users.id,
          name: users.name,
          specialty: users.specialty,
          hasArrived: sql<boolean>`COALESCE(${doctorDailyPresence.hasArrived}, false)`,
        })
        .from(attenderDoctors)
        .innerJoin(users, eq(users.id, attenderDoctors.doctorId))
        .leftJoin(
          doctorDailyPresence,
          and(
            eq(doctorDailyPresence.doctorId, users.id),
            eq(doctorDailyPresence.clinicId, attenderDoctors.clinicId),
            sql`DATE(${doctorDailyPresence.date}) = CURRENT_DATE`
          )
        )
        .where(eq(attenderDoctors.attenderId, attenderId));

      console.log('Doctors result:', doctorsResult);

      // Get appointment counts for each doctor
      const doctorsWithAppointments = await Promise.all(
        doctorsResult.map(async (doctor) => {
          const [result] = await db
            .select({
              todayAppointments: sql<number>`COUNT(appointments.id)::integer`
            })
            .from(appointments)
            .where(
              and(
                eq(appointments.doctorId, doctor.id),
                sql`DATE(appointments.date) = CURRENT_DATE`
              )
            );

          return {
            ...doctor,
            todayAppointments: Number(result?.todayAppointments) || 0
          };
        })
      );

      console.log('Doctors with appointments:', doctorsWithAppointments);

      return {
        doctors: doctorsWithAppointments,
        totalAssigned: doctorsWithAppointments.length,
      };
    } catch (error) {
      console.error('Error in getAttenderDoctorsSummary:', error);
      throw error;
    }
  }

  async getAttenderSchedulesToday(attenderId: number) {
    try {
      console.log('Getting schedules for attender:', attenderId);
  
      // Step 1: Get clinic
      const [attenderClinic] = await db
        .select({
          clinicId: attenderDoctors.clinicId,
        })
        .from(attenderDoctors)
        .where(eq(attenderDoctors.attenderId, attenderId));
  
      if (!attenderClinic) {
        console.log('No clinic found for attender:', attenderId);
        return {
          schedules: [],
          summary: { totalSchedules: 0, activeSchedules: 0, totalAppointments: 0 },
        };
      }
  
      console.log('Found attender clinic:', attenderClinic);
  
      // Step 2: Get doctors
      const clinicDoctors = await db
        .select({
          doctorId: doctorClinics.doctorId,
        })
        .from(doctorClinics)
        .where(eq(doctorClinics.clinicId, attenderClinic.clinicId));
  
      if (!clinicDoctors.length) {
        console.log('No doctors found for clinic:', attenderClinic.clinicId);
        return {
          schedules: [],
          summary: { totalSchedules: 0, activeSchedules: 0, totalAppointments: 0 },
        };
      }
  
      const doctorIds = clinicDoctors.map((d) => d.doctorId);
      console.log('Found clinic doctors:', doctorIds);
  
      // ⚠️ PREVENT empty array errors
      if (doctorIds.length === 0) {
        return {
          schedules: [],
          summary: { totalSchedules: 0, activeSchedules: 0, totalAppointments: 0 },
        };
      }
  
      // Step 3: Get today's schedules
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      console.log('Looking for schedules on date:', todayString);

      const schedulesResult = await db
  .select({
    id: doctorSchedules.id,
    doctorId: doctorSchedules.doctorId,
    doctorName: users.name,
    startTime: doctorSchedules.startTime,
    endTime: doctorSchedules.endTime,
    isPaused: doctorSchedules.isPaused,
    isActive: doctorSchedules.isActive,
    scheduleDate: doctorSchedules.date
  })
        .from(doctorSchedules)
        .innerJoin(users, eq(users.id, doctorSchedules.doctorId))
        .where(
          and(
            inArray(doctorSchedules.doctorId, doctorIds),
            eq(doctorSchedules.date, todayString)
          )
        );

      console.log('Found schedules:', schedulesResult.map(s => ({
        id: s.id,
        doctor: s.doctorName,
        date: s.scheduleDate,
        time: `${s.startTime}-${s.endTime}`,
        isActive: s.isActive
      })));

      // If no schedules found for today, return empty result
      if (schedulesResult.length === 0) {
        console.log('No schedules found for today, returning empty result');
        return {
          schedules: [],
          summary: {
            totalSchedules: 0,
            activeSchedules: 0,
            totalAppointments: 0,
          },
        };
      }

  
  
      // Step 4: Add appointment counts
      const schedulesWithAppointments = await Promise.all(
        schedulesResult.map(async (schedule) => {
          try {
            const [result] = await db
              .select({
                count: sql<number>`COUNT(appointments.id)::integer`,
              })
              .from(appointments)
              .where(
                and(
                  eq(appointments.scheduleId, schedule.id),
                  sql`DATE(${appointments.date}) = ${todayString}`
                )
              );
  
            const timeSlot = `${schedule.startTime.slice(0, 5)} - ${schedule.endTime.slice(0, 5)}`;
            
            // Get current time in HH:MM format for proper comparison
            const now = new Date();
            const currentTimeHours = now.getHours().toString().padStart(2, '0');
            const currentTimeMinutes = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentTimeHours}:${currentTimeMinutes}`;
            
            console.log(`Schedule ${schedule.id}: currentTime=${currentTime}, scheduleEndTime=${schedule.endTime}`);
            
            // Check if doctor has arrived for this schedule today
            const doctorPresence = await this.getDoctorArrivalStatus(
              schedule.doctorId,
              attenderClinic.clinicId,
              new Date()
            );
            const doctorHasArrived = doctorPresence?.hasArrived || false;
            
            console.log(`Schedule ${schedule.id} (Dr. ${schedule.doctorName}): 
              - Presence record: ${JSON.stringify(doctorPresence)}
              - Has arrived: ${doctorHasArrived}
              - Date checked: ${new Date().toISOString().split('T')[0]}`);

            console.log(`Schedule ${schedule.id}: doctorHasArrived=${doctorHasArrived}`);

            // Determine schedule status based on doctor presence and schedule state
            let scheduleStatus: 'token_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
            
            if (!schedule.isActive) {
              scheduleStatus = 'cancelled';
            } else if (schedule.isPaused) {
              scheduleStatus = 'paused';
            } else if (currentTime > schedule.endTime) {
              // Only mark as completed if the entire schedule time period has ended
              // e.g., if schedule is 9 AM - 5 PM, only mark completed after 5 PM
              // Individual appointments within this time should have their own status
              scheduleStatus = 'completed';
            } else {
              // Within schedule time period - status depends on doctor presence
              if (doctorHasArrived) {
                scheduleStatus = 'in_progress';
              } else {
                scheduleStatus = 'token_started'; // Default when doctor hasn't arrived yet
              }
            }
            
            console.log(`Schedule ${schedule.id}: final status=${scheduleStatus}`);

            return {
              id: schedule.id,
              doctorName: schedule.doctorName,
              timeSlot,
              appointmentCount: Number(result?.count) || 0,
              status: scheduleStatus,
            };
          } catch (error) {
            console.error('Error getting appointments for schedule:', schedule.id, error);
            throw error;
          }
        })
      );
  
  
      // Step 5: Summary stats
      const activeSchedules = schedulesWithAppointments.filter(
        (s) => s.status === 'in_progress' || s.status === 'token_started'
      ).length;
  
      const totalAppointments = schedulesWithAppointments.reduce(
        (sum, s) => sum + s.appointmentCount,
        0
      );
  
      return {
        schedules: schedulesWithAppointments,
        summary: {
          totalSchedules: schedulesWithAppointments.length,
          activeSchedules,
          totalAppointments,
        },
      };
    } catch (error) {
      console.error('Error in getAttenderSchedulesToday:', error);
      throw error;
    }
  }


  async updateSchedule(scheduleId: number, data: { isActive?: boolean; isPaused?: boolean; cancelReason?: string }): Promise<DoctorSchedule> {
    try {
      const [updatedSchedule] = await db
        .update(doctorSchedules)
        .set(data)
        .where(eq(doctorSchedules.id, scheduleId))
        .returning();

      if (!updatedSchedule) {
        throw new Error('Schedule not found');
      }

      return updatedSchedule;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();