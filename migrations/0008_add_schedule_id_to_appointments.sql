-- Add schedule_id column to appointments table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'schedule_id'
  ) THEN
    ALTER TABLE appointments 
    ADD COLUMN schedule_id INTEGER REFERENCES doctor_schedules(id);
  END IF;
END $$;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_schedule_id ON appointments(schedule_id);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'appointments_schedule_id_fkey'
  ) THEN
    -- If constraint doesn't exist (in case you manually ran the ALTER TABLE without constraints)
    -- This will only execute if the first part didn't add the column with the reference
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_schedule_id_fkey 
    FOREIGN KEY (schedule_id) 
    REFERENCES doctor_schedules(id);
  END IF;
END $$; 