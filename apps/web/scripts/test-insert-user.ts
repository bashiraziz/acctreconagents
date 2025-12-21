import dotenv from 'dotenv';
import { Client } from 'pg';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testInsertUser() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.POSTGRES_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Generate a unique ID
    const userId = crypto.randomUUID();

    // Try to insert a test user
    const result = await client.query(`
      INSERT INTO "user" (id, email, email_verified, name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [userId, 'test@example.com', false, 'Test User']);

    console.log('✅ User inserted successfully:', result.rows[0]);

    // Clean up - delete the test user
    await client.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
    console.log('✅ Test user deleted\n');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

testInsertUser();
