-- Make email optional in users table
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add phone field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Update the schema to reflect these changes
COMMENT ON COLUMN users.email IS 'Optional email address';
COMMENT ON COLUMN users.phone IS 'Required phone number'; 