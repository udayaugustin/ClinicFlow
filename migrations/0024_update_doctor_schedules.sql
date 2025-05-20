-- Update doctor_schedules table to support date-specific schedules
BEGIN;

-- First, drop existing constraints and indexes
ALTER TABLE doctor_schedules DROP CONSTRAINT IF EXISTS check_valid_times;
ALTER TABLE doctor_schedules DROP CONSTRAINT IF EXISTS unique_doctor_schedule;
DROP INDEX IF EXISTS idx_doctor_schedules_day_of_week;

-- Clear existing schedule records since we're moving to a new format
DELETE FROM doctor_schedules;

-- Update any foreign key references in appointments table
UPDATE appointments a SET schedule_id = NULL;

-- Update any foreign key references in doctor_daily_presence table
UPDATE doctor_daily_presence dp SET schedule_id = NULL;

-- Drop the day_of_week column and add date column
ALTER TABLE doctor_schedules DROP COLUMN day_of_week;
ALTER TABLE doctor_schedules ADD COLUMN date DATE NOT NULL;

-- Add new constraints
ALTER TABLE doctor_schedules ADD CONSTRAINT check_valid_times 
  CHECK (start_time < end_time);
ALTER TABLE doctor_schedules ADD CONSTRAINT unique_doctor_schedule 
  UNIQUE (doctor_id, clinic_id, date, start_time, end_time);

-- Add new indexes for better performance
CREATE INDEX idx_doctor_schedules_date ON doctor_schedules(date);
CREATE INDEX idx_doctor_schedules_date_doctor ON doctor_schedules(date, doctor_id);
CREATE INDEX idx_doctor_schedules_date_clinic ON doctor_schedules(date, clinic_id);

COMMIT; 