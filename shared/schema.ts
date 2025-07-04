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
  openingHours: text("opening_hours"),
  description: text("description"),
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
  "token_started", // Default status when appointment is booked (doctor not arrived)
  "in_progress",   // Doctor has arrived and appointment is actively being processed
  "hold",          // Patient not arrived at right time
  "pause",         // Temporarily paused appointment (was in progress)
  "cancel",        // Appointment cancelled
  "completed"      // Appointment completed
] as const;

export type AppointmentStatus = typeof appointmentStatuses[number];

export const doctorClinics = pgTable("doctor_clinics", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id),
  doctorId: integer("doctor_id").references(() => users.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  scheduleId: integer("schedule_id").references(() => doctorSchedules.id),
  date: timestamp("date").notNull(),
  tokenNumber: integer("token_number").notNull(),
  status: varchar("status", { length: 50 }).default("token_started"),
  statusNotes: text("status_notes"), // For recording reasons for status changes
  // Guest patient fields for walk-in appointments
  guestName: varchar("guest_name", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 20 }),
  isWalkIn: boolean("is_walk_in").default(false),
  // ETA tracking fields
  estimatedStartTime: timestamp("estimated_start_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const doctorSchedules = pgTable("doctor_schedules", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(), 
  endTime: varchar("end_time", { length: 5 }).notNull(),   
  maxTokens: integer("max_tokens").default(20),
  isPaused: boolean("is_paused").default(false),
  pauseReason: text("pause_reason"),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  isActive: boolean("is_active").default(true),
  isVisible: boolean("is_visible").default(false), // Controls visibility to patients
  status: varchar("status", { length: 20 }).default("active"),
  cancelReason: text("cancel_reason"),
  cancelledAt: timestamp("cancelled_at"),
  // ETA calculation fields
  averageConsultationTime: integer("average_consultation_time").default(15), // in minutes
  actualArrivalTime: timestamp("actual_arrival_time"), // when doctor actually arrives
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const patientFavorites = pgTable("patient_favorites", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  scheduleId: integer("schedule_id").notNull().references(() => doctorSchedules.id),
  clinicId: integer("clinic_id").notNull().references(() => clinics.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  title: varchar("title", { length: 100 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
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
  clinics: many(doctorClinics),
  patientFavorites: many(patientFavorites, { relationName: "patient" }),
  notifications: many(notifications),
  doctorFavorites: many(patientFavorites, { relationName: "doctor" }),
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

export const doctorClinicsRelations = relations(doctorClinics, ({ one }) => ({
  doctor: one(users, {
    fields: [doctorClinics.doctorId],
    references: [users.id],
  }),
  clinic: one(clinics, {
    fields: [doctorClinics.clinicId],
    references: [clinics.id],
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

export const doctorSchedulesRelations = relations(doctorSchedules, ({ one, many }) => ({
  doctor: one(users, {
    fields: [doctorSchedules.doctorId],
    references: [users.id],
  }),
  clinic: one(clinics, {
    fields: [doctorSchedules.clinicId],
    references: [clinics.id],
  }),
  favorites: many(patientFavorites),
}));

export const patientFavoritesRelations = relations(patientFavorites, ({ one }) => ({
  patient: one(users, {
    fields: [patientFavorites.patientId],
    references: [users.id],
    relationName: "patient",
  }),
  doctor: one(users, {
    fields: [patientFavorites.doctorId],
    references: [users.id],
    relationName: "doctor",
  }),
  schedule: one(doctorSchedules, {
    fields: [patientFavorites.scheduleId],
    references: [doctorSchedules.id],
  }),
  clinic: one(clinics, {
    fields: [patientFavorites.clinicId],
    references: [clinics.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [notifications.appointmentId],
    references: [appointments.id],
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
  isVisible: z.boolean().default(false),
});

export const insertPatientFavoriteSchema = createInsertSchema(patientFavorites);
export const insertNotificationSchema = createInsertSchema(notifications);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AttenderDoctor = typeof attenderDoctors.$inferSelect;
export type DoctorAvailability = typeof doctorDailyPresence.$inferSelect;
export type DoctorDetail = typeof doctorDetails.$inferSelect;
export type DoctorSchedule = typeof doctorSchedules.$inferSelect;
export type InsertDoctorSchedule = z.infer<typeof insertDoctorScheduleSchema>;
export type PatientFavorite = typeof patientFavorites.$inferSelect;
export type InsertPatientFavorite = z.infer<typeof insertPatientFavoriteSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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