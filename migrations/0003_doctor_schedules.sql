-- Create doctor_schedules table
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES users(id),
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  day_of_week INTEGER NOT NULL, -- 0-6 for Sunday-Saturday
  start_time VARCHAR(5) NOT NULL, -- Format: "HH:MM" in 24-hour format
  end_time VARCHAR(5) NOT NULL, -- Format: "HH:MM" in 24-hour format
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_clinic_id ON doctor_schedules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day_of_week ON doctor_schedules(day_of_week);

-- Add constraint for time validation
ALTER TABLE doctor_schedules ADD CONSTRAINT check_valid_times 
CHECK (start_time < end_time);

-- Add unique constraint to prevent overlapping schedules for the same doctor and day
ALTER TABLE doctor_schedules ADD CONSTRAINT unique_doctor_schedule 
UNIQUE (doctor_id, clinic_id, day_of_week, start_time, end_time); 