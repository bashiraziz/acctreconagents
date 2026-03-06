/**
 * Database initialization script
 * Run with: npx tsx scripts/init-db.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { URL } from "url";

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { sql } from "@vercel/postgres";

function getDatabaseHost() {
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
  ].filter(Boolean) as string[];

  if (candidates.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(candidates[0]);
    return parsed.hostname;
  } catch {
    return null;
  }
}

function isProductionHost(hostname: string | null) {
  if (!hostname) return false;
  return !(
    hostname.includes("localhost") ||
    hostname.startsWith("127.") ||
    hostname.endsWith(".local")
  );
}

async function initializeDatabase() {
  console.log("🗄️  Initializing database tables...\n");
  const hostname = getDatabaseHost();
  console.log(`Database host: ${hostname ?? "unknown"}`);

  if (!isProductionHost(hostname)) {
    console.error(
      "❌ Safety check failed: database host looks local or unknown. Aborting."
    );
    console.error(
      "Set POSTGRES_URL (or DATABASE_URL) to your production Vercel Postgres connection string before running."
    );
    process.exit(1);
  }

  try {
    // Create Better Auth core tables
    await sql`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✓ user table created");

    await sql`
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✓ session table created");

    await sql`
      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMPTZ,
        "refreshTokenExpiresAt" TIMESTAMPTZ,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✓ account table created");

    await sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✓ verification table created");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_session_user
      ON "session"("userId");
    `;
    console.log("✓ session user index created");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_account_user
      ON "account"("userId");
    `;
    console.log("✓ account user index created");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_verification_identifier
      ON "verification"(identifier);
    `;
    console.log("✓ verification identifier index created");

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

    // Create user_organizations table
    await sql`
      CREATE TABLE IF NOT EXISTS user_organizations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        default_materiality DECIMAL(15, 2),
        default_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✓ user_organizations table created");

    // Add new columns if table already existed
    await sql`ALTER TABLE user_organizations ADD COLUMN IF NOT EXISTS default_materiality DECIMAL(15, 2);`;
    await sql`ALTER TABLE user_organizations ADD COLUMN IF NOT EXISTS default_prompt TEXT;`;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_organizations_user
      ON user_organizations(user_id);
    `;
    console.log("✓ user_organizations index created");

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_organizations_default
      ON user_organizations(user_id)
      WHERE is_default = true;
    `;
    console.log("✓ user_organizations default index created");
    // Rename legacy organization labels to current names
    await sql`
      UPDATE user_organizations
      SET name = 'Primary Organization', updated_at = NOW()
      WHERE UPPER(TRIM(name)) = 'MYCO';
    `;
    await sql`
      UPDATE user_organizations
      SET name = 'Lead Organization', updated_at = NOW()
      WHERE UPPER(TRIM(name)) IN ('ACME', 'ACME, INC');
    `;
    console.log("✓ user_organizations legacy names migrated");
    // Create integration_connections table (organization-scoped and provider-agnostic)
    await sql`
      CREATE TABLE IF NOT EXISTS integration_connections (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        organization_id VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        external_tenant_id VARCHAR(255) NOT NULL,
        external_tenant_name VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        scope TEXT,
        token_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TIMESTAMP
      );
    `;
    console.log("integration_connections table created");

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_connections_scope
      ON integration_connections(user_id, organization_id, provider);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_integration_connections_user
      ON integration_connections(user_id);
    `;
    console.log("integration_connections indexes created");

    // Legacy xero_connections table (user-scoped fallback compatibility)
    await sql`
      CREATE TABLE IF NOT EXISTS xero_connections (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        tenant_id VARCHAR(255) NOT NULL,
        tenant_name VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        scope TEXT,
        token_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TIMESTAMP
      );
    `;
    console.log("xero_connections table created");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_xero_connections_user
      ON xero_connections(user_id);
    `;
    console.log("xero_connections index created");
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

    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

    await sql`
      CREATE TABLE IF NOT EXISTS ingest_errors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        s3_key TEXT NOT NULL,
        error TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ingest_errors_tenant_created_at
      ON ingest_errors(tenant_id, created_at DESC);
    `;
    console.log("ingest_errors table created");

    await sql`
      CREATE TABLE IF NOT EXISTS ingest_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        s3_key TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'failed')),
        result JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ingest_jobs_tenant_created_at
      ON ingest_jobs(tenant_id, created_at DESC);
    `;
    console.log("ingest_jobs table created");

    await sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        drop_zone_access_key_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS drop_zone_access_key_id TEXT;
    `;
    console.log("tenants table created/updated");

    console.log("\n✅ Database initialization complete!\n");
    console.log("Tables created:");
    console.log("  - user (Better Auth users)");
    console.log("  - session (Better Auth sessions)");
    console.log("  - account (Better Auth accounts)");
    console.log("  - verification (Better Auth verification tokens)");
    console.log("  - user_mappings (stores column mappings per user)");
    console.log("  - user_accounts (stores account preferences)");
    console.log("  - integration_connections (org-scoped OAuth and provider metadata)");
    console.log("  - xero_connections (legacy user-scoped fallback)");
    console.log("  - reconciliation_history (stores run history)");
    console.log("  - ingest_jobs (tracks drop-zone ingestion lifecycle)");
    console.log("  - ingest_errors (drop-zone ingest errors)");
    console.log("  - tenants (drop-zone key references)\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

initializeDatabase();



