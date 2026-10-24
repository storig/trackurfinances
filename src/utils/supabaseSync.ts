import { UserAccount, UserVaultData } from './authVault';

const DEFAULT_FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyZW9oaWZ4a3dub3NjeHpnZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTkzMTUsImV4cCI6MjEwODM5NTMxNX0.MtRdTKCtGY9erSEsQcgPiKivHkQEWKOYV-npBmcALTU';

/**
 * Extracts the `ref` claim from a Supabase anon JWT token (e.g. "sreohifxkwnoscxzgfdt")
 * so even if VITE_SUPABASE_URL is set to "https://supabase.co", we resolve the exact
 * project endpoint "https://sreohifxkwnoscxzgfdt.supabase.co".
 */
export function resolveSupabaseProjectUrl(rawUrl?: string, anonKey?: string): string {
  const key = (anonKey || DEFAULT_FALLBACK_ANON_KEY).trim();
  let projectRef = 'sreohifxkwnoscxzgfdt';

  try {
    const parts = key.split('.');
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr =
        typeof atob === 'function'
          ? atob(base64)
          : Buffer.from(base64, 'base64').toString('utf8');
      const payload = JSON.parse(jsonStr);
      if (payload && typeof payload.ref === 'string' && payload.ref.trim() !== '') {
        projectRef = payload.ref.trim();
      }
    }
  } catch {
    // Use fallback projectRef
  }

  const cleanedUrl = (rawUrl || '').trim().replace(/\/+$/, '');
  if (
    !cleanedUrl ||
    cleanedUrl === 'https://supabase.co' ||
    cleanedUrl === 'http://supabase.co' ||
    cleanedUrl.includes('your-project-ref')
  ) {
    return `https://${projectRef}.supabase.co`;
  }

  return cleanedUrl;
}

export function getSupabaseConfig(): { url: string; anonKey: string; projectRef: string } {
  const envUrl =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env.VITE_SUPABASE_URL
      : undefined;
  const envKey =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY
      : undefined;

  const anonKey =
    envKey && !String(envKey).includes('your-supabase-anon-key')
      ? String(envKey).trim()
      : DEFAULT_FALLBACK_ANON_KEY;

  const url = resolveSupabaseProjectUrl(envUrl, anonKey);
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  const projectRef = match ? match[1] : 'sreohifxkwnoscxzgfdt';

  return { url, anonKey, projectRef };
}

export const SUPABASE_SETUP_SQL = `-- Run once in your Supabase SQL Editor to enable cross-device cloud sync:
CREATE TABLE IF NOT EXISTS public.uft_accounts (
  username TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  account_json JSONB NOT NULL,
  vault_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uft_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write for app sync" ON public.uft_accounts;
CREATE POLICY "Allow public read/write for app sync"
  ON public.uft_accounts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);`;

// IndexedDB backup layer so even if localStorage is cleared or offline for days, data stays safe
const IDB_NAME = 'UltimateFinancialTrackerDB';
const IDB_VERSION = 1;

function openLocalIDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'username' });
        }
        if (!db.objectStoreNames.contains('vaults')) {
          db.createObjectStore('vaults', { keyPath: 'username' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveToIndexedDBBackup(
  account: UserAccount,
  vault: UserVaultData
): Promise<void> {
  const db = await openLocalIDB();
  if (!db) return;
  try {
    const tx = db.transaction(['accounts', 'vaults'], 'readwrite');
    tx.objectStore('accounts').put(account);
    tx.objectStore('vaults').put({ username: account.username, ...vault });
  } catch {
    // Ignore IDB errors
  }
}

export async function loadFromIndexedDBBackup(
  username: string
): Promise<{ account: UserAccount | null; vault: UserVaultData | null }> {
  const db = await openLocalIDB();
  if (!db) return { account: null, vault: null };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['accounts', 'vaults'], 'readonly');
      const accReq = tx.objectStore('accounts').get(username);
      const vltReq = tx.objectStore('vaults').get(username);
      tx.oncomplete = () => {
        resolve({
          account: accReq.result || null,
          vault: vltReq.result || null,
        });
      };
      tx.onerror = () => resolve({ account: null, vault: null });
    } catch {
      resolve({ account: null, vault: null });
    }
  });
}

export interface CloudSyncRow {
  username: string;
  display_name: string;
  password_hash: string;
  account_json: UserAccount;
  vault_json: UserVaultData;
  updated_at: string;
}

export interface CloudSyncStatus {
  online: boolean;
  cloudReachable: boolean;
  tableReady: boolean;
  pendingLocalChanges: boolean;
  lastSyncedAt: string | null;
  message: string;
}

export async function pushUserToSupabaseCloud(
  account: UserAccount,
  vault: UserVaultData
): Promise<{ ok: boolean; tableMissing?: boolean; error?: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'Device is currently offline. Saved locally for auto-upload.' };
  }

  const { url, anonKey } = getSupabaseConfig();
  const payload: CloudSyncRow = {
    username: account.username,
    display_name: account.displayName,
    password_hash: account.passwordHash,
    account_json: account,
    vault_json: { ...vault, pendingSync: false },
    updated_at: account.updatedAt || new Date().toISOString(),
  };

  try {
    const res = await fetch(`${url}/rest/v1/uft_accounts?on_conflict=username`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { ok: true };
    }

    const errBody = await res.json().catch(() => ({}));
    if (errBody?.code === 'PGRST205' || String(errBody?.message || '').includes('uft_accounts')) {
      return {
        ok: false,
        tableMissing: true,
        error: 'Supabase connected! Run the 1-time table setup SQL in Supabase to activate cloud storage.',
      };
    }

    return {
      ok: false,
      error: errBody?.message || `Cloud sync returned HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Network unavailable — changes queued locally.',
    };
  }
}

export async function pullUserFromSupabaseCloud(
  username: string
): Promise<{
  ok: boolean;
  row?: CloudSyncRow;
  tableMissing?: boolean;
  error?: string;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'Offline' };
  }

  const { url, anonKey } = getSupabaseConfig();
  const normalized = encodeURIComponent(username.trim().toLowerCase());

  try {
    const res = await fetch(
      `${url}/rest/v1/uft_accounts?username=eq.${normalized}&select=*`,
      {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (errBody?.code === 'PGRST205') {
        return { ok: false, tableMissing: true };
      }
      return { ok: false, error: errBody?.message || `HTTP ${res.status}` };
    }

    const rows = (await res.json()) as CloudSyncRow[];
    if (Array.isArray(rows) && rows.length > 0) {
      return { ok: true, row: rows[0] };
    }
    return { ok: true, row: undefined };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function pullAllUsersFromSupabaseCloud(): Promise<{
  ok: boolean;
  rows: CloudSyncRow[];
  tableMissing?: boolean;
  error?: string;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, rows: [], error: 'Offline' };
  }

  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/uft_accounts?select=*&order=updated_at.desc`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (errBody?.code === 'PGRST205') {
        return { ok: false, rows: [], tableMissing: true };
      }
      return { ok: false, rows: [], error: errBody?.message || `HTTP ${res.status}` };
    }

    const rows = (await res.json()) as CloudSyncRow[];
    return { ok: true, rows: Array.isArray(rows) ? rows : [] };
  } catch (err: any) {
    return { ok: false, rows: [], error: err?.message || 'Network error' };
  }
}
