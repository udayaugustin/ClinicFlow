CREATE TABLE "admin_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"config_type" varchar(20) DEFAULT 'string' NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"is_editable" boolean DEFAULT true,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "admin_configurations_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "appointment_refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"original_amount" numeric(10, 2) NOT NULL,
	"refund_amount" numeric(10, 2) NOT NULL,
	"refund_reason" varchar(100) NOT NULL,
	"refund_type" varchar(50) NOT NULL,
	"wallet_transaction_id" integer,
	"processed_by" integer NOT NULL,
	"processed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer,
	"doctor_id" integer,
	"clinic_id" integer,
	"schedule_id" integer,
	"date" timestamp NOT NULL,
	"token_number" integer NOT NULL,
	"status" varchar(50) DEFAULT 'token_started',
	"status_notes" text,
	"guest_name" varchar(255),
	"guest_phone" varchar(20),
	"is_walk_in" boolean DEFAULT false,
	"estimated_start_time" timestamp,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"consultation_fee" numeric(10, 2) DEFAULT '0.00',
	"is_paid" boolean DEFAULT false,
	"payment_method" varchar(50) DEFAULT 'wallet',
	"wallet_transaction_id" integer,
	"is_refund_eligible" boolean DEFAULT true,
	"has_been_refunded" boolean DEFAULT false,
	"refund_amount" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "attender_doctors" (
	"id" serial PRIMARY KEY NOT NULL,
	"attender_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"clinic_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"zip_code" varchar(20),
	"opening_hours" text,
	"description" text,
	"phone" varchar(20),
	"email" varchar(255),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "doctor_clinics" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"clinic_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_daily_presence" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"schedule_id" integer,
	"date" timestamp NOT NULL,
	"has_arrived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "doctor_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"consultation_fee" numeric(10, 2) NOT NULL,
	"consultation_duration" integer NOT NULL,
	"qualifications" text,
	"experience" integer,
	"registration_number" varchar(100),
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "doctor_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"max_tokens" integer DEFAULT 20,
	"is_paused" boolean DEFAULT false,
	"pause_reason" text,
	"paused_at" timestamp,
	"resumed_at" timestamp,
	"is_active" boolean DEFAULT true,
	"is_visible" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"cancel_reason" text,
	"cancelled_at" timestamp,
	"schedule_status" varchar(20) DEFAULT 'active',
	"booking_status" varchar(20) DEFAULT 'open',
	"completed_at" timestamp,
	"booking_closed_at" timestamp,
	"average_consultation_time" integer DEFAULT 15,
	"actual_arrival_time" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"login_type" varchar(20),
	"ip_address" varchar(45),
	"user_agent" text,
	"success" boolean NOT NULL,
	"attempted_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"failure_reason" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"appointment_id" integer,
	"title" varchar(100) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"otp_code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"verification_attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "patient_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "patient_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_earned" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_spent" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"specialty" varchar(255),
	"bio" text,
	"image_url" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"latitude" varchar(50),
	"longitude" varchar(50),
	"clinic_id" integer,
	"last_otp_sent_at" timestamp,
	"phone_verified" boolean DEFAULT false,
	"must_change_password" boolean DEFAULT false,
	"mpin" varchar(255),
	"mpin_attempts" integer DEFAULT 0,
	"mpin_locked_until" timestamp,
	"last_mpin_change" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"schedule_id" integer,
	"transaction_type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"previous_balance" numeric(10, 2) NOT NULL,
	"new_balance" numeric(10, 2) NOT NULL,
	"description" text NOT NULL,
	"reference_id" varchar(100),
	"processed_by" integer,
	"status" varchar(20) DEFAULT 'completed',
	"metadata" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "admin_configurations" ADD CONSTRAINT "admin_configurations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_configurations" ADD CONSTRAINT "admin_configurations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_refunds" ADD CONSTRAINT "appointment_refunds_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_refunds" ADD CONSTRAINT "appointment_refunds_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_refunds" ADD CONSTRAINT "appointment_refunds_schedule_id_doctor_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."doctor_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_refunds" ADD CONSTRAINT "appointment_refunds_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_refunds" ADD CONSTRAINT "appointment_refunds_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_refunds" ADD CONSTRAINT "appointment_refunds_wallet_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_refunds" ADD CONSTRAINT "appointment_refunds_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_schedule_id_doctor_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."doctor_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_wallet_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attender_doctors" ADD CONSTRAINT "attender_doctors_attender_id_users_id_fk" FOREIGN KEY ("attender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attender_doctors" ADD CONSTRAINT "attender_doctors_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attender_doctors" ADD CONSTRAINT "attender_doctors_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinics" ADD CONSTRAINT "doctor_clinics_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinics" ADD CONSTRAINT "doctor_clinics_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_daily_presence" ADD CONSTRAINT "doctor_daily_presence_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_daily_presence" ADD CONSTRAINT "doctor_daily_presence_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_daily_presence" ADD CONSTRAINT "doctor_daily_presence_schedule_id_doctor_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."doctor_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_details" ADD CONSTRAINT "doctor_details_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_favorites" ADD CONSTRAINT "patient_favorites_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_favorites" ADD CONSTRAINT "patient_favorites_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_favorites" ADD CONSTRAINT "patient_favorites_schedule_id_doctor_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."doctor_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_favorites" ADD CONSTRAINT "patient_favorites_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_wallets" ADD CONSTRAINT "patient_wallets_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_patient_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."patient_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_schedule_id_doctor_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."doctor_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;