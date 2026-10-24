import { CategoryAllocationSlot, Transaction } from '../types/finance';
import {
  DEFAULT_CATEGORY_SLOTS,
  DEFAULT_INCOMING_SOURCES,
  sortTransactionsIncreasing,
} from './financialEngine';
import { INITIAL_SEED_TRANSACTIONS } from './seedData';
import {
  loadFromIndexedDBBackup,
  pullAllUsersFromSupabaseCloud,
  pullUserFromSupabaseCloud,
  pushUserToSupabaseCloud,
  saveToIndexedDBBackup,
} from './supabaseSync';

export type SubscriptionStatusType =
  | 'trial'
  | 'active'
  | 'pending_verification'
  | 'expired';

export interface UserAccount {
  username: string; // normalized lowercase key
  displayName: string;
  passwordHash: string;
  createdAt: string;
  trialEndsAt: string; // 7 days after createdAt
  subscriptionStatus: SubscriptionStatusType;
  subscriptionPlan: string; // e.g. '7-Day Free Trial' | 'Monthly Pro (Rs. 1,000/mo)'
  subscriptionEndsAt: string | null;
  lastPaymentVerifiedAt?: string | null;
  paymentReferenceNote?: string;
  updatedAt: string;
}

export interface UserVaultData {
  transactions: Transaction[];
  categorySlots: CategoryAllocationSlot[];
  incomeSources: string[];
  activeMonthInput: string;
  updatedAt?: string;
  pendingSync?: boolean;
}

export interface EvaluatedSubscription {
  effectiveStatus: SubscriptionStatusType;
  isPaywallLocked: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  planLabel: string;
  statusBadgeText: string;
  expiresAtIso: string | null;
}

export const ADMIN_DEFAULT_USERNAME = 'masterdingdong';
export const ADMIN_DEFAULT_PASSWORD = 'dong1234';
export const EASYPAISA_ACCOUNT_NUMBER = '03355622036';
export const EASYPAISA_ACCOUNT_TITLE = 'Xoxo Khan';
export const MONTHLY_SUBSCRIPTION_PRICE_RS = 1000;
export const FREE_TRIAL_DAYS = 7;

const ACCOUNTS_STORAGE_KEY = 'uft_accounts_registry_v1';
const ACTIVE_SESSION_KEY = 'uft_active_session_user_v1';
const ADMIN_SESSION_KEY = 'uft_admin_master_session_v1';
const VAULT_PREFIX = 'uft_user_vault_v1_';

/**
 * Deterministic, synchronous hash for zero-dependency client-side account verification.
 */
