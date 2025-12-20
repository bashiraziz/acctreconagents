/**
 * Neon Database Migration for Better Auth
 * Run with: npx tsx scripts/migrate-neon.ts
 */

import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function migrateDatabase() {
  if (!process.env.POSTGRES_URL) {
    console.error("❌ POSTGRES_URL not found in .env.local");
    console.log("\nPlease set up Neon database first:");
    console.log("1. Go to https://neon.tech");
    console.log("2. Create a free account");
    console.log("3. Create a new project");
    console.log("4. Copy the connection string");
    console.log('5. Add to .env.local: POSTGRES_URL="your-connection-string"');
    process.exit(1);
  }

  console.log("🗄️  Migrating database for Better Auth...\n");

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log("✓ Connected to Neon database\n");

    // Create Better Auth tables
    console.log("Creating Better Auth tables...");

    // User table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ user table created");

    // Session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );
    `);
    console.log("✓ session table created");

    // Account table (for password hash storage)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "account" (
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
      );
    `);
    console.log("✓ account table created");

    // Verification table (for email verification)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ verification table created");

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);
    `);
    console.log("✓ Indexes created\n");

    // Create app-specific tables
    console.log("Creating application tables...");

    // User mappings table (for column mapping persistence)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_mappings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        file_type VARCHAR(50) NOT NULL,
        mapping JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, file_type)
      );
    `);
    console.log("✓ user_mappings table created");

    // User accounts table (for account preferences)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        account_code VARCHAR(100) NOT NULL,
        account_name VARCHAR(255),
        materiality_threshold DECIMAL(15, 2) DEFAULT 50.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, account_code)
      );
    `);
    console.log("✓ user_accounts table created");

    // Reconciliation history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_history (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        run_id TEXT NOT NULL,
        accounts TEXT[] NOT NULL,
        periods TEXT[] NOT NULL,
        status VARCHAR(50) NOT NULL,
        summary TEXT,
        result_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ reconciliation_history table created");

    // Create indexes for app tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_mappings_user_file
      ON user_mappings(user_id, file_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_accounts_user
      ON user_accounts(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_history_user_date
      ON reconciliation_history(user_id, created_at DESC);
    `);
    console.log("✓ App indexes created\n");

    console.log("✅ Database migration complete!\n");
    console.log("Tables created:");
    console.log("  Better Auth:");
    console.log("    - user (user accounts)");
    console.log("    - session (active sessions)");
    console.log("    - account (password storage)");
    console.log("    - verification (email verification)");
    console.log("\n  Application:");
    console.log("    - user_mappings (column mappings)");
    console.log("    - user_accounts (account preferences)");
    console.log("    - reconciliation_history (run history)\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateDatabase();
