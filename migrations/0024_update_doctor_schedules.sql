-- Update doctor_schedules table to support date-specific schedules (idempotent)
BEGIN;

-- Check if the date column already exists (migration already run)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'date'
    ) THEN
        -- Migration already applied
        RAISE NOTICE 'Date column already exists, skipping migration';
    ELSE
        -- Apply the migration
        
        -- First, drop existing constraints and indexes
        ALTER TABLE doctor_schedules DROP CONSTRAINT IF EXISTS check_valid_times;
        ALTER TABLE doctor_schedules DROP CONSTRAINT IF EXISTS unique_doctor_schedule;
        DROP INDEX IF EXISTS idx_doctor_schedules_day_of_week;

        -- Update any foreign key references to NULL first
        UPDATE appointments SET schedule_id = NULL WHERE schedule_id IS NOT NULL;
        UPDATE doctor_daily_presence SET schedule_id = NULL WHERE schedule_id IS NOT NULL;

        -- Clear existing schedule records since we're moving to a new format
        DELETE FROM doctor_schedules;

        -- Drop the day_of_week column and add date column
        ALTER TABLE doctor_schedules DROP COLUMN IF EXISTS day_of_week;
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
    END IF;
END $$;

COMMIT; 