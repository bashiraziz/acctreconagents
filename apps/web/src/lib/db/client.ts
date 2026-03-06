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

export type XeroConnectionRecord = {
  id: string;
  userId: string;
  tenantId: string;
  tenantName: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string | null;
  tokenType: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
};

export type IntegrationConnectionProvider = "xero";

export type IntegrationConnectionRecord = {
  id: string;
  userId: string;
  organizationId: string;
  provider: IntegrationConnectionProvider;
  externalTenantId: string;
  externalTenantName: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string | null;
  tokenType: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
};

export type IngestJobStatus = "pending" | "processing" | "done" | "failed";

export type IngestJobRecord = {
  id: string;
  tenantId: string;
  s3Key: string;
  status: IngestJobStatus;
  result: unknown | null;
  createdAt: string;
  updatedAt: string;
};

export type IngestErrorRecord = {
  id: string;
  tenantId: string;
  fileName: string;
  s3Key: string;
  error: string;
  createdAt: string;
};

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

function normalizeOrganizationName(name: string): string {
  const trimmed = name.trim();
  const normalized = trimmed.toUpperCase();
  if (normalized === "MYCO") {
    return "Primary Organization";
  }
  if (normalized === "ACME" || normalized === "ACME, INC") {
    return "Lead Organization";
  }
  return trimmed;
}

async function migrateLegacyOrganizationNames(userId: string): Promise<void> {
  await sql`
    UPDATE user_organizations
    SET
      name = CASE
        WHEN UPPER(TRIM(name)) = 'MYCO' THEN 'Primary Organization'
        WHEN UPPER(TRIM(name)) IN ('ACME', 'ACME, INC') THEN 'Lead Organization'
        ELSE name
      END,
      updated_at = CASE
        WHEN UPPER(TRIM(name)) IN ('MYCO', 'ACME', 'ACME, INC') THEN NOW()
        ELSE updated_at
      END
    WHERE user_id = ${userId}
      AND UPPER(TRIM(name)) IN ('MYCO', 'ACME', 'ACME, INC');
  `;
}

