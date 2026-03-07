import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEV_DEFAULT_ORGANIZATION_SCOPE } from "@/lib/integrations/organization-scope";

type DevXeroConnection = {
  sessionId: string;
  organizationId: string;
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

const DEV_XERO_STORE_FILE =
  process.env.XERO_DEV_STORE_FILE?.trim() ||
  path.join(os.tmpdir(), "rowshni-xero-dev-store.json");

type DevStore = Record<string, DevXeroConnection>;

function scopedKey(sessionId: string, organizationId: string): string {
  return `${sessionId}::${organizationId}`;
}

function readStore(): DevStore {
  try {
    const raw = fs.readFileSync(DEV_XERO_STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as DevStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return {};
    }
    console.warn("Failed to read Xero dev store file:", error);
    return {};
  }
}

function writeStore(store: DevStore): void {
  try {
    fs.mkdirSync(path.dirname(DEV_XERO_STORE_FILE), { recursive: true });
    fs.writeFileSync(DEV_XERO_STORE_FILE, JSON.stringify(store), "utf8");
  } catch (error) {
    console.warn("Failed to write Xero dev store file:", error);
  }
}

export function isXeroDevNoDbModeEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.XERO_DEV_NO_DB === "true";
}

export function getDevXeroConnection(
  sessionId: string,
  organizationId: string = DEV_DEFAULT_ORGANIZATION_SCOPE
): DevXeroConnection | null {
  if (!sessionId) return null;
  const store = readStore();
  const scoped = store[scopedKey(sessionId, organizationId)];
  if (scoped) {
    return scoped;
  }
  const legacy = store[sessionId];
  if (!legacy) return null;
  if (!legacy.organizationId || legacy.organizationId === organizationId) {
    return {
      ...legacy,
      organizationId: legacy.organizationId ?? organizationId,
    };
  }
  return null;
}

export function getMostRecentDevXeroConnection(
  organizationId?: string
): DevXeroConnection | null {
  const store = readStore();
  const all = Object.values(store).filter((connection) => {
    if (!organizationId) return true;
    return (
      (connection.organizationId || DEV_DEFAULT_ORGANIZATION_SCOPE) === organizationId
    );
  });
  if (all.length === 0) return null;
  all.sort((a, b) => {
    const aTs = Date.parse(a.updatedAt);
    const bTs = Date.parse(b.updatedAt);
    return bTs - aTs;
  });
  return all[0] ?? null;
}

export function upsertDevXeroConnection(
  sessionId: string,
  organizationId: string,
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
  const store = readStore();
  const key = scopedKey(sessionId, organizationId);
  const existing = store[key];
  const next: DevXeroConnection = {
    sessionId,
    organizationId,
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
  store[key] = next;
  writeStore(store);
  return next;
}

export function markDevXeroConnectionSynced(
  sessionId: string,
  organizationId: string = DEV_DEFAULT_ORGANIZATION_SCOPE
): void {
  if (!sessionId) return;
  const store = readStore();
  const key = scopedKey(sessionId, organizationId);
  const existing = store[key] ?? store[sessionId];
  if (!existing) return;
  store[key] = {
    ...existing,
    organizationId: existing.organizationId ?? organizationId,
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function deleteDevXeroConnection(
  sessionId: string,
  organizationId: string = DEV_DEFAULT_ORGANIZATION_SCOPE
): void {
  if (!sessionId) return;
  const store = readStore();
  const key = scopedKey(sessionId, organizationId);
  let changed = false;
  if (key in store) {
    delete store[key];
    changed = true;
  }
  const legacy = store[sessionId];
  if (
    legacy &&
    (!legacy.organizationId ||
      legacy.organizationId === organizationId ||
      organizationId === DEV_DEFAULT_ORGANIZATION_SCOPE)
  ) {
    delete store[sessionId];
    changed = true;
  }
  if (!changed) return;
  writeStore(store);
}
