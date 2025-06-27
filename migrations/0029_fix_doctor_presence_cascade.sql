-- Fix the doctor_daily_presence foreign key constraint too
-- This table also references doctor_schedules and needs the same CASCADE treatment

BEGIN;

-- Drop the existing constraint from doctor_daily_presence table
ALTER TABLE doctor_daily_presence DROP CONSTRAINT IF EXISTS doctor_daily_presence_schedule_id_doctor_schedules_id_fk;

-- Recreate the constraint with CASCADE DELETE option
ALTER TABLE doctor_daily_presence 
ADD CONSTRAINT doctor_daily_presence_schedule_id_doctor_schedules_id_fk 
FOREIGN KEY (schedule_id) 
REFERENCES doctor_schedules(id) 
ON DELETE SET NULL;

-- This will automatically set schedule_id to NULL in doctor_daily_presence when a schedule is deleted

COMMIT;
