-- Add schedule cancellation support
BEGIN;

-- Add new columns to doctor_schedules table
ALTER TABLE doctor_schedules
ADD COLUMN status VARCHAR(20) DEFAULT 'active',
ADD COLUMN cancellation_reason TEXT,
ADD COLUMN cancelled_at TIMESTAMP;

-- Add a constraint to ensure status is one of the allowed values
ALTER TABLE doctor_schedules
ADD CONSTRAINT check_schedule_status 
CHECK (status IN ('active', 'cancelled'));

-- Create an index for better performance when querying by status
CREATE INDEX idx_doctor_schedules_status ON doctor_schedules(status);

COMMIT;
