-- Update appointment status values to new format
-- Replace 'scheduled' with 'token_started' as the default status
UPDATE appointments SET status = 'token_started' WHERE status = 'scheduled';

-- Replace 'start' with 'in_progress' for all existing appointments
UPDATE appointments SET status = 'in_progress' WHERE status = 'start';

-- Update the default value in the appointments table
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'token_started';

-- Note: This migration converts the existing status system to the new simplified workflow:
-- - scheduled -> token_started (new default)
-- - start -> in_progress
-- - Other statuses (hold, pause, cancel, completed) remain the same
