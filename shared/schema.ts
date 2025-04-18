import { relations, sql } from "drizzle-orm";
import { boolean, decimal, integer, pgTable, serial, text, timestamp, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  specialty: varchar("specialty", { length: 255 }),
  bio: text("bio"),
  imageUrl: text("image_url"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  clinicId: integer("clinic_id").references(() => clinics.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const doctorDetails = pgTable("doctor_details", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }).notNull(),
  consultationDuration: integer("consultation_duration").notNull(), // in minutes
  qualifications: text("qualifications"),
  experience: integer("experience"), // in years
  registrationNumber: varchar("registration_number", { length: 100 }),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const doctorDailyPresence = pgTable("doctor_daily_presence", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  scheduleId: integer("schedule_id").references(() => doctorSchedules.id),
  date: timestamp("date").notNull(),
  hasArrived: boolean("has_arrived").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const attenderDoctors = pgTable("attender_doctors", {
  id: serial("id").primaryKey(),
  attenderId: integer("attender_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define appointment status values
export const appointmentStatuses = [
  "scheduled", // Initial status when appointment is booked
  "start",     // Appointment has started (was previously in_progress)
  "hold",      // Patient not arrived at right time
  "pause",     // Temporarily paused appointment
  "cancel",    // Appointment cancelled (was previously cancelled)
  "completed"  // Appointment completed
] as const;

export type AppointmentStatus = typeof appointmentStatuses[number];

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id),
  doctorId: integer("doctor_id").references(() => users.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  scheduleId: integer("schedule_id").references(() => doctorSchedules.id),
  date: timestamp("date").notNull(),
  tokenNumber: integer("token_number").notNull(),
  status: varchar("status", { length: 50 }).default("scheduled"),
  statusNotes: text("status_notes"), // For recording reasons for status changes
  // Guest patient fields for walk-in appointments
  guestName: varchar("guest_name", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 20 }),
  isWalkIn: boolean("is_walk_in").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const doctorSchedules = pgTable("doctor_schedules", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(), // Format: "HH:MM" in 24-hour format
  endTime: varchar("end_time", { length: 5 }).notNull(), // Format: "HH:MM" in 24-hour format
  isActive: boolean("is_active").default(true),
  maxTokens: integer("max_tokens").default(20),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [users.clinicId],
    references: [clinics.id],
  }),
  managedDoctors: many(attenderDoctors, { relationName: "attender" }),
  attenders: many(attenderDoctors, { relationName: "doctor" }),
  doctorDetails: one(doctorDetails, {
    fields: [users.id],
    references: [doctorDetails.doctorId],
  }),
  appointments: many(appointments),
  schedules: many(doctorSchedules),
}));

export const clinicsRelations = relations(clinics, ({ many }) => ({
  users: many(users),
  appointments: many(appointments),
  doctors: many(users),
  attenders: many(users),
  schedules: many(doctorSchedules),
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
  schedule: one(doctorSchedules, {
    fields: [appointments.scheduleId],
    references: [doctorSchedules.id],
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

export const doctorDetailsRelations = relations(doctorDetails, ({ one }) => ({
  doctor: one(users, {
    fields: [doctorDetails.doctorId],
    references: [users.id],
  }),
}));

export const doctorDailyPresenceRelations = relations(doctorDailyPresence, ({ one }) => ({
  doctor: one(users, {
    fields: [doctorDailyPresence.doctorId],
    references: [users.id],
  }),
  clinic: one(clinics, {
    fields: [doctorDailyPresence.clinicId],
    references: [clinics.id],
  }),
  schedule: one(doctorSchedules, {
    fields: [doctorDailyPresence.scheduleId],
    references: [doctorSchedules.id],
  }),
}));

export const doctorSchedulesRelations = relations(doctorSchedules, ({ one }) => ({
  doctor: one(users, {
    fields: [doctorSchedules.doctorId],
    references: [users.id],
  }),
  clinic: one(clinics, {
    fields: [doctorSchedules.clinicId],
    references: [clinics.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const insertClinicSchema = createInsertSchema(clinics);
export const insertAppointmentSchema = createInsertSchema(appointments);
export const insertDoctorAvailabilitySchema = createInsertSchema(doctorDailyPresence);
export const insertAttenderDoctorSchema = createInsertSchema(attenderDoctors);
export const insertDoctorDetailSchema = createInsertSchema(doctorDetails);
export const insertDoctorScheduleSchema = createInsertSchema(doctorSchedules, {
  date: z.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  maxTokens: z.number().min(1).default(20),
  isActive: z.boolean().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AttenderDoctor = typeof attenderDoctors.$inferSelect;
export type DoctorAvailability = typeof doctorDailyPresence.$inferSelect;
export type DoctorDetail = typeof doctorDetails.$inferSelect;
export type DoctorSchedule = typeof doctorSchedules.$inferSelect;
export type InsertDoctorSchedule = z.infer<typeof insertDoctorScheduleSchema>;

export const specialties = [
  "Cardiologist",
  "Dermatologist",
  "Endocrinologist",
  "Gastroenterologist",
  "Neurologist",
  "Obstetrician",
  "Ophthalmologist",
  "Orthopedic Surgeon",
  "Pediatrician",
  "Psychiatrist",
  "Urologist",
  "General Practitioner",
  "Dentist",
  "ENT Specialist",
  "Pulmonologist",
  "Rheumatologist",
  "Oncologist",
  "Nephrologist",
  "Gynecologist",
  "Allergist",
] as const;