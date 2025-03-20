-- Add max_tokens column to doctor_schedules if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'doctor_schedules' AND column_name = 'max_tokens'
  ) THEN
    ALTER TABLE doctor_schedules ADD COLUMN max_tokens INTEGER DEFAULT 20;
  END IF;
END $$; 