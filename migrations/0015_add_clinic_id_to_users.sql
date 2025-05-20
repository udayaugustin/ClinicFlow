-- Add clinic_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id);

-- Update existing doctor users with a default clinic if they don't have one
UPDATE users 
SET clinic_id = (
    SELECT id FROM clinics 
    WHERE name = 'Default Clinic' 
    LIMIT 1
)
WHERE role = 'doctor' AND clinic_id IS NULL; 