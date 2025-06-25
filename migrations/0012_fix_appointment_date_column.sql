-- Fix appointment date column (idempotent)
DO $$ 
BEGIN
    -- Check if appointment_date column exists and rename it to date
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'appointment_date'
    ) THEN
        ALTER TABLE appointments RENAME COLUMN appointment_date TO date;
    END IF;

    -- Ensure the date column is TIMESTAMP type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'date'
        AND data_type != 'timestamp without time zone'
    ) THEN
        ALTER TABLE appointments ALTER COLUMN date TYPE TIMESTAMP USING date::TIMESTAMP;
    END IF;
END $$; 