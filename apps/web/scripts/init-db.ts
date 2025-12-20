/**
 * Database initialization script
 * Run with: npx tsx scripts/init-db.ts
 */

import { sql } from "@vercel/postgres";

async function initializeDatabase() {
  console.log("🗄️  Initializing database tables...\n");

  try {
    // Create user_mappings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_mappings (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        mapping JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, file_type)
      );
    `;
    console.log("✓ user_mappings table created");

    // Create index on user_id and file_type for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_mappings_user_file
      ON user_mappings(user_id, file_type);
    `;
    console.log("✓ user_mappings index created");

    // Create user_accounts table
    await sql`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        account_code VARCHAR(100) NOT NULL,
        account_name VARCHAR(255),
        materiality_threshold DECIMAL(15, 2) DEFAULT 50.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, account_code)
      );
    `;
    console.log("✓ user_accounts table created");

    // Create index on user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_accounts_user
      ON user_accounts(user_id);
    `;
    console.log("✓ user_accounts index created");

    // Create reconciliation_history table
    await sql`
      CREATE TABLE IF NOT EXISTS reconciliation_history (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        run_id VARCHAR(255) NOT NULL,
        accounts TEXT[] NOT NULL,
        periods TEXT[] NOT NULL,
        status VARCHAR(50) NOT NULL,
        summary TEXT,
        result_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✓ reconciliation_history table created");

    // Create index on user_id and created_at for history queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_reconciliation_history_user_date
      ON reconciliation_history(user_id, created_at DESC);
    `;
    console.log("✓ reconciliation_history index created");

    console.log("\n✅ Database initialization complete!\n");
    console.log("Tables created:");
    console.log("  - user_mappings (stores column mappings per user)");
    console.log("  - user_accounts (stores account preferences)");
    console.log("  - reconciliation_history (stores run history)\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

initializeDatabase();
