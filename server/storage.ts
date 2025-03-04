import { InsertUser, User, Clinic, Appointment } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDoctors(): Promise<User[]>;
  getDoctorsBySpecialty(specialty: string): Promise<User[]>;
  getClinics(): Promise<Clinic[]>;
  getAppointments(userId: number): Promise<Appointment[]>;
  createAppointment(appointment: Omit<Appointment, "id">): Promise<Appointment>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clinics: Map<number, Clinic>;
  private appointments: Map<number, Appointment>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.clinics = new Map();
    this.appointments = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Add some sample doctors
    this.createUser({
      username: "dr.smith",
      password: "password",
      name: "Dr. Smith",
      role: "doctor",
      specialty: "Cardiologist",
      bio: "Experienced cardiologist with 15 years of practice",
      imageUrl: "https://images.unsplash.com/photo-1612276529731-4b21494e6d71",
    });

    this.createUser({
      username: "dr.jones",
      password: "password",
      name: "Dr. Jones",
      role: "doctor",
      specialty: "Pediatrician",
      bio: "Caring pediatrician focused on child wellness",
      imageUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d",
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      role: insertUser.role,
      specialty: insertUser.specialty ?? null,
      bio: insertUser.bio ?? null,
      imageUrl: insertUser.imageUrl ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async getDoctors(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === "doctor");
  }

  async getDoctorsBySpecialty(specialty: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.role === "doctor" && user.specialty === specialty
    );
  }

  async getClinics(): Promise<Clinic[]> {
    return Array.from(this.clinics.values());
  }

  async getAppointments(userId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      apt => apt.patientId === userId || apt.doctorId === userId
    );
  }

  async createAppointment(appointment: Omit<Appointment, "id">): Promise<Appointment> {
    const id = this.currentId++;
    const apt: Appointment = { ...appointment, id };
    this.appointments.set(id, apt);
    return apt;
  }
}

export const storage = new MemStorage();