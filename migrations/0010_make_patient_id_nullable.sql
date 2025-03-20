-- Make patient_id nullable to allow walk-in appointments without a patient account
DO $$
BEGIN
    -- Alter the patient_id column to be nullable
    ALTER TABLE appointments ALTER COLUMN patient_id DROP NOT NULL;
END $$; 