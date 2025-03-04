import { InsertUser, User, Clinic, Appointment, attenderDoctors, AttenderDoctor } from "@shared/schema";
import { users, clinics, appointments, doctorAvailability } from "@shared/schema"; // Added doctorAvailability import
import { eq, or, and, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresStore = connectPg(session);

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
  updateAppointmentStatus(appointmentId: number, status: string): Promise<Appointment>;
  updateDoctorAvailability(
    doctorId: number,
    date: Date,
    isAvailable: boolean,
    currentToken?: number
  ): Promise<typeof doctorAvailability.$inferSelect>;
  getDoctorAvailability(doctorId: number, date: Date): Promise<typeof doctorAvailability.$inferSelect | undefined>;
  getPatientAppointments(patientId: number): Promise<(Appointment & { doctor: User })[]>;
  getAttenderDoctorsAppointments(attenderId: number): Promise<(AttenderDoctor & { doctor: User, appointments: (Appointment & { patient?: User })[] })[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
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
      const doctorIds = [...new Set(appointmentsResult.map(apt => apt.doctorId))];
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
        const patientIds = [...new Set(appointmentsResult.map(apt => apt.patientId))];
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
    const tokenNumber = await this.getNextTokenNumber(
      appointment.doctorId,
      appointment.clinicId,
      appointment.date
    );

    const [created] = await db
      .insert(appointments)
      .values({
        ...appointment,
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

  async updateAppointmentStatus(appointmentId: number, status: string): Promise<Appointment> {
    try {
      const [updated] = await db
        .update(appointments)
        .set({ status })
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
      const doctorIds = [...new Set(appointmentsResult.map(apt => apt.doctorId))];
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
          const patientIds = [...new Set(appointmentsForDoctor.map(apt => apt.patientId))];
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
}

export const storage = new DatabaseStorage();