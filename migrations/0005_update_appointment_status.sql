-- Create a type for appointment status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM (
      'scheduled',
      'start',
      'hold',
      'pause',
      'cancel',
      'completed'
    );
  END IF;
END $$;

-- If the type exists, add new values if needed
DO $$
BEGIN
  -- Add 'start' to the enum if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
    AND enumlabel = 'start'
  ) THEN
    ALTER TYPE appointment_status ADD VALUE 'start';
  END IF;

  -- Add 'hold' to the enum if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
    AND enumlabel = 'hold'
  ) THEN
    ALTER TYPE appointment_status ADD VALUE 'hold';
  END IF;

  -- Add 'pause' to the enum if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
    AND enumlabel = 'pause'
  ) THEN
    ALTER TYPE appointment_status ADD VALUE 'pause';
  END IF;

  -- Add 'cancel' to the enum if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
    AND enumlabel = 'cancel'
  ) THEN
    ALTER TYPE appointment_status ADD VALUE 'cancel';
  END IF;
END $$;

-- Update any 'in_progress' status to 'start' in the appointments table
UPDATE appointments SET status = 'start' WHERE status = 'in_progress';

-- Update any 'cancelled' status to 'cancel' in the appointments table
UPDATE appointments SET status = 'cancel' WHERE status = 'cancelled'; 