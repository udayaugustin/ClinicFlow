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