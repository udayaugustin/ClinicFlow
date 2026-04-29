-- Add learned_consultation_time column to doctor_schedules
-- This separates the admin-configured value (average_consultation_time) from
-- the system-learned value (learned_consultation_time), so a single short
-- consultation never corrupts the admin's configured expectation.
ALTER TABLE "doctor_schedules"
  ADD COLUMN IF NOT EXISTS "learned_consultation_time" integer;

-- Reset any average_consultation_time values that were overwritten by the old
-- ETA learning code. Restore them to the schema default of 15 minutes.
-- Admins who intentionally configured a non-15 value can reset via the schedule
-- edit form; this is safer than leaving system-corrupted values in place.
UPDATE "doctor_schedules"
  SET "average_consultation_time" = 15
  WHERE "average_consultation_time" IS DISTINCT FROM 15
    AND "average_consultation_time" IS NOT NULL;