export function hashCredential(username: string, password: string): string {
  const input = `uft_salt_v1:${username.trim().toLowerCase()}:${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

function addDaysIso(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  const baseMs = isNaN(d.getTime()) ? Date.now() : d.getTime();
  return new Date(baseMs + days * 24 * 60 * 60 * 1000).toISOString();
}

export function normalizeUserAccount(raw: Partial<UserAccount> & { username: string }): UserAccount {
  const createdAt = raw.createdAt || new Date().toISOString();
  const defaultTrialEnds = addDaysIso(createdAt, FREE_TRIAL_DAYS);
  return {
    username: raw.username.trim().toLowerCase(),
    displayName: raw.displayName || raw.username,
    passwordHash: raw.passwordHash || hashCredential(raw.username, 'demo123'),
    createdAt,
    trialEndsAt: raw.trialEndsAt || defaultTrialEnds,
    subscriptionStatus: raw.subscriptionStatus || 'trial',
    subscriptionPlan:
      raw.subscriptionPlan ||
      (raw.subscriptionStatus === 'active'
        ? 'Monthly Pro (Rs. 1,000/mo)'
        : '7-Day Free Trial'),
    subscriptionEndsAt: raw.subscriptionEndsAt ?? null,
    lastPaymentVerifiedAt: raw.lastPaymentVerifiedAt ?? null,
    paymentReferenceNote: raw.paymentReferenceNote ?? '',
    updatedAt: raw.updatedAt || createdAt,
  };
}

/**
 * Evaluates live subscription state, remaining trial/paid days, and whether the paywall should lock access.
 */
export function evaluateSubscriptionState(
  account: UserAccount,
  now: Date = new Date()
): EvaluatedSubscription {
  const nowMs = now.getTime();

  // If admin explicitly expired the account
  if (account.subscriptionStatus === 'expired') {
    return {
      effectiveStatus: 'expired',
      isPaywallLocked: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      planLabel: account.subscriptionPlan || 'Subscription Expired',
      statusBadgeText: 'Expired — Renewal Required',
      expiresAtIso: account.subscriptionEndsAt || account.trialEndsAt,
    };
  }

  // Check active paid subscription first
  if (account.subscriptionStatus === 'active' && account.subscriptionEndsAt) {
    const endMs = new Date(account.subscriptionEndsAt).getTime();
    if (!isNaN(endMs) && endMs > nowMs) {
      const diffMs = endMs - nowMs;
      const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      const hoursRemaining = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
      return {
        effectiveStatus: 'active',
        isPaywallLocked: false,
        daysRemaining,
        hoursRemaining,
        planLabel: 'Monthly Pro Plan (Rs. 1,000/mo)',
        statusBadgeText: `Active Pro (${daysRemaining}d left)`,
        expiresAtIso: account.subscriptionEndsAt,
      };
    }
  }

  // Otherwise check 7-day free trial window
  const trialEndMs = new Date(account.trialEndsAt).getTime();
  if (!isNaN(trialEndMs) && trialEndMs > nowMs) {
    const diffMs = trialEndMs - nowMs;
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    const hoursRemaining = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
    const isPending = account.subscriptionStatus === 'pending_verification';
    return {
      effectiveStatus: isPending ? 'pending_verification' : 'trial',
      isPaywallLocked: false,
      daysRemaining,
      hoursRemaining,
      planLabel: '7-Day Free Trial',
      statusBadgeText: isPending
        ? `Trial (${daysRemaining}d left) · Payment Sent`
        : `Free Trial (${daysRemaining}d left)`,
      expiresAtIso: account.trialEndsAt,
    };
  }

  // Trial and subscription have both elapsed -> Lock behind paywall
  const isPending = account.subscriptionStatus === 'pending_verification';
  return {
    effectiveStatus: isPending ? 'pending_verification' : 'expired',
    isPaywallLocked: true,
    daysRemaining: 0,
    hoursRemaining: 0,
    planLabel: isPending ? 'Verification Pending (Rs. 1,000/mo)' : '7-Day Free Trial Ended',
    statusBadgeText: isPending ? 'Pending Admin Verification' : 'Trial Expired — Upgrade Required',
    expiresAtIso: account.subscriptionEndsAt || account.trialEndsAt,
  };
}

export function getRegisteredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => normalizeUserAccount(item));
      }
    }
  } catch {
    // Ignore storage read errors
  }

  const nowIso = new Date().toISOString();
  const demoAccount = normalizeUserAccount({
    username: 'demo',
    displayName: 'Demo Account',
    passwordHash: hashCredential('demo', 'demo123'),
    createdAt: nowIso,
    trialEndsAt: addDaysIso(nowIso, FREE_TRIAL_DAYS),
    subscriptionStatus: 'trial',
    subscriptionPlan: '7-Day Free Trial',
    updatedAt: nowIso,
  });

  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([demoAccount]));
  } catch {
    // Ignore
  }
  return [demoAccount];
}

export function saveRegisteredAccounts(accounts: UserAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore
  }
}

export function getAccountByUsername(username: string): UserAccount | null {
  const key = username.trim().toLowerCase();
  const accounts = getRegisteredAccounts();
  return accounts.find((a) => a.username === key) || null;
}

export function updateAccountRecord(
  username: string,
  updater: (current: UserAccount) => UserAccount
): UserAccount | null {
  const key = username.trim().toLowerCase();
  const accounts = getRegisteredAccounts();
  let updatedAccount: UserAccount | null = null;
  const nextAccounts = accounts.map((acc) => {
    if (acc.username !== key) return acc;
    updatedAccount = updater(acc);
    return updatedAccount;
  });

  if (updatedAccount) {
    saveRegisteredAccounts(nextAccounts);
    const vault = loadUserVault(key);
    void saveToIndexedDBBackup(updatedAccount, vault);
    void pushUserToSupabaseCloud(updatedAccount, vault);
  }
  return updatedAccount;
}

export function getActiveSessionUser(): UserAccount | null {
  try {
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      const accounts = getRegisteredAccounts();
      return accounts[0] || null;
    }
    const activeUsername = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!activeUsername) return null;
    const accounts = getRegisteredAccounts();
    return accounts.find((a) => a.username === activeUsername) || null;
  } catch {
    return null;
  }
}

export function setActiveSessionUser(username: string | null): void {
  try {
    if (!username) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } else {
      localStorage.setItem(ACTIVE_SESSION_KEY, username.trim().toLowerCase());
    }
  } catch {
    // Ignore
  }
}

export function registerUserAccount(
  rawUsername: string,
  displayName: string,
  password: string,
  seedDemoTransactions: boolean
): { ok: true; account: UserAccount } | { ok: false; error: string } {
  const username = rawUsername.trim().toLowerCase().replace(/\s+/g, '_');
  if (username.length < 2) {
    return { ok: false, error: 'Username must be at least 2 characters.' };
  }
  if (username === ADMIN_DEFAULT_USERNAME) {
    return { ok: false, error: 'This username is reserved for the system administrator.' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const accounts = getRegisteredAccounts();
  if (accounts.some((a) => a.username === username)) {
    return {
      ok: false,
      error: `Username "${username}" is already registered. Switch to "Sign In" to access it.`,
    };
  }

  const nowIso = new Date().toISOString();
  const newAccount: UserAccount = normalizeUserAccount({
    username,
    displayName: displayName.trim() || rawUsername.trim(),
    passwordHash: hashCredential(username, password),
    createdAt: nowIso,
    trialEndsAt: addDaysIso(nowIso, FREE_TRIAL_DAYS),
    subscriptionStatus: 'trial',
    subscriptionPlan: '7-Day Free Trial',
    subscriptionEndsAt: null,
    updatedAt: nowIso,
  });

  const nextAccounts = [...accounts, newAccount];
  saveRegisteredAccounts(nextAccounts);

  const initialVault: UserVaultData = {
    transactions: seedDemoTransactions ? INITIAL_SEED_TRANSACTIONS : [],
    categorySlots: DEFAULT_CATEGORY_SLOTS,
    incomeSources: [...DEFAULT_INCOMING_SOURCES],
    activeMonthInput: '',
    updatedAt: nowIso,
    pendingSync: true,
  };
  saveUserVault(username, initialVault);
  setActiveSessionUser(username);

  return { ok: true, account: newAccount };
}

export function authenticateUserAccount(
  rawUsername: string,
  password: string
): { ok: true; account: UserAccount } | { ok: false; error: string } {
  const username = rawUsername.trim().toLowerCase();
  if (!username || !password) {
    return { ok: false, error: 'Please enter both username and password.' };
  }

  const accounts = getRegisteredAccounts();
  const account = accounts.find((a) => a.username === username);
  if (!account) {
    return {
      ok: false,
      error: `No account found for "${username}". Switch to "Create New Account" to register it.`,
    };
  }

  const expectedHash = hashCredential(username, password);
  if (account.passwordHash !== expectedHash) {
    return { ok: false, error: 'Incorrect password for this account.' };
  }

  setActiveSessionUser(account.username);
  return { ok: true, account };
}

/**
 * Multi-device cloud-aware sign-in:
 * If the account exists on another device (in Supabase Cloud) or in IndexedDB backup,
 * automatically pulls it onto this device and logs the user in seamlessly!
 */
export async function authenticateUserWithCloudFallback(
  rawUsername: string,
  password: string
): Promise<{ ok: true; account: UserAccount; syncedFromCloud?: boolean } | { ok: false; error: string }> {
  const username = rawUsername.trim().toLowerCase();
  if (!username || !password) {
    return { ok: false, error: 'Please enter both username and password.' };
  }

  const expectedHash = hashCredential(username, password);

  // 1. Try pulling latest account & vault from Supabase Cloud first so cross-device logins always get fresh data
  const cloudRes = await pullUserFromSupabaseCloud(username);
  if (cloudRes.ok && cloudRes.row) {
    const cloudAcc = normalizeUserAccount({
      ...cloudRes.row.account_json,
      username,
      passwordHash: cloudRes.row.password_hash || cloudRes.row.account_json.passwordHash,
    });

    if (cloudAcc.passwordHash !== expectedHash) {
      return { ok: false, error: 'Incorrect password for this account.' };
    }

    // Merge into local accounts registry
    const localAccounts = getRegisteredAccounts();
    const existsLocally = localAccounts.some((a) => a.username === username);
    const nextAccounts = existsLocally
      ? localAccounts.map((a) => (a.username === username ? cloudAcc : a))
      : [...localAccounts, cloudAcc];
    saveRegisteredAccounts(nextAccounts);

    if (cloudRes.row.vault_json) {
      const localVault = loadUserVault(username);
      const cloudTime = new Date(cloudRes.row.updated_at || 0).getTime();
      const localTime = new Date(localVault.updatedAt || 0).getTime();
      if (!existsLocally || !localVault.pendingSync || cloudTime >= localTime) {
        saveUserVault(username, { ...cloudRes.row.vault_json, pendingSync: false }, false);
      }
    }

    setActiveSessionUser(username);
    return { ok: true, account: cloudAcc, syncedFromCloud: true };
  }

  // 2. Check IndexedDB backup if localStorage was cleared
  const idbBackup = await loadFromIndexedDBBackup(username);
  if (idbBackup.account && idbBackup.account.passwordHash === expectedHash) {
    const restoredAcc = normalizeUserAccount(idbBackup.account);
    const localAccounts = getRegisteredAccounts();
    if (!localAccounts.some((a) => a.username === username)) {
      saveRegisteredAccounts([...localAccounts, restoredAcc]);
    }
    if (idbBackup.vault) {
      saveUserVault(username, idbBackup.vault, false);
    }
    setActiveSessionUser(username);
    return { ok: true, account: restoredAcc };
  }

  // 3. Fallback to synchronous local authentication
  return authenticateUserAccount(username, password);
}

export function loadUserVault(username: string): UserVaultData {
  const key = `${VAULT_PREFIX}${username.trim().toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.categorySlots)) {
        return {
          transactions: sortTransactionsIncreasing(parsed.transactions),
          categorySlots:
            parsed.categorySlots.length === 16 ? parsed.categorySlots : DEFAULT_CATEGORY_SLOTS,
          incomeSources:
            Array.isArray(parsed.incomeSources) && parsed.incomeSources.length > 0
              ? parsed.incomeSources
              : [...DEFAULT_INCOMING_SOURCES],
          activeMonthInput:
            typeof parsed.activeMonthInput === 'string' ? parsed.activeMonthInput : '',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          pendingSync: Boolean(parsed.pendingSync),
        };
      }
    }
  } catch {
    // Fallback below
  }

  return {
    transactions: INITIAL_SEED_TRANSACTIONS,
    categorySlots: DEFAULT_CATEGORY_SLOTS,
    incomeSources: [...DEFAULT_INCOMING_SOURCES],
    activeMonthInput: '',
    updatedAt: new Date().toISOString(),
    pendingSync: false,
  };
}

