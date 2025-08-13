import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5432/ClinicFlow_7'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting MPIN migration...');
    
    // Add MPIN fields to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mpin VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mpin_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS mpin_locked_until TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_mpin_change TIMESTAMP
    `);
    console.log('✓ Added MPIN fields to users table');
    
    // Create login_attempts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        login_type VARCHAR(20),
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        attempted_at TIMESTAMP DEFAULT NOW(),
        failure_reason VARCHAR(255)
      )
    `);
    console.log('✓ Created login_attempts table');
    
    // Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE role = 'patient'
    `);
    console.log('✓ Added index on users.phone for patients');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id, attempted_at DESC)
    `);
    console.log('✓ Added index on login_attempts.user_id');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at DESC)
    `);
    console.log('✓ Added index on login_attempts.ip_address');
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);