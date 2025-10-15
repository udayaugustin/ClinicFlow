-- Seed 5 Chennai clinics with coordinates to production database
-- Run with: psql -h 148.135.136.99 -U postgres -d CLINIK-PROD -f seed-production-clinics.sql

-- Delete existing clinics if needed (optional - comment out if you want to keep them)
-- TRUNCATE TABLE clinics RESTART IDENTITY CASCADE;

-- Insert 5 Chennai clinics with coordinates
INSERT INTO clinics (name, address, city, state, zip_code, phone, email, opening_hours, latitude, longitude)
VALUES 
  (
    'Mother''s Speciality Hospital',
    '24/36 OLD TOWN SHIP, Office Rd, Secretariat Colony, Venkatapuram, Ambattur, Chennai, Tamil Nadu 600053',
    'Chennai',
    'Tamil Nadu',
    '600053',
    '+91-XXXXXXXXXX',
    'info@motherspeciality.com',
    'Mon-Sat: 9:00 AM - 9:00 PM, Sun: 9:00 AM - 5:00 PM',
    13.12106720,
    80.14977990
  ),
  (
    'Mahalakshmi Hospital',
    'No. 205, 37, Ambattur Red Hills Rd, near Rakki Theatre, Ram Nagar, Ambattur, Chennai, Tamil Nadu 600053',
    'Chennai',
    'Tamil Nadu',
    '600053',
    '+91-XXXXXXXXXX',
    'contact@mahalakshmihospital.com',
    'Open 24/7',
    13.12259650,
    80.14697120
  ),
  (
    'ESSVEE Hospital',
    'Madras Thiruvallur High Road, 506, Chennai - Thiruttani - Renigunta Hwy, Ram Nagar, Ambattur, Chennai, Tamil Nadu 600053',
    'Chennai',
    'Tamil Nadu',
    '600053',
    '+91-XXXXXXXXXX',
    'info@essvee.com',
    'Mon-Sat: 8:00 AM - 8:00 PM, Sun: Closed',
    13.12318440,
    80.14602380
  ),
  (
    'Teja Hospital',
    '471, Chennai - Tiruvallur High Rd, opposite Rakki Cinemas, Manthoppu Nagar, Ambattur, Chennai, Tamil Nadu 600053',
    'Chennai',
    'Tamil Nadu',
    '600053',
    '+91-XXXXXXXXXX',
    'admin@tejahospital.com',
    'Open 24/7',
    13.12196240,
    80.14706670
  ),
  (
    'Madhavan Eye Care',
    '465, (MTH ROAD, Chennai - Thiruttani - Renigunta Hwy, Vivek Nagar, Ram Nagar, Ambattur, Chennai, Tamil Nadu 600053',
    'Chennai',
    'Tamil Nadu',
    '600053',
    '+91-XXXXXXXXXX',
    'care@madhavaneyecare.com',
    'Mon-Sat: 9:00 AM - 7:00 PM, Sun: 10:00 AM - 2:00 PM',
    13.12176200,
    80.14775460
  )
ON CONFLICT (id) DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as total_clinics FROM clinics;
SELECT COUNT(*) as clinics_with_coords FROM clinics WHERE latitude IS NOT NULL;