export function saveUserVault(
  username: string,
  vault: UserVaultData,
  triggerCloudPush = true
): void {
  const cleanUser = username.trim().toLowerCase();
  const key = `${VAULT_PREFIX}${cleanUser}`;
  const nowIso = new Date().toISOString();
  const stampedVault: UserVaultData = {
    ...vault,
    incomeSources:
      Array.isArray(vault.incomeSources) && vault.incomeSources.length > 0
        ? vault.incomeSources
        : [...DEFAULT_INCOMING_SOURCES],
    updatedAt: nowIso,
    pendingSync: triggerCloudPush ? true : Boolean(vault.pendingSync),
  };

  try {
    localStorage.setItem(key, JSON.stringify(stampedVault));
  } catch {
    // Ignore quota errors
  }

  const account = getAccountByUsername(cleanUser);
  if (account) {
    const updatedAcc = { ...account, updatedAt: nowIso };
    const accounts = getRegisteredAccounts().map((a) =>
      a.username === cleanUser ? updatedAcc : a
    );
    saveRegisteredAccounts(accounts);
    void saveToIndexedDBBackup(updatedAcc, stampedVault);

    if (triggerCloudPush && typeof navigator !== 'undefined' && navigator.onLine) {
      void pushUserToSupabaseCloud(updatedAcc, stampedVault).then((res) => {
        if (res.ok) {
          try {
            localStorage.setItem(
              key,
              JSON.stringify({ ...stampedVault, pendingSync: false })
            );
          } catch {
            // Ignore
          }
        }
      });
    }
  }
}

