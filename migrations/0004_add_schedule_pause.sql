-- Add pause-related columns to doctor_schedules table (idempotent)
DO $$ 
BEGIN
    -- Add is_paused column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'is_paused'
    ) THEN
        ALTER TABLE doctor_schedules ADD COLUMN is_paused BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add pause_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'pause_reason'
    ) THEN
        ALTER TABLE doctor_schedules ADD COLUMN pause_reason TEXT;
    END IF;

    -- Add paused_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'paused_at'
    ) THEN
        ALTER TABLE doctor_schedules ADD COLUMN paused_at TIMESTAMP;
    END IF;

    -- Add resumed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctor_schedules' 
        AND column_name = 'resumed_at'
    ) THEN
        ALTER TABLE doctor_schedules ADD COLUMN resumed_at TIMESTAMP;
    END IF;
END $$;
