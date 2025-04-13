-- Create an attender user
INSERT INTO users (
  name,
  username,
  password,
  role,
  phone,
  email
) VALUES (
  'Test Attender',
  'test.attender',
  '7c4a8d09ca3762af61e59520943dc26494f8941b.7c4a8d09ca3762af61e59520943dc26494f8941b',
  'attender',
  '1234567890',
  'test.attender@clinicflow.com'
) ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email; 