/**
 * Synchronizes a specific user's local vault and subscription state with Supabase Cloud.
 */
export async function syncUserAccountWithCloud(username: string): Promise<{
  ok: boolean;
  account: UserAccount | null;
  vault: UserVaultData;
  tableMissing?: boolean;
  message: string;
}> {
  const cleanUser = username.trim().toLowerCase();
  let localAcc = getAccountByUsername(cleanUser);
  let localVault = loadUserVault(cleanUser);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      account: localAcc,
      vault: localVault,
      message: 'Offline mode — changes are safely stored locally and will upload when online.',
    };
  }

  const cloudRes = await pullUserFromSupabaseCloud(cleanUser);
  if (cloudRes.tableMissing) {
    return {
      ok: false,
      account: localAcc,
      vault: localVault,
      tableMissing: true,
      message: 'Saved locally. Run the 1-time Supabase table SQL in Admin / Account Settings to enable cloud storage.',
    };
  }

  if (cloudRes.ok && cloudRes.row) {
    const cloudAcc = normalizeUserAccount(cloudRes.row.account_json);
    const cloudVault = cloudRes.row.vault_json;

    // Always respect newer subscription status from Admin verification in Cloud
    const cloudTime = new Date(cloudAcc.updatedAt || cloudRes.row.updated_at || 0).getTime();
    const localTime = new Date(localAcc?.updatedAt || 0).getTime();

    if (!localAcc || cloudTime > localTime) {
      localAcc = cloudAcc;
      const all = getRegisteredAccounts();
      const next = all.some((a) => a.username === cleanUser)
        ? all.map((a) => (a.username === cleanUser ? cloudAcc : a))
        : [...all, cloudAcc];
      saveRegisteredAccounts(next);
    }

    if (!localVault.pendingSync && cloudVault && cloudTime > localTime) {
      localVault = {
        transactions: sortTransactionsIncreasing(cloudVault.transactions || []),
        categorySlots:
          Array.isArray(cloudVault.categorySlots) && cloudVault.categorySlots.length === 16
            ? cloudVault.categorySlots
            : DEFAULT_CATEGORY_SLOTS,
        incomeSources:
          Array.isArray(cloudVault.incomeSources) && cloudVault.incomeSources.length > 0
            ? cloudVault.incomeSources
            : [...DEFAULT_INCOMING_SOURCES],
        activeMonthInput: cloudVault.activeMonthInput || '',
        updatedAt: cloudVault.updatedAt || cloudAcc.updatedAt,
        pendingSync: false,
      };
      saveUserVault(cleanUser, localVault, false);
    }
  }

  if (localAcc) {
    const pushRes = await pushUserToSupabaseCloud(localAcc, localVault);
    if (pushRes.ok) {
      localVault = { ...localVault, pendingSync: false };
      saveUserVault(cleanUser, localVault, false);
      return {
        ok: true,
        account: localAcc,
        vault: localVault,
        message: 'Synced with Supabase Cloud across all devices.',
      };
    }
    if (pushRes.tableMissing) {
      return {
        ok: false,
        account: localAcc,
        vault: localVault,
        tableMissing: true,
        message: pushRes.error || 'Supabase table setup needed.',
      };
    }
  }

  return {
    ok: false,
    account: localAcc,
    vault: localVault,
    message: 'Saved locally on device.',
  };
}

