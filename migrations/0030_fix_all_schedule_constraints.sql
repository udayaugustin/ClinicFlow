-- Check and fix ALL foreign key constraints related to doctor_schedules
-- There seem to be multiple constraints with different names

BEGIN;

-- Drop ALL possible constraint variations for appointments table
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_schedule_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_schedule_id_doctor_schedules_id_fk;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_schedule;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_schedule_id_fk;

-- Drop ALL possible constraint variations for doctor_daily_presence table  
ALTER TABLE doctor_daily_presence DROP CONSTRAINT IF EXISTS doctor_daily_presence_schedule_id_fkey;
ALTER TABLE doctor_daily_presence DROP CONSTRAINT IF EXISTS doctor_daily_presence_schedule_id_doctor_schedules_id_fk;
ALTER TABLE doctor_daily_presence DROP CONSTRAINT IF EXISTS fk_doctor_daily_presence_schedule;
ALTER TABLE doctor_daily_presence DROP CONSTRAINT IF EXISTS doctor_daily_presence_schedule_id_fk;

-- Recreate the constraints with CASCADE DELETE
ALTER TABLE appointments 
ADD CONSTRAINT appointments_schedule_id_fkey 
FOREIGN KEY (schedule_id) 
REFERENCES doctor_schedules(id) 
ON DELETE SET NULL;

ALTER TABLE doctor_daily_presence 
ADD CONSTRAINT doctor_daily_presence_schedule_id_fkey 
FOREIGN KEY (schedule_id) 
REFERENCES doctor_schedules(id) 
ON DELETE SET NULL;

COMMIT;
