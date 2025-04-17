-- Rename appointment_date column to date
ALTER TABLE appointments RENAME COLUMN appointment_date TO date;

-- Change the column type to TIMESTAMP if it's not already
ALTER TABLE appointments ALTER COLUMN date TYPE TIMESTAMP USING date::TIMESTAMP; 