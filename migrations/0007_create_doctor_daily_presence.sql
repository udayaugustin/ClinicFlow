-- Create the doctor_daily_presence table
CREATE TABLE IF NOT EXISTS doctor_daily_presence (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES users(id),
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  schedule_id INTEGER REFERENCES doctor_schedules(id),
  date TIMESTAMP NOT NULL,
  has_arrived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop the old table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'doctor_availability'
  ) THEN
    DROP TABLE doctor_availability;
  END IF;
END $$; 