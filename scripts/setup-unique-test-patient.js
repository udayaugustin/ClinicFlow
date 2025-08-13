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

async function setupTestPatient() {
  const client = await pool.connect();
  
  try {
    // Use a unique phone number for testing
    const testPhone = '9999999999';
    const testMpin = '1234';
    
    // Check if this phone already exists
    const existing = await client.query(
      "SELECT id, name, role FROM users WHERE phone = $1",
      [testPhone]
    );
    
    let patientId;
    let patientName;
    
    if (existing.rows.length > 0 && existing.rows[0].role === 'patient') {
      // Use existing patient
      patientId = existing.rows[0].id;
      patientName = existing.rows[0].name;
      console.log(`Found existing test patient: ${patientName}`);
    } else {
      // Create new test patient
      const hashedPassword = await hashMpin('password123');
      const result = await client.query(
        `INSERT INTO users (name, username, password, role, phone, email) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, name`,
        ['Test Patient MPIN', 'testmpin', hashedPassword, 'patient', testPhone, 'testmpin@example.com']
      );
      
      patientId = result.rows[0].id;
      patientName = result.rows[0].name;
      console.log(`Created new test patient: ${patientName}`);
    }
    
    // Set MPIN
    const hashedMpin = await hashMpin(testMpin);
    await client.query(
      "UPDATE users SET mpin = $1, mpin_attempts = 0, mpin_locked_until = NULL, last_mpin_change = NOW() WHERE id = $2",
      [hashedMpin, patientId]
    );
    
    console.log(`✓ MPIN set successfully for ${patientName}`);
    console.log('\n' + '='.repeat(50));
    console.log('📱 TEST PATIENT CREDENTIALS:');
    console.log('='.repeat(50));
    console.log(`Mobile Number: ${testPhone}`);
    console.log(`MPIN: ${testMpin}`);
    console.log('='.repeat(50));
    
    // Also find a patient with actual unique phone for real testing
    const realPatient = await client.query(
      `SELECT DISTINCT ON (phone) id, name, phone 
       FROM users 
       WHERE role = 'patient' 
       AND phone NOT IN (
         SELECT phone FROM users WHERE role != 'patient'
       )
       AND phone != $1
       LIMIT 1`,
      [testPhone]
    );
    
    if (realPatient.rows.length > 0) {
      const patient = realPatient.rows[0];
      const realMpin = '5678';
      const hashedRealMpin = await hashMpin(realMpin);
      
      await client.query(
        "UPDATE users SET mpin = $1, mpin_attempts = 0, mpin_locked_until = NULL WHERE id = $2",
        [hashedRealMpin, patient.id]
      );
      
      console.log('\n📱 ALTERNATIVE PATIENT CREDENTIALS:');
      console.log('='.repeat(50));
      console.log(`Name: ${patient.name}`);
      console.log(`Mobile Number: ${patient.phone}`);
      console.log(`MPIN: ${realMpin}`);
      console.log('='.repeat(50));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

setupTestPatient().catch(console.error);