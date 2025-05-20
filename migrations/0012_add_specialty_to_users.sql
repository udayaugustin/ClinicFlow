-- Add specialty column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(100);

-- Update existing doctor users with a default specialty if they don't have one
UPDATE users 
SET specialty = 'General Practitioner' 
WHERE role = 'doctor' AND specialty IS NULL; 