export async function getUserOrganizations(
  userId: string,
): Promise<UserOrganization[]> {
  try {
    await migrateLegacyOrganizationNames(userId);

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
    await migrateLegacyOrganizationNames(userId);

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
  const persistedName = normalizeOrganizationName(name);

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
      VALUES (${id}, ${userId}, ${persistedName}, ${shouldDefault}, NOW(), NOW())
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
  const persistedName = normalizeOrganizationName(name);
  try {
    const result = await sql`
      UPDATE user_organizations
      SET name = ${persistedName}, updated_at = NOW()
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
// Xero Connections CRUD
// ============================================

export async function upsertXeroConnection(
  userId: string,
  connection: {
    tenantId: string;
    tenantName?: string | null;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope?: string | null;
    tokenType?: string | null;
  },
): Promise<XeroConnectionRecord> {
  const id = `xero_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  try {
    const result = await sql`
      INSERT INTO xero_connections (
        id,
        user_id,
        tenant_id,
        tenant_name,
        access_token,
        refresh_token,
        expires_at,
        scope,
        token_type,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${userId},
        ${connection.tenantId},
        ${connection.tenantName ?? null},
        ${connection.accessToken},
        ${connection.refreshToken},
        ${connection.expiresAt.toISOString()},
        ${connection.scope ?? null},
        ${connection.tokenType ?? null},
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        tenant_name = EXCLUDED.tenant_name,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        scope = EXCLUDED.scope,
        token_type = EXCLUDED.token_type,
        updated_at = NOW()
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to save Xero connection - no rows returned");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name ?? null,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      scope: row.scope ?? null,
      tokenType: row.token_type ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncedAt: row.last_synced_at ?? null,
    };
  } catch (error) {
    console.error("Database error in upsertXeroConnection:", error);
    throw new Error(
      `Failed to save Xero connection: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getXeroConnection(
  userId: string,
): Promise<XeroConnectionRecord | null> {
  try {
    const result = await sql`
      SELECT * FROM xero_connections
      WHERE user_id = ${userId}
      LIMIT 1;
    `;

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name ?? null,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      scope: row.scope ?? null,
      tokenType: row.token_type ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncedAt: row.last_synced_at ?? null,
    };
  } catch (error) {
    console.error("Database error in getXeroConnection:", error);
    throw new Error(
      `Failed to get Xero connection: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function markXeroConnectionSynced(userId: string): Promise<void> {
  try {
    await sql`
      UPDATE xero_connections
      SET last_synced_at = NOW(), updated_at = NOW()
      WHERE user_id = ${userId};
    `;
  } catch (error) {
    console.error("Database error in markXeroConnectionSynced:", error);
    throw new Error(
      `Failed to mark Xero sync time: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function deleteXeroConnection(userId: string): Promise<void> {
  try {
    await sql`
      DELETE FROM xero_connections
      WHERE user_id = ${userId};
    `;
  } catch (error) {
    console.error("Database error in deleteXeroConnection:", error);
    throw new Error(
      `Failed to delete Xero connection: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function isRelationMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string };
  return maybe.code === "42P01";
}

function mapIntegrationConnectionRow(row: Record<string, unknown>): IntegrationConnectionRecord {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    organizationId: String(row.organization_id ?? ""),
    provider: String(row.provider ?? "xero") as IntegrationConnectionProvider,
    externalTenantId: String(row.external_tenant_id ?? ""),
    externalTenantName:
      row.external_tenant_name === null || row.external_tenant_name === undefined
        ? null
        : String(row.external_tenant_name),
    accessToken: String(row.access_token ?? ""),
    refreshToken: String(row.refresh_token ?? ""),
    expiresAt: String(row.expires_at ?? ""),
    scope: row.scope === null || row.scope === undefined ? null : String(row.scope),
    tokenType:
      row.token_type === null || row.token_type === undefined
        ? null
        : String(row.token_type),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    lastSyncedAt:
      row.last_synced_at === null || row.last_synced_at === undefined
        ? null
        : String(row.last_synced_at),
  };
}

function mapLegacyXeroToIntegration(
  legacy: XeroConnectionRecord,
  organizationId: string
): IntegrationConnectionRecord {
  return {
    id: legacy.id,
    userId: legacy.userId,
    organizationId,
    provider: "xero",
    externalTenantId: legacy.tenantId,
    externalTenantName: legacy.tenantName,
    accessToken: legacy.accessToken,
    refreshToken: legacy.refreshToken,
    expiresAt: legacy.expiresAt,
    scope: legacy.scope,
    tokenType: legacy.tokenType,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    lastSyncedAt: legacy.lastSyncedAt,
  };
}

export async function upsertIntegrationConnection(
  userId: string,
  organizationId: string,
  provider: IntegrationConnectionProvider,
  connection: {
    externalTenantId: string;
    externalTenantName?: string | null;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope?: string | null;
    tokenType?: string | null;
  }
): Promise<IntegrationConnectionRecord> {
  const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  try {
    const result = await sql`
      INSERT INTO integration_connections (
        id,
        user_id,
        organization_id,
        provider,
        external_tenant_id,
        external_tenant_name,
        access_token,
        refresh_token,
        expires_at,
        scope,
        token_type,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${userId},
        ${organizationId},
        ${provider},
        ${connection.externalTenantId},
        ${connection.externalTenantName ?? null},
        ${connection.accessToken},
        ${connection.refreshToken},
        ${connection.expiresAt.toISOString()},
        ${connection.scope ?? null},
        ${connection.tokenType ?? null},
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, organization_id, provider)
      DO UPDATE SET
        external_tenant_id = EXCLUDED.external_tenant_id,
        external_tenant_name = EXCLUDED.external_tenant_name,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        scope = EXCLUDED.scope,
        token_type = EXCLUDED.token_type,
        updated_at = NOW()
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to save integration connection - no rows returned");
    }
    return mapIntegrationConnectionRow(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    if (provider === "xero" && isRelationMissingError(error)) {
      const legacy = await upsertXeroConnection(userId, {
        tenantId: connection.externalTenantId,
        tenantName: connection.externalTenantName ?? null,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        expiresAt: connection.expiresAt,
        scope: connection.scope ?? null,
        tokenType: connection.tokenType ?? null,
      });
      return mapLegacyXeroToIntegration(legacy, organizationId);
    }
    console.error("Database error in upsertIntegrationConnection:", error);
    throw new Error(
      `Failed to save integration connection: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getIntegrationConnection(
  userId: string,
  organizationId: string,
  provider: IntegrationConnectionProvider
): Promise<IntegrationConnectionRecord | null> {
  try {
    const result = await sql`
      SELECT * FROM integration_connections
      WHERE user_id = ${userId}
        AND organization_id = ${organizationId}
        AND provider = ${provider}
      LIMIT 1;
    `;
    if (result.rows && result.rows.length > 0) {
      return mapIntegrationConnectionRow(result.rows[0] as Record<string, unknown>);
    }
    if (provider === "xero") {
      const legacy = await getXeroConnection(userId);
      return legacy ? mapLegacyXeroToIntegration(legacy, organizationId) : null;
    }
    return null;
  } catch (error) {
    if (provider === "xero" && isRelationMissingError(error)) {
      const legacy = await getXeroConnection(userId);
      return legacy ? mapLegacyXeroToIntegration(legacy, organizationId) : null;
    }
    console.error("Database error in getIntegrationConnection:", error);
    throw new Error(
      `Failed to get integration connection: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function markIntegrationConnectionSynced(
  userId: string,
  organizationId: string,
  provider: IntegrationConnectionProvider
): Promise<void> {
  try {
    await sql`
      UPDATE integration_connections
      SET last_synced_at = NOW(), updated_at = NOW()
      WHERE user_id = ${userId}
        AND organization_id = ${organizationId}
        AND provider = ${provider};
    `;
  } catch (error) {
    if (provider === "xero" && isRelationMissingError(error)) {
      await markXeroConnectionSynced(userId);
      return;
    }
    console.error("Database error in markIntegrationConnectionSynced:", error);
    throw new Error(
      `Failed to mark integration sync time: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function deleteIntegrationConnection(
  userId: string,
  organizationId: string,
  provider: IntegrationConnectionProvider
): Promise<void> {
  try {
    await sql`
      DELETE FROM integration_connections
      WHERE user_id = ${userId}
        AND organization_id = ${organizationId}
        AND provider = ${provider};
    `;
  } catch (error) {
    if (provider === "xero" && isRelationMissingError(error)) {
      await deleteXeroConnection(userId);
      return;
    }
    console.error("Database error in deleteIntegrationConnection:", error);
    throw new Error(
      `Failed to delete integration connection: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function mapIngestJobRow(row: Record<string, unknown>): IngestJobRecord {
  return {
    id: String(row.id ?? ""),
    tenantId: String(row.tenant_id ?? ""),
    s3Key: String(row.s3_key ?? ""),
    status: String(row.status ?? "pending") as IngestJobStatus,
    result: row.result ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function createIngestJob(
  tenantId: string,
  s3Key: string,
  status: IngestJobStatus = "pending"
): Promise<IngestJobRecord> {
  try {
    const result = await sql`
      INSERT INTO ingest_jobs (tenant_id, s3_key, status, created_at, updated_at)
      VALUES (${tenantId}, ${s3Key}, ${status}, NOW(), NOW())
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to create ingest job - no rows returned");
    }

    return mapIngestJobRow(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    console.error("Database error in createIngestJob:", error);
    throw new Error(
      `Failed to create ingest job: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function updateIngestJobStatus(
  jobId: string,
  status: IngestJobStatus,
  resultData?: unknown
): Promise<void> {
  try {
    await sql`
      UPDATE ingest_jobs
      SET
        status = ${status},
        result = COALESCE(${resultData ? JSON.stringify(resultData) : null}::jsonb, result),
        updated_at = NOW()
      WHERE id = ${jobId};
    `;
  } catch (error) {
    console.error("Database error in updateIngestJobStatus:", error);
    throw new Error(
      `Failed to update ingest job: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function writeIngestError(input: {
  tenantId: string;
  fileName: string;
  s3Key: string;
  error: string;
}): Promise<IngestErrorRecord> {
  try {
    const result = await sql`
      INSERT INTO ingest_errors (tenant_id, file_name, s3_key, error, created_at)
      VALUES (${input.tenantId}, ${input.fileName}, ${input.s3Key}, ${input.error}, NOW())
      RETURNING *;
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to create ingest error - no rows returned");
    }

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      tenantId: String(row.tenant_id ?? ""),
      fileName: String(row.file_name ?? ""),
      s3Key: String(row.s3_key ?? ""),
      error: String(row.error ?? ""),
      createdAt: String(row.created_at ?? ""),
    };
  } catch (error) {
    console.error("Database error in writeIngestError:", error);
    throw new Error(
      `Failed to write ingest error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function upsertTenantDropZoneAccessKeyId(
  tenantId: string,
  accessKeyId: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO tenants (id, drop_zone_access_key_id, created_at, updated_at)
      VALUES (${tenantId}, ${accessKeyId}, NOW(), NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        drop_zone_access_key_id = EXCLUDED.drop_zone_access_key_id,
        updated_at = NOW();
    `;
  } catch (error) {
    console.error("Database error in upsertTenantDropZoneAccessKeyId:", error);
    throw new Error(
      `Failed to save tenant drop-zone key metadata: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
