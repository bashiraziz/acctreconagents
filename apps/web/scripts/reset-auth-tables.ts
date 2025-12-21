/**
 * Reset Better Auth tables and recreate with correct schema
 */

import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function resetTables() {
  if (!process.env.POSTGRES_URL) {
    console.error("❌ POSTGRES_URL not configured");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.POSTGRES_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log("✓ Connected to database\n");

    // Drop existing Better Auth tables
    console.log("Dropping existing Better Auth tables...");
    await client.query(`DROP TABLE IF EXISTS "verification" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "session" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "account" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "user" CASCADE`);
    console.log("✓ Tables dropped\n");

    // Recreate with exact Better Auth schema
    console.log("Creating Better Auth tables...\n");

    // User table - EXACT Better Auth schema
    await client.query(`
      CREATE TABLE "user" (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        name TEXT,
        image TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ user");

    // Session table
    await client.query(`
      CREATE TABLE "session" (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ session");

    // Account table
    await client.query(`
      CREATE TABLE "account" (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at TIMESTAMP,
        refresh_token_expires_at TIMESTAMP,
        scope TEXT,
        password TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ account");

    // Verification table
    await client.query(`
      CREATE TABLE "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ verification\n");

    console.log("✅ All Better Auth tables recreated successfully!");

    await client.end();
  } catch (error) {
    console.error("❌ Error:", error);
    await client.end();
    process.exit(1);
  }
}

resetTables();
