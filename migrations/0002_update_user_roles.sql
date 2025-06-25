-- Update user roles
INSERT INTO users (name, username, email, password, role, phone)
    VALUES ('Hospital Admin', 'admin', 'admin@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'hospital_admin', '0000000000')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO users (name, username, email, password, role, phone)
    VALUES ('Clinic Attender', 'attender', 'attender@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'attender', '0000000000')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO users (name, username, email, password, role, phone)
    VALUES ('Doctor', 'doctor', 'doctor@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'doctor', '0000000000')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO users (name, username, email, password, role, phone)
    VALUES ('Patient', 'patient', 'patient@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'patient', '0000000000')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role; 