import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  imageUrl: text("image_url"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["patient", "doctor", "attender"] }).notNull(),
  specialty: text("specialty"),
  bio: text("bio"),
  imageUrl: text("image_url"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  clinicId: integer("clinic_id").references(() => clinics.id),
});

export const doctorAvailability = pgTable("doctor_availability", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  isAvailable: boolean("is_available").notNull().default(false),
  currentToken: integer("current_token").notNull().default(0),
});

export const attenderDoctors = pgTable("attender_doctors", {
  id: serial("id").primaryKey(),
  attenderId: integer("attender_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  clinicId: integer("clinic_id").notNull(),
  date: timestamp("date").notNull(),
  tokenNumber: integer("token_number").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled", "in_progress"] }).notNull(),
});

export const consultationProgress = pgTable("consultation_progress", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  currentToken: integer("current_token").notNull().default(0),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [users.clinicId],
    references: [clinics.id],
  }),
  managedDoctors: many(attenderDoctors, { relationName: "attender" }),
  attenders: many(attenderDoctors, { relationName: "doctor" }),
}));

export const clinicsRelations = relations(clinics, ({ many }) => ({
  doctors: many(users),
  attenders: many(users),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(users, {
    fields: [appointments.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
  }),
  clinic: one(clinics, {
    fields: [appointments.clinicId],
    references: [clinics.id],
  }),
}));

export const attenderDoctorsRelations = relations(attenderDoctors, ({ one }) => ({
  attender: one(users, {
    fields: [attenderDoctors.attenderId],
    references: [users.id],
    relationName: "attender",
  }),
  doctor: one(users, {
    fields: [attenderDoctors.doctorId],
    references: [users.id],
    relationName: "doctor",
  }),
  clinic: one(clinics, {
    fields: [attenderDoctors.clinicId],
    references: [clinics.id],
  }),
}));

export const doctorAvailabilityRelations = relations(doctorAvailability, ({ one }) => ({
  doctor: one(users, {
    fields: [doctorAvailability.doctorId],
    references: [users.id],
  }),
}));

export const consultationProgressRelations = relations(consultationProgress, ({ one }) => ({
  doctor: one(users, {
    fields: [consultationProgress.doctorId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const insertClinicSchema = createInsertSchema(clinics);
export const insertAttenderDoctorSchema = createInsertSchema(attenderDoctors);
export const insertAppointmentSchema = createInsertSchema(appointments, {
  date: z.string().transform((str) => new Date(str)),
  status: z.enum(["scheduled", "completed", "cancelled", "in_progress"]).default("scheduled"),
}).omit({ tokenNumber: true });
export const insertConsultationProgressSchema = createInsertSchema(consultationProgress);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AttenderDoctor = typeof attenderDoctors.$inferSelect;
export type ConsultationProgress = typeof consultationProgress.$inferSelect;

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