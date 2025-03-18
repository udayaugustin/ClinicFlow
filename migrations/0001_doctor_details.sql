-- Create doctor_details table
CREATE TABLE IF NOT EXISTS doctor_details (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES users(id),
  consultation_fee DECIMAL(10, 2) NOT NULL,
  consultation_duration INTEGER NOT NULL,
  qualifications TEXT,
  experience INTEGER,
  registration_number VARCHAR(100),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add created_at to users if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Update doctor_availability table structure
ALTER TABLE doctor_availability DROP COLUMN IF EXISTS date;
ALTER TABLE doctor_availability DROP COLUMN IF EXISTS current_token;

-- Add new columns to doctor_availability if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'doctor_availability' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE doctor_availability ADD COLUMN clinic_id INTEGER REFERENCES clinics(id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'doctor_availability' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE doctor_availability ADD COLUMN day_of_week INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'doctor_availability' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE doctor_availability ADD COLUMN start_time VARCHAR(10) NOT NULL DEFAULT '09:00';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'doctor_availability' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE doctor_availability ADD COLUMN end_time VARCHAR(10) NOT NULL DEFAULT '17:00';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'doctor_availability' AND column_name = 'max_tokens'
  ) THEN
    ALTER TABLE doctor_availability ADD COLUMN max_tokens INTEGER DEFAULT 20;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'doctor_availability' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE doctor_availability ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add created_at to appointments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add created_at to attender_doctors if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'attender_doctors' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE attender_doctors ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add phone and email to clinics if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'clinics' AND column_name = 'phone'
  ) THEN
    ALTER TABLE clinics ADD COLUMN phone VARCHAR(20);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'clinics' AND column_name = 'email'
  ) THEN
    ALTER TABLE clinics ADD COLUMN email VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'clinics' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE clinics ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$; 