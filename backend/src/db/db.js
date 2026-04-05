import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Initialize database and create tables
export async function initDB() {
  try {
    const client = await pool.connect();

    // Create speed_logs table with proper schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SpeedLog" (
        id SERIAL PRIMARY KEY,
        "sensorId" VARCHAR(50) NOT NULL,
        speed DECIMAL(10, 2) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add unique constraint to prevent duplicates
    try {
      await client.query(`
        ALTER TABLE "SpeedLog"
        ADD CONSTRAINT unique_sensor_timestamp
        UNIQUE ("sensorId", timestamp);
      `);
    } catch (err) {
      // Constraint already exists, ignore
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }

    client.release();
    console.log('Database initialized successfully');
    console.log('Table: SpeedLog (sensorId, speed, timestamp)');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}

// Bulk insert multiple speed logs (much more efficient)
export async function bulkInsertSpeedLogs(records) {
  if (!records || records.length === 0) return [];

  try {
    // Build parameterized query for bulk insert
    const placeholders = records.map((_, i) => {
      const idx = i * 3;
      return `($${idx + 1}, $${idx + 2}, $${idx + 3})`;
    }).join(', ');

    const values = records.flatMap(r => [r.sensorId, r.speed, r.timestamp]);

    const query = `
      INSERT INTO "SpeedLog" ("sensorId", speed, timestamp)
      VALUES ${placeholders}
      RETURNING id, "sensorId", speed, timestamp, "createdAt"
    `;

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error(`Error bulk inserting ${records.length} speed logs:`, error.message);
    throw error;
  }
}

export { pool };
