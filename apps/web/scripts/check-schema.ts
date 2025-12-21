import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 User table schema:');
    res.rows.forEach(r => {
      console.log(`  ✓ ${r.column_name.padEnd(20)} ${r.data_type.padEnd(30)} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    const accountRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'account'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Account table schema:');
    accountRes.rows.forEach(r => {
      console.log(`  ✓ ${r.column_name.padEnd(20)} ${r.data_type.padEnd(30)} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
