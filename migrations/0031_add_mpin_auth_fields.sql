-- Migration: Add MPIN authentication fields and login tracking
-- Date: 2025-01-12
-- Purpose: Support separate authentication portals for different user types

-- Add MPIN related fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_mpin_change TIMESTAMP;

-- Create login_attempts table for tracking all authentication attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  login_type VARCHAR(20) CHECK (login_type IN ('patient', 'staff', 'admin')),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMP DEFAULT NOW(),
  failure_reason VARCHAR(255)
);

-- Add index for mobile number lookup (optimized for patient login)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE role = 'patient';

-- Add index for login attempts queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN users.mpin IS '4-digit hashed MPIN for patient authentication';
COMMENT ON COLUMN users.mpin_attempts IS 'Number of failed MPIN attempts since last successful login';
COMMENT ON COLUMN users.mpin_locked_until IS 'Account locked until this timestamp due to failed attempts';
COMMENT ON COLUMN users.last_mpin_change IS 'Timestamp of last MPIN change for audit purposes';
COMMENT ON TABLE login_attempts IS 'Audit log for all authentication attempts across different portals';