-- Fix cancel_reason column name mismatch
BEGIN;

-- Check if cancellation_reason exists and rename it to cancel_reason
DO $$ 
BEGIN
    -- Check if cancellation_reason column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'cancellation_reason'
    ) THEN
        -- Rename cancellation_reason to cancel_reason
        ALTER TABLE doctor_schedules 
        RENAME COLUMN cancellation_reason TO cancel_reason;
    END IF;

    -- Add cancel_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'cancel_reason'
    ) THEN
        ALTER TABLE doctor_schedules 
        ADD COLUMN cancel_reason TEXT;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE doctor_schedules 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;

    -- Add cancelled_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE doctor_schedules 
        ADD COLUMN cancelled_at TIMESTAMP;
    END IF;
END $$;

-- Add constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'doctor_schedules' 
        AND constraint_name = 'check_schedule_status'
    ) THEN
        ALTER TABLE doctor_schedules
        ADD CONSTRAINT check_schedule_status 
        CHECK (status IN ('active', 'cancelled'));
    END IF;
END $$;

-- Create index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'doctor_schedules' 
        AND indexname = 'idx_doctor_schedules_status'
    ) THEN
        CREATE INDEX idx_doctor_schedules_status ON doctor_schedules(status);
    END IF;
END $$;

COMMIT;