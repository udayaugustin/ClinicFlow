import { InsertUser, User, Clinic, Appointment, attenderDoctors, AttenderDoctor } from "@shared/schema";
import { users, clinics, appointments } from "@shared/schema";
import { eq, or, and, sql } from "drizzle-orm";
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
    const results = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        clinicId: appointments.clinicId,
        date: appointments.date,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status,
        doctor: {
          id: sql`doctorUser.id`,
          username: sql`doctorUser.username`,
          password: sql`doctorUser.password`,
          name: sql`doctorUser.name`,
          role: sql`doctorUser.role`,
          specialty: sql`doctorUser.specialty`,
          bio: sql`doctorUser.bio`,
          imageUrl: sql`doctorUser.imageUrl`,
          address: sql`doctorUser.address`,
          city: sql`doctorUser.city`,
          state: sql`doctorUser.state`,
          zipCode: sql`doctorUser.zipCode`,
          latitude: sql`doctorUser.latitude`,
          longitude: sql`doctorUser.longitude`,
          clinicId: sql`doctorUser.clinicId`,
        },
        patient: {
          id: sql`patientUser.id`,
          username: sql`patientUser.username`,
          password: sql`patientUser.password`,
          name: sql`patientUser.name`,
          role: sql`patientUser.role`,
          specialty: sql`patientUser.specialty`,
          bio: sql`patientUser.bio`,
          imageUrl: sql`patientUser.imageUrl`,
          address: sql`patientUser.address`,
          city: sql`patientUser.city`,
          state: sql`patientUser.state`,
          zipCode: sql`patientUser.zipCode`,
          latitude: sql`patientUser.latitude`,
          longitude: sql`patientUser.longitude`,
          clinicId: sql`patientUser.clinicId`,
        },
      })
      .from(appointments)
      .where(
        or(
          eq(appointments.patientId, userId),
          eq(appointments.doctorId, userId)
        )
      )
      .leftJoin(users.as('doctorUser'), eq(appointments.doctorId, sql`doctorUser.id`))
      .leftJoin(users.as('patientUser'), eq(appointments.patientId, sql`patientUser.id`))
      .orderBy(appointments.date);

    return results;
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
    const results = await db
      .select({
        id: attenderDoctors.id,
        attenderId: attenderDoctors.attenderId,
        doctorId: attenderDoctors.doctorId,
        clinicId: attenderDoctors.clinicId,
        doctor: {
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
        },
      })
      .from(attenderDoctors)
      .leftJoin(users, eq(attenderDoctors.doctorId, users.id))
      .where(eq(attenderDoctors.attenderId, attenderId));

    return results;
  }

  async addDoctorToAttender(attenderId: number, doctorId: number, clinicId: number): Promise<AttenderDoctor> {
    const [attender, doctor] = await Promise.all([
      this.getUser(attenderId),
      this.getUser(doctorId),
    ]);

    if (!attender || attender.role !== "attender") {
      throw new Error("Invalid attender");
    }

    if (!doctor || doctor.role !== "doctor") {
      throw new Error("Invalid doctor");
    }

    if (attender.clinicId !== clinicId || doctor.clinicId !== clinicId) {
      throw new Error("Attender and doctor must belong to the same clinic");
    }

    const [relation] = await db
      .insert(attenderDoctors)
      .values({
        attenderId,
        doctorId,
        clinicId,
      })
      .returning();

    return relation;
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
}

export const storage = new DatabaseStorage();