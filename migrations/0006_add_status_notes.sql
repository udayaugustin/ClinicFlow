-- Add status_notes column to appointments table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'status_notes'
  ) THEN
    ALTER TABLE appointments ADD COLUMN status_notes TEXT;
  END IF;
END $$; 