-- Update user roles
INSERT INTO users (name, username, email, password, role)
    VALUES ('Hospital Admin', 'admin', 'admin@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'hospital_admin')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO users (name, username, email, password, role)
    VALUES ('Clinic Attender', 'attender', 'attender@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'attender')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO users (name, username, email, password, role)
    VALUES ('Doctor', 'doctor', 'doctor@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'doctor')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO users (name, username, email, password, role)
    VALUES ('Patient', 'patient', 'patient@clinicflow.com', '$2a$10$JdJMnQZRZMDSNPZmQRD1UOHRqq7HGQ9W5v.o5JRwzpRNL9xgbSgRm', 'patient')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role; 