-- Add hospital_admin role to users table
DO $$
BEGIN
  -- Check if any users have the role 'hospital_admin'
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE role = 'hospital_admin'
  ) THEN
    -- Create a default hospital admin user if none exists
    INSERT INTO users (name, username, password, role)
    VALUES ('Hospital Admin', 'admin', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'hospital_admin');
  END IF;
END $$; 