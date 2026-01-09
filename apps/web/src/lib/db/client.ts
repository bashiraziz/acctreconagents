/**
 * Database client using Vercel Postgres
 */

import { sql } from "@vercel/postgres";
import type {
  UserMapping,
  UserAccount,
  ReconciliationHistory,
  ColumnMapping,
  FileType,
} from "@/types/reconciliation";

// ============================================
// User Mappings CRUD
// ============================================

export async function saveUserMapping(
  userId: string,
  fileType: FileType,
  mapping: ColumnMapping,
): Promise<UserMapping> {
  const id = `mapping_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    // Upsert: update if exists, insert if not
    const result = await sql`
      INSERT INTO user_mappings (id, user_id, file_type, mapping, created_at, updated_at)
      VALUES (${id}, ${userId}, ${fileType}, ${JSON.stringify(mapping)}, NOW(), NOW())
      ON CONFLICT (user_id, file_type)
      DO UPDATE SET
        mapping = ${JSON.stringify(mapping)},
        updated_at = NOW()
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to save user mapping - no rows returned");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      fileType: row.file_type as FileType,
      mapping: row.mapping as ColumnMapping,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("Database error in saveUserMapping:", error);
    throw new Error(`Failed to save user mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getUserMapping(
  userId: string,
  fileType: FileType,
): Promise<UserMapping | null> {
  const result = await sql`
    SELECT * FROM user_mappings
    WHERE user_id = ${userId} AND file_type = ${fileType}
    LIMIT 1;
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    fileType: row.file_type as FileType,
    mapping: row.mapping as ColumnMapping,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllUserMappings(
  userId: string,
): Promise<UserMapping[]> {
  const result = await sql`
    SELECT * FROM user_mappings
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC;
  `;

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    fileType: row.file_type as FileType,
    mapping: row.mapping as ColumnMapping,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ============================================
// User Accounts CRUD
// ============================================

export async function saveUserAccount(
  userId: string,
  accountCode: string,
  accountName: string,
  materialityThreshold?: number,
): Promise<UserAccount> {
  const id = `account_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const threshold = materialityThreshold ?? 50;

  try {
    const result = await sql`
      INSERT INTO user_accounts (id, user_id, account_code, account_name, materiality_threshold, created_at)
      VALUES (${id}, ${userId}, ${accountCode}, ${accountName}, ${threshold}, NOW())
      ON CONFLICT (user_id, account_code)
      DO UPDATE SET
        account_name = ${accountName},
        materiality_threshold = ${threshold}
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to save user account - no rows returned");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      accountCode: row.account_code,
      accountName: row.account_name,
      materialityThreshold: parseFloat(row.materiality_threshold),
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error("Database error in saveUserAccount:", error);
    throw new Error(`Failed to save user account: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getUserAccounts(
  userId: string,
): Promise<UserAccount[]> {
  const result = await sql`
    SELECT * FROM user_accounts
    WHERE user_id = ${userId}
    ORDER BY account_code ASC;
  `;

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    accountCode: row.account_code,
    accountName: row.account_name,
    materialityThreshold: parseFloat(row.materiality_threshold),
    createdAt: row.created_at,
  }));
}

export async function deleteUserAccount(
  userId: string,
  accountCode: string,
): Promise<void> {
  await sql`
    DELETE FROM user_accounts
    WHERE user_id = ${userId} AND account_code = ${accountCode};
  `;
}

// ============================================
// Reconciliation History CRUD
// ============================================

export async function saveReconciliationHistory(
  userId: string,
  runId: string,
  accounts: string[],
  periods: string[],
  status: "success" | "failed" | "partial",
  summary: string,
  resultData?: any,
): Promise<ReconciliationHistory> {
  const id = `history_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const accountsArray = `{${accounts.map(a => `"${a}"`).join(',')}}`;
  const periodsArray = `{${periods.map(p => `"${p}"`).join(',')}}`;

  try {
    const result = await sql`
      INSERT INTO reconciliation_history
        (id, user_id, run_id, accounts, periods, status, summary, result_data, created_at)
      VALUES
        (${id}, ${userId}, ${runId}, ${accountsArray}, ${periodsArray}, ${status}, ${summary},
         ${resultData ? JSON.stringify(resultData) : null}, NOW())
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to save reconciliation history - no rows returned");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      runId: row.run_id,
      accounts: row.accounts,
      periods: row.periods,
      status: row.status as "success" | "failed" | "partial",
      summary: row.summary,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error("Database error in saveReconciliationHistory:", error);
    throw new Error(`Failed to save reconciliation history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getReconciliationHistory(
  userId: string,
  limit: number = 50,
): Promise<ReconciliationHistory[]> {
  const result = await sql`
    SELECT * FROM reconciliation_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    runId: row.run_id,
    accounts: row.accounts,
    periods: row.periods,
    status: row.status as "success" | "failed" | "partial",
    summary: row.summary,
    createdAt: row.created_at,
  }));
}

export async function getReconciliationDetail(
  userId: string,
  runId: string,
): Promise<any | null> {
  const result = await sql`
    SELECT result_data FROM reconciliation_history
    WHERE user_id = ${userId} AND run_id = ${runId}
    LIMIT 1;
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].result_data;
}
