type DevXeroConnection = {
  sessionId: string;
  tenantId: string;
  tenantName: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string | null;
  tokenType: string | null;
  updatedAt: string;
  lastSyncedAt: string | null;
};

const DEV_XERO_STORE_KEY = "__rowshni_dev_xero_store__";

function getStore(): Map<string, DevXeroConnection> {
  const globalRef = globalThis as typeof globalThis & {
    [DEV_XERO_STORE_KEY]?: Map<string, DevXeroConnection>;
  };
  if (!globalRef[DEV_XERO_STORE_KEY]) {
    globalRef[DEV_XERO_STORE_KEY] = new Map<string, DevXeroConnection>();
  }
  return globalRef[DEV_XERO_STORE_KEY];
}

export function isXeroDevNoDbModeEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.XERO_DEV_NO_DB === "true";
}

export function getDevXeroConnection(sessionId: string): DevXeroConnection | null {
  return getStore().get(sessionId) ?? null;
}

export function upsertDevXeroConnection(
  sessionId: string,
  data: {
    tenantId: string;
    tenantName?: string | null;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope?: string | null;
    tokenType?: string | null;
  }
): DevXeroConnection {
  const existing = getStore().get(sessionId);
  const next: DevXeroConnection = {
    sessionId,
    tenantId: data.tenantId,
    tenantName: data.tenantName ?? null,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt.toISOString(),
    scope: data.scope ?? null,
    tokenType: data.tokenType ?? null,
    updatedAt: new Date().toISOString(),
    lastSyncedAt: existing?.lastSyncedAt ?? null,
  };
  getStore().set(sessionId, next);
  return next;
}

export function markDevXeroConnectionSynced(sessionId: string): void {
  const existing = getStore().get(sessionId);
  if (!existing) return;
  getStore().set(sessionId, {
    ...existing,
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  });
}

export function deleteDevXeroConnection(sessionId: string): void {
  getStore().delete(sessionId);
}

