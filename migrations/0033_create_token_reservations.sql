CREATE TABLE IF NOT EXISTS "token_reservations" (
  "id" serial PRIMARY KEY NOT NULL,
  "schedule_id" integer NOT NULL REFERENCES "doctor_schedules"("id"),
  "token_number" integer NOT NULL,
  "reserved_by_user_id" integer NOT NULL REFERENCES "users"("id"),
  "status" varchar(20) DEFAULT 'pending',
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
