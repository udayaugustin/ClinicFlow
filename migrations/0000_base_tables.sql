-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clinics table
CREATE TABLE IF NOT EXISTS clinics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Create doctor_schedules table
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES users(id),
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  day_of_week INTEGER NOT NULL, -- 0-6 for Sunday-Saturday
  start_time VARCHAR(5) NOT NULL, -- Format: "HH:MM" in 24-hour format
  end_time VARCHAR(5) NOT NULL, -- Format: "HH:MM" in 24-hour format
  max_tokens INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_valid_times CHECK (start_time < end_time),
  CONSTRAINT unique_doctor_schedule UNIQUE (doctor_id, clinic_id, day_of_week, start_time, end_time)
);

-- Create doctor_daily_presence table
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

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES users(id),
  clinic_id INTEGER REFERENCES clinics(id),
  schedule_id INTEGER REFERENCES doctor_schedules(id),
  appointment_date DATE NOT NULL,
  token_number INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  status_notes TEXT,
  guest_name VARCHAR(255),
  guest_phone VARCHAR(20),
  guest_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attender_doctors table
CREATE TABLE IF NOT EXISTS attender_doctors (
  id SERIAL PRIMARY KEY,
  attender_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES users(id),
  clinic_id INTEGER REFERENCES clinics(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'next_in_line', 'status_change', 'doctor_arrival', etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_clinic_id ON doctor_schedules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day_of_week ON doctor_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at); 