/**
 * Pulls all cloud users and pushes any local accounts so the `/master` Admin Panel sees every user.
 */
export async function syncAllAccountsForAdmin(): Promise<{
  accounts: UserAccount[];
  cloudConnected: boolean;
  tableMissing?: boolean;
}> {
  const localAccounts = getRegisteredAccounts();
  const pullRes = await pullAllUsersFromSupabaseCloud();

  if (!pullRes.ok) {
    return {
      accounts: localAccounts,
      cloudConnected: false,
      tableMissing: pullRes.tableMissing,
    };
  }

  const mergedMap = new Map<string, UserAccount>();
  localAccounts.forEach((acc) => mergedMap.set(acc.username, acc));

  pullRes.rows.forEach((row) => {
    if (!row.account_json) return;
    const cloudAcc = normalizeUserAccount(row.account_json);
    const existing = mergedMap.get(cloudAcc.username);
    if (!existing) {
      mergedMap.set(cloudAcc.username, cloudAcc);
      if (row.vault_json) {
        saveUserVault(cloudAcc.username, { ...row.vault_json, pendingSync: false }, false);
      }
    } else {
      const cloudTime = new Date(cloudAcc.updatedAt || row.updated_at || 0).getTime();
      const localTime = new Date(existing.updatedAt || 0).getTime();
      if (cloudTime >= localTime) {
        mergedMap.set(cloudAcc.username, cloudAcc);
      }
    }
  });

  const mergedList = Array.from(mergedMap.values());
  saveRegisteredAccounts(mergedList);

  // Also ensure any local-only accounts are pushed to Cloud
  for (const acc of mergedList) {
    const v = loadUserVault(acc.username);
    void pushUserToSupabaseCloud(acc, v);
  }

  return {
    accounts: mergedList,
    cloudConnected: true,
    tableMissing: false,
  };
}

