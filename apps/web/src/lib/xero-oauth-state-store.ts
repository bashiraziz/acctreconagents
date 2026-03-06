type XeroOAuthStateEntry = {
  state: string;
  createdAtMs: number;
  expiresAtMs: number;
};

const STORE_KEY = "__rowshni_xero_oauth_state_store__";
const STATE_TTL_MS = 10 * 60 * 1000;

function getStore(): Map<string, XeroOAuthStateEntry> {
  const globalRef = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, XeroOAuthStateEntry>;
  };
  if (!globalRef[STORE_KEY]) {
    globalRef[STORE_KEY] = new Map<string, XeroOAuthStateEntry>();
  }
  return globalRef[STORE_KEY];
}

function pruneExpiredStates(): void {
  const now = Date.now();
  const store = getStore();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAtMs <= now) {
      store.delete(key);
    }
  }
}

export function rememberXeroOAuthState(state: string): void {
  if (!state) return;
  pruneExpiredStates();
  const now = Date.now();
  getStore().set(state, {
    state,
    createdAtMs: now,
    expiresAtMs: now + STATE_TTL_MS,
  });
}

export function consumeXeroOAuthState(state: string): boolean {
  if (!state) return false;
  pruneExpiredStates();
  const store = getStore();
  const entry = store.get(state);
  if (!entry) return false;
  store.delete(state);
  return entry.expiresAtMs > Date.now();
}

