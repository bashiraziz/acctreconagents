/**
 * Database client using Vercel Postgres
 */

import { sql } from "@vercel/postgres";
import type {
  UserMapping,
  UserAccount,
  ReconciliationHistory,
  UserOrganization,
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
  try {
    const result = await sql`
      SELECT * FROM user_mappings
      WHERE user_id = ${userId} AND file_type = ${fileType}
      LIMIT 1;
    `;

    if (!result.rows || result.rows.length === 0) {
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
  } catch (error) {
    console.error("Database error in getUserMapping:", error);
    throw new Error(`Failed to get user mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getAllUserMappings(
  userId: string,
): Promise<UserMapping[]> {
  try {
    const result = await sql`
      SELECT * FROM user_mappings
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC;
    `;

    if (!result.rows) {
      return [];
    }

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      fileType: row.file_type as FileType,
      mapping: row.mapping as ColumnMapping,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("Database error in getAllUserMappings:", error);
    throw new Error(`Failed to get user mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  try {
    const result = await sql`
      SELECT * FROM user_accounts
      WHERE user_id = ${userId}
      ORDER BY account_code ASC;
    `;

    if (!result.rows) {
      return [];
    }

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      accountCode: row.account_code,
      accountName: row.account_name,
      materialityThreshold: parseFloat(row.materiality_threshold),
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Database error in getUserAccounts:", error);
    throw new Error(`Failed to get user accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteUserAccount(
  userId: string,
  accountCode: string,
): Promise<void> {
  try {
    await sql`
      DELETE FROM user_accounts
      WHERE user_id = ${userId} AND account_code = ${accountCode};
    `;
  } catch (error) {
    console.error("Database error in deleteUserAccount:", error);
    throw new Error(`Failed to delete user account: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================
// User Organizations CRUD
// ============================================

export async function getUserOrganizations(
  userId: string,
): Promise<UserOrganization[]> {
  try {
    const result = await sql`
      SELECT * FROM user_organizations
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, created_at ASC;
    `;

    if (!result.rows) {
      return [];
    }

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isDefault: row.is_default,
      defaultMateriality: row.default_materiality ?? null,
      defaultPrompt: row.default_prompt ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("Database error in getUserOrganizations:", error);
    throw new Error(`Failed to get user organizations: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getDefaultUserOrganization(
  userId: string,
): Promise<UserOrganization | null> {
  try {
    const result = await sql`
      SELECT * FROM user_organizations
      WHERE user_id = ${userId} AND is_default = true
      LIMIT 1;
    `;

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isDefault: row.is_default,
      defaultMateriality: row.default_materiality ?? null,
      defaultPrompt: row.default_prompt ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("Database error in getDefaultUserOrganization:", error);
    throw new Error(`Failed to get default organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function createUserOrganization(
  userId: string,
  name: string,
  makeDefault: boolean = false,
): Promise<UserOrganization> {
  const id = `org_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    const existing = await sql`
      SELECT COUNT(*)::int AS count FROM user_organizations
      WHERE user_id = ${userId};
    `;
    const existingCount = existing.rows?.[0]?.count ?? 0;
    const shouldDefault = makeDefault || existingCount === 0;

    if (shouldDefault) {
      await sql`
        UPDATE user_organizations
        SET is_default = false, updated_at = NOW()
        WHERE user_id = ${userId};
      `;
    }

    const result = await sql`
      INSERT INTO user_organizations (id, user_id, name, is_default, created_at, updated_at)
      VALUES (${id}, ${userId}, ${name}, ${shouldDefault}, NOW(), NOW())
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to create organization - no rows returned");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isDefault: row.is_default,
      defaultMateriality: row.default_materiality ?? null,
      defaultPrompt: row.default_prompt ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("Database error in createUserOrganization:", error);
    throw new Error(`Failed to create organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function renameUserOrganization(
  userId: string,
  organizationId: string,
  name: string,
): Promise<UserOrganization> {
  try {
    const result = await sql`
      UPDATE user_organizations
      SET name = ${name}, updated_at = NOW()
      WHERE user_id = ${userId} AND id = ${organizationId}
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Organization not found");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isDefault: row.is_default,
      defaultMateriality: row.default_materiality ?? null,
      defaultPrompt: row.default_prompt ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("Database error in renameUserOrganization:", error);
    throw new Error(`Failed to rename organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function setDefaultUserOrganization(
  userId: string,
  organizationId: string,
): Promise<UserOrganization> {
  try {
    await sql`
      UPDATE user_organizations
      SET is_default = false, updated_at = NOW()
      WHERE user_id = ${userId};
    `;

    const result = await sql`
      UPDATE user_organizations
      SET is_default = true, updated_at = NOW()
      WHERE user_id = ${userId} AND id = ${organizationId}
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Organization not found");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isDefault: row.is_default,
      defaultMateriality: row.default_materiality ?? null,
      defaultPrompt: row.default_prompt ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("Database error in setDefaultUserOrganization:", error);
    throw new Error(`Failed to set default organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function updateUserOrganizationDefaults(
  userId: string,
  organizationId: string,
  defaults: {
    defaultMateriality?: number | null;
    defaultPrompt?: string | null;
  },
): Promise<UserOrganization> {
  const { defaultMateriality, defaultPrompt } = defaults;
  try {
    const result = await sql`
      UPDATE user_organizations
      SET
        default_materiality = ${defaultMateriality ?? null},
        default_prompt = ${defaultPrompt ?? null},
        updated_at = NOW()
      WHERE user_id = ${userId} AND id = ${organizationId}
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Organization not found");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isDefault: row.is_default,
      defaultMateriality: row.default_materiality ?? null,
      defaultPrompt: row.default_prompt ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("Database error in updateUserOrganizationDefaults:", error);
    throw new Error(`Failed to update organization defaults: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function deleteUserOrganization(
  userId: string,
  organizationId: string,
): Promise<void> {
  try {
    const current = await sql`
      SELECT is_default FROM user_organizations
      WHERE user_id = ${userId} AND id = ${organizationId}
      LIMIT 1;
    `;
    const wasDefault = current.rows?.[0]?.is_default ?? false;

    await sql`
      DELETE FROM user_organizations
      WHERE user_id = ${userId} AND id = ${organizationId};
    `;

    if (wasDefault) {
      const fallback = await sql`
        SELECT id FROM user_organizations
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
        LIMIT 1;
      `;
      const fallbackId = fallback.rows?.[0]?.id;
      if (fallbackId) {
        await sql`
          UPDATE user_organizations
          SET is_default = true, updated_at = NOW()
          WHERE user_id = ${userId} AND id = ${fallbackId};
        `;
      }
    }
  } catch (error) {
    console.error("Database error in deleteUserOrganization:", error);
    throw new Error(`Failed to delete organization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
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
  resultData?: unknown,
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
  try {
    const result = await sql`
      SELECT * FROM reconciliation_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;

    if (!result.rows) {
      return [];
    }

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
  } catch (error) {
    console.error("Database error in getReconciliationHistory:", error);
    throw new Error(`Failed to get reconciliation history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getReconciliationDetail(
  userId: string,
  runId: string,
): Promise<unknown | null> {
  try {
    const result = await sql`
      SELECT result_data FROM reconciliation_history
      WHERE user_id = ${userId} AND run_id = ${runId}
      LIMIT 1;
    `;

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0].result_data;
  } catch (error) {
    console.error("Database error in getReconciliationDetail:", error);
    throw new Error(`Failed to get reconciliation detail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
