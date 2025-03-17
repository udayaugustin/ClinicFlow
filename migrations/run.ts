import { pool } from '../server/db';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();

  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const files = await fs.readdir(__dirname);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
      .sort();

    // Get executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations'
    );
    const executedMigrationNames = new Set(
      executedMigrations.map(row => row.name)
    );

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.has(file)) {
        console.log(`Running migration: ${file}`);
        const migration = await fs.readFile(
          path.join(__dirname, file),
          'utf-8'
        );

        await client.query('BEGIN');
        try {
          await client.query(migration);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`Migration ${file} completed successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error running migration ${file}:`, error);
          throw error;
        }
      }
    }

    console.log('All migrations completed successfully');
  } finally {
    client.release();
  }
}

// Run migrations
runMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 