/**
 * User action: Submit Easypaisa payment screenshot notification / transaction reference.
 */
export function submitUserPaymentVerificationRequest(
  username: string,
  referenceNote: string
): UserAccount | null {
  const nowIso = new Date().toISOString();
  return updateAccountRecord(username, (acc) => ({
    ...acc,
    subscriptionStatus:
      acc.subscriptionStatus === 'active' ? 'active' : 'pending_verification',
    paymentReferenceNote:
      referenceNote.trim() || `Screenshot sent on WhatsApp (${new Date().toLocaleDateString()})`,
    updatedAt: nowIso,
  }));
}

/**
 * Admin actions in `/master` panel:
 */
export function authenticateAdminCredentials(username: string, password: string): boolean {
  return (
    username.trim().toLowerCase() === ADMIN_DEFAULT_USERNAME &&
    password === ADMIN_DEFAULT_PASSWORD
  );
}

export function isAdminSessionActive(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminSessionActive(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {
    // Ignore
  }
}

export function adminVerifyUserSubscription(
  username: string,
  durationDays = 30
): UserAccount | null {
  const nowIso = new Date().toISOString();
  return updateAccountRecord(username, (acc) => {
    const currentEndMs = acc.subscriptionEndsAt
      ? new Date(acc.subscriptionEndsAt).getTime()
      : 0;
    const baseIso =
      currentEndMs > Date.now() ? new Date(currentEndMs).toISOString() : nowIso;
    return {
      ...acc,
      subscriptionStatus: 'active',
      subscriptionPlan: 'Monthly Pro (Rs. 1,000/mo)',
      subscriptionEndsAt: addDaysIso(baseIso, durationDays),
      lastPaymentVerifiedAt: nowIso,
      updatedAt: nowIso,
    };
  });
}

export function adminResetUserTrial(username: string): UserAccount | null {
  const nowIso = new Date().toISOString();
  return updateAccountRecord(username, (acc) => ({
    ...acc,
    subscriptionStatus: 'trial',
    subscriptionPlan: '7-Day Free Trial',
    trialEndsAt: addDaysIso(nowIso, FREE_TRIAL_DAYS),
    subscriptionEndsAt: null,
    updatedAt: nowIso,
  }));
}

export function adminExpireUserSubscription(username: string): UserAccount | null {
  const nowIso = new Date().toISOString();
  const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return updateAccountRecord(username, (acc) => ({
    ...acc,
    subscriptionStatus: 'expired',
    trialEndsAt: pastIso,
    subscriptionEndsAt: pastIso,
    updatedAt: nowIso,
  }));
}
