-- Alternative fix: Update foreign key constraint to allow cascade delete
-- Run this migration if the null approach doesn't work

BEGIN;

-- First, drop the existing constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_schedule_id_doctor_schedules_id_fk;

-- Recreate the constraint with CASCADE DELETE option
ALTER TABLE appointments 
ADD CONSTRAINT appointments_schedule_id_doctor_schedules_id_fk 
FOREIGN KEY (schedule_id) 
REFERENCES doctor_schedules(id) 
ON DELETE SET NULL;

-- This will automatically set schedule_id to NULL when a schedule is deleted

COMMIT;
