import pg from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(scrypt);

async function hashMpin(mpin) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(mpin, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5432/ClinicFlow_7'
});

async function setTestMpin() {
  const client = await pool.connect();
  
  try {
    // Find a test patient
    const result = await client.query(
      "SELECT id, name, phone FROM users WHERE role = 'patient' LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      console.log('No patient found. Creating test patient...');
      
      // Create a test patient
      const hashedPassword = await hashMpin('password123'); // Using same hash function for password
      const createResult = await client.query(
        `INSERT INTO users (name, username, password, role, phone, email) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, name, phone`,
        ['Test Patient', 'testpatient', hashedPassword, 'patient', '9876543210', 'test@example.com']
      );
      
      const patient = createResult.rows[0];
      console.log(`✓ Created test patient: ${patient.name} (Phone: ${patient.phone})`);
      
      // Set MPIN for the new patient
      const hashedMpin = await hashMpin('1234');
      await client.query(
        "UPDATE users SET mpin = $1 WHERE id = $2",
        [hashedMpin, patient.id]
      );
      
      console.log(`✓ Set MPIN for ${patient.name}`);
      console.log('\n📱 Test Credentials:');
      console.log(`   Mobile: ${patient.phone}`);
      console.log(`   MPIN: 1234`);
    } else {
      const patient = result.rows[0];
      console.log(`Found patient: ${patient.name} (Phone: ${patient.phone})`);
      
      // Set MPIN
      const hashedMpin = await hashMpin('1234');
      await client.query(
        "UPDATE users SET mpin = $1, mpin_attempts = 0, mpin_locked_until = NULL WHERE id = $2",
        [hashedMpin, patient.id]
      );
      
      console.log(`✓ Set MPIN for ${patient.name}`);
      console.log('\n📱 Test Credentials:');
      console.log(`   Mobile: ${patient.phone}`);
      console.log(`   MPIN: 1234`);
    }
    
    // Also show attender credentials
    const attenderResult = await client.query(
      "SELECT username FROM users WHERE role = 'attender' LIMIT 1"
    );
    
    if (attenderResult.rows.length > 0) {
      console.log('\n👥 Staff Portal:');
      console.log(`   Username: ${attenderResult.rows[0].username}`);
      console.log(`   Password: password123 (default)`);
    }
    
    // Show admin credentials
    const adminResult = await client.query(
      "SELECT username FROM users WHERE role IN ('clinic_admin', 'super_admin', 'hospital_admin') LIMIT 1"
    );
    
    if (adminResult.rows.length > 0) {
      console.log('\n🛡️ Admin Portal:');
      console.log(`   Username: ${adminResult.rows[0].username}`);
      console.log(`   Password: password123 (default)`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

setTestMpin().catch(console.error);