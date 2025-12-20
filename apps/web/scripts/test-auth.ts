/**
 * Test Better Auth initialization
 * Run with: npx tsx scripts/test-auth.ts
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testAuth() {
  console.log("🔍 Testing Better Auth initialization...\n");

  if (!process.env.POSTGRES_URL) {
    console.error("❌ POSTGRES_URL not found");
    process.exit(1);
  }

  console.log("Connection string:", process.env.POSTGRES_URL.replace(/:[^:@]+@/, ':****@'));

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.POSTGRES_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // Test pool connection first
    console.log("\n1. Testing pool connection...");
    const client = await pool.connect();
    console.log("✓ Pool connection successful");

    // Test querying user table
    console.log("\n2. Testing user table access...");
    const result = await client.query('SELECT COUNT(*) FROM "user"');
    console.log(`✓ User table accessible (${result.rows[0].count} users)`);
    client.release();

    // Now try Better Auth initialization
    console.log("\n3. Initializing Better Auth...");
    const auth = betterAuth({
      database: {
        provider: "postgres",
        client: pool,
      },
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
    });

    console.log("✓ Better Auth initialized successfully!");
    console.log("\n✅ All tests passed!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAuth();
