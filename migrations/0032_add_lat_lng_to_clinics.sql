-- Add latitude and longitude columns to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add indexes for geospatial queries
CREATE INDEX IF NOT EXISTS idx_clinics_location ON clinics(latitude, longitude);

-- Add opening_hours and description columns if they don't exist
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS opening_hours TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS description TEXT;