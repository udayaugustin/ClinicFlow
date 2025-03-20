DO $$
BEGIN
    -- Add guest_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='appointments' AND column_name='guest_name') THEN
        ALTER TABLE appointments ADD COLUMN guest_name VARCHAR(255);
    END IF;

    -- Add guest_phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='appointments' AND column_name='guest_phone') THEN
        ALTER TABLE appointments ADD COLUMN guest_phone VARCHAR(20);
    END IF;

    -- Add is_walk_in column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='appointments' AND column_name='is_walk_in') THEN
        ALTER TABLE appointments ADD COLUMN is_walk_in BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$; 