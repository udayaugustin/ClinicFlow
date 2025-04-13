-- Add missing columns to clinics table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'clinics' AND column_name = 'city'
  ) THEN
    ALTER TABLE clinics ADD COLUMN city VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'clinics' AND column_name = 'state'
  ) THEN
    ALTER TABLE clinics ADD COLUMN state VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'clinics' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE clinics ADD COLUMN zip_code VARCHAR(20);
  END IF;
END $$;

-- Add unique constraint on clinic name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clinics_name_key'
  ) THEN
    ALTER TABLE clinics ADD CONSTRAINT clinics_name_key UNIQUE (name);
  END IF;
END $$;

-- Insert sample clinics if they don't exist
INSERT INTO clinics (name, address, city, state, zip_code, phone, email)
VALUES 
  ('City Medical Center', '123 Main Street', 'New York', 'NY', '10001', '212-555-0123', 'info@citymedical.com'),
  ('Community Health Clinic', '456 Oak Avenue', 'Los Angeles', 'CA', '90001', '213-555-0456', 'contact@communityhealth.com'),
  ('Metro Hospital', '789 Pine Road', 'Chicago', 'IL', '60601', '312-555-0789', 'admin@metrohospital.com')
ON CONFLICT (name) DO NOTHING; 