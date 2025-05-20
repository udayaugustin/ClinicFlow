-- Add bio column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Update existing doctor users with a default bio if they don't have one
UPDATE users 
SET bio = 'Experienced healthcare professional dedicated to providing quality patient care.' 
WHERE role = 'doctor' AND bio IS NULL; 