/**
 * Test database connection
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testConnection() {
  if (!process.env.POSTGRES_URL) {
    console.error("❌ POSTGRES_URL not found in .env.local");
    process.exit(1);
  }

  console.log("🔍 Testing database connection...\n");

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to database!\n");

    // Get database info
    const dbInfo = await client.query("SELECT version()");
    console.log("📊 Database version:");
    console.log(`   ${dbInfo.rows[0].version}\n`);

    // List tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("📋 Tables in database:");
    if (tables.rows.length === 0) {
      console.log("   (no tables found - run migration script first)");
    } else {
      tables.rows.forEach((row) => {
        console.log(`   ✓ ${row.table_name}`);
      });
    }

    // Count users
    try {
      const userCount = await client.query('SELECT COUNT(*) FROM "user"');
      console.log(`\n👥 Users: ${userCount.rows[0].count}`);
    } catch {
      console.log("\n👥 Users table not found (run migration first)");
    }

    // Count sessions
    try {
      const sessionCount = await client.query('SELECT COUNT(*) FROM "session"');
      console.log(`🔐 Active sessions: ${sessionCount.rows[0].count}`);
    } catch {
      console.log("🔐 Session table not found (run migration first)");
    }

    console.log("\n✅ Database connection test passed!");

  } catch (error) {
    console.error("❌ Connection failed:", error);
    console.log("\nTroubleshooting:");
    console.log("1. Check that POSTGRES_URL is correct in .env.local");
    console.log("2. Verify you have internet connection");
    console.log("3. Check Neon dashboard for database status");
    process.exit(1);
  } finally {
    await client.end();
  }
}

testConnection();
