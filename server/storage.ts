import { InsertUser, User, Clinic, Appointment } from "@shared/schema";
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
  getAppointments(userId: number): Promise<(Appointment & { doctor: User })[]>;
  createAppointment(appointment: Omit<Appointment, "id" | "tokenNumber">): Promise<Appointment>;
  getNextTokenNumber(doctorId: number, clinicId: number, date: Date): Promise<number>;
  sessionStore: session.Store;
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

  async getAppointments(userId: number): Promise<(Appointment & { doctor: User })[]> {
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
      .from(appointments)
      .where(
        or(
          eq(appointments.patientId, userId),
          eq(appointments.doctorId, userId)
        )
      )
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .orderBy(appointments.date);

    return results;
  }

  async getNextTokenNumber(doctorId: number, clinicId: number, date: Date): Promise<number> {
    // Get the start and end of the day for the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get the highest token number for this doctor and clinic on the given date
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

    // Return the next token number (current max + 1)
    return (result?.maxToken || 0) + 1;
  }

  async createAppointment(appointment: Omit<Appointment, "id" | "tokenNumber">): Promise<Appointment> {
    // Get the next token number for this doctor and clinic
    const tokenNumber = await this.getNextTokenNumber(
      appointment.doctorId,
      appointment.clinicId,
      appointment.date
    );

    // Create the appointment with the generated token number
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
}

export const storage = new DatabaseStorage();