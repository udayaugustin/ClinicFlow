import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["patient", "doctor"] }).notNull(),
  specialty: text("specialty"),
  bio: text("bio"),
  imageUrl: text("image_url"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
});

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  imageUrl: text("image_url"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  clinicId: integer("clinic_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull(),
  tokenNumber: integer("token_number").notNull(),
});

export const insertUserSchema = createInsertSchema(users);

export const insertClinicSchema = createInsertSchema(clinics);
export const insertAppointmentSchema = createInsertSchema(appointments);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;

export const specialties = [
  "Dermatologist",
  "Pediatrician", 
  "Cardiologist",
  "Neurologist",
  "Orthopedist",
  "Psychiatrist",
  "Gynecologist",
  "General Physician"
] as const;