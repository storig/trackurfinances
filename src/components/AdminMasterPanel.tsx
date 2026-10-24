import React, { useEffect, useState } from 'react';
import {
  ADMIN_DEFAULT_USERNAME,
  EASYPAISA_ACCOUNT_NUMBER,
  EASYPAISA_ACCOUNT_TITLE,
  MONTHLY_SUBSCRIPTION_PRICE_RS,
  UserAccount,
  adminExpireUserSubscription,
  adminResetUserTrial,
  adminVerifyUserSubscription,
  authenticateAdminCredentials,
  evaluateSubscriptionState,
  getRegisteredAccounts,
  isAdminSessionActive,
  setAdminSessionActive,
  syncAllAccountsForAdmin,
} from '../utils/authVault';
import { SUPABASE_SETUP_SQL, getSupabaseConfig } from '../utils/supabaseSync';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

interface AdminMasterPanelProps {
  onExitMasterPanel: () => void;
}

export const AdminMasterPanel: React.FC<AdminMasterPanelProps> = ({
  onExitMasterPanel,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    isAdminSessionActive()
  );
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<UserAccount[]>(() =>
    getRegisteredAccounts()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'pending_verification' | 'active' | 'trial' | 'expired'
  >('ALL');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const supaConfig = getSupabaseConfig();

  const refreshAccountsList = async () => {
    setIsSyncingCloud(true);
    const res = await syncAllAccountsForAdmin();
    setAccounts(res.accounts);
    if (res.tableMissing) {
      setTableMissing(true);
    } else if (res.cloudConnected) {
      setTableMissing(false);
    }
    setIsSyncingCloud(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      void refreshAccountsList();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (authenticateAdminCredentials(adminUser, adminPass)) {
      setAdminSessionActive(true);
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid admin username or password.');
    }
  };

  const handleAdminLogout = () => {
    setAdminSessionActive(false);
    setIsAuthenticated(false);
    setAdminUser('');
    setAdminPass('');
  };

  const handleApproveSubscription = (username: string) => {
    const updated = adminVerifyUserSubscription(username, 30);
    setAccounts(getRegisteredAccounts());
    if (updated) {
      setFeedbackBanner(
        `Verified Rs. ${MONTHLY_SUBSCRIPTION_PRICE_RS.toLocaleString('en-US')} payment for @${username} — 30-Day Monthly Pro subscription is now ACTIVE.`
      );
    }
  };

  const handleResetTrial = (username: string) => {
    const updated = adminResetUserTrial(username);
    setAccounts(getRegisteredAccounts());
    if (updated) {
      setFeedbackBanner(`Reset @${username} to a fresh 7-Day Free Trial.`);
    }
  };

  const handleExpireNow = (username: string) => {
    const updated = adminExpireUserSubscription(username);
    setAccounts(getRegisteredAccounts());
    if (updated) {
      setFeedbackBanner(
        `Expired subscription for @${username}. Account is now locked behind the Easypaisa paywall.`
      );
    }
  };

  const handleCopySql = () => {
    try {
      navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between text-slate-900">
        <header className="bg-[#1b2a4a] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#fce8b2]" />
            <span className="text-sm sm:text-base font-bold tracking-tight">
              Master Admin Panel (/master)
            </span>
          </div>
          <button
            type="button"
            onClick={onExitMasterPanel}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Tracker</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-md">
            <div className="bg-[#1b2a4a] text-white px-5 py-4">
              <div className="text-[11px] font-mono text-[#fce8b2]">
                ADMINISTRATOR VERIFICATION PORTAL
              </div>
              <h1 className="text-base font-bold mt-0.5">
                Sign In to Subscription Admin Panel
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Verify Easypaisa Rs. 1,000/month payments and manage user subscriptions
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="p-5 space-y-4 text-xs">
              {loginError && (
                <div
                  role="alert"
                  className="p-2.5 bg-[#f4cccc] text-[#a50e0e] rounded font-medium"
                >
                  {loginError}
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-username-input"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Admin Username
                </label>
                <input
                  id="admin-username-input"
                  type="text"
                  required
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="Enter admin username"
                  className="w-full px-3 py-2 font-mono bg-[#fff8dc]/70 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Admin Password
                </label>
                <input
                  id="admin-password-input"
                  type="password"
                  required
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-3 py-2 font-mono bg-[#fff8dc]/70 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#1b2a4a] hover:bg-[#2c4268] text-white font-bold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In to Admin Panel</span>
              </button>
            </form>
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
          Ultimate Financial Tracker · Master Admin Portal (/master)
        </footer>
      </div>
    );
  }

  const evaluatedList = accounts.map((acc) => ({
    account: acc,
    evalState: evaluateSubscriptionState(acc),
  }));

  const totalCount = evaluatedList.length;
  const activePaidCount = evaluatedList.filter(
    (item) => item.evalState.effectiveStatus === 'active'
  ).length;
  const pendingCount = evaluatedList.filter(
    (item) =>
      item.account.subscriptionStatus === 'pending_verification' ||
      item.evalState.effectiveStatus === 'pending_verification'
  ).length;
  const trialCount = evaluatedList.filter(
    (item) => item.evalState.effectiveStatus === 'trial'
  ).length;
  const expiredCount = evaluatedList.filter(
    (item) => item.evalState.isPaywallLocked
  ).length;

  const filteredUsers = evaluatedList.filter(({ account, evalState }) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'pending_verification') {
        if (
          account.subscriptionStatus !== 'pending_verification' &&
          evalState.effectiveStatus !== 'pending_verification'
        ) {
          return false;
        }
      } else if (evalState.effectiveStatus !== statusFilter) {
        return false;
      }
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        account.username.toLowerCase().includes(q) ||
        account.displayName.toLowerCase().includes(q) ||
        (account.paymentReferenceNote || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-900">
      {/* Top Admin Header */}
      <header className="bg-[#1b2a4a] text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#fce8b2]" />
          <div>
            <div className="text-sm sm:text-base font-bold tracking-tight">
              Master Subscription Admin Panel (/master)
            </div>
            <div className="text-[11px] text-slate-300">
              Signed in as @{ADMIN_DEFAULT_USERNAME} · Easypaisa {EASYPAISA_ACCOUNT_NUMBER} ({EASYPAISA_ACCOUNT_TITLE}) · Rs. {MONTHLY_SUBSCRIPTION_PRICE_RS}/mo
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAccountsList}
            disabled={isSyncingCloud}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>Sync Cloud Users</span>
          </button>

          <button
            type="button"
            onClick={onExitMasterPanel}
            className="px-3 py-1.5 text-xs font-semibold bg-[#fce8b2] hover:bg-amber-200 text-slate-900 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Open Financial Tracker</span>
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="px-3 py-1.5 text-xs font-semibold bg-[#f4cccc] text-[#a50e0e] hover:bg-red-200 rounded flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Admin Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Feedback Banner */}
        {feedbackBanner && (
          <div
            role="status"
            className="px-4 py-3 bg-[#d9ead3] border border-[#0b8043]/30 text-[#137333] rounded-lg text-xs font-bold flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500 font-medium">Total Registered Users</div>
            <div
              data-testid="admin-total-users"
              className="text-xl font-bold font-mono text-slate-900 mt-1"
            >
              {totalCount}
            </div>
          </div>

          <div className="bg-[#d9ead3]/60 border border-[#0b8043]/25 rounded-lg p-4">
            <div className="text-xs text-[#137333] font-semibold">
              Active Paid (Rs. 1,000/mo)
            </div>
            <div
              data-testid="admin-active-paid"
              className="text-xl font-bold font-mono text-[#137333] mt-1"
            >
              {activePaidCount}
            </div>
          </div>

          <div className="bg-[#fce8b2]/70 border border-amber-300 rounded-lg p-4">
            <div className="text-xs text-amber-950 font-semibold">
              Pending Screenshot Verification
            </div>
            <div className="text-xl font-bold font-mono text-amber-950 mt-1">
              {pendingCount}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-600 font-medium">On 7-Day Free Trial</div>
            <div className="text-xl font-bold font-mono text-[#1b2a4a] mt-1">
              {trialCount}
            </div>
          </div>

          <div className="bg-[#f4cccc]/50 border border-red-200 rounded-lg p-4">
            <div className="text-xs text-[#a50e0e] font-semibold">
              Expired / Paywall Locked
            </div>
            <div className="text-xl font-bold font-mono text-[#a50e0e] mt-1">
              {expiredCount}
            </div>
          </div>
        </div>

        {/* Supabase Cloud Table Setup Notice if needed */}
        {tableMissing && (
          <div className="bg-white border border-amber-300 rounded-lg p-4 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Database className="w-4 h-4 text-amber-600" />
                <span>
                  Supabase Project Connected ({supaConfig.projectRef}.supabase.co) — 1-Time Table Setup
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlSetup((prev) => !prev)}
                className="px-3 py-1 bg-[#1b2a4a] text-white font-semibold rounded cursor-pointer"
              >
                {showSqlSetup ? 'Hide SQL' : 'View 1-Time Setup SQL'}
              </button>
            </div>
            {showSqlSetup && (
              <div className="p-3 bg-slate-900 text-slate-100 rounded font-mono text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#fce8b2]">
                    Run once in Supabase SQL Editor to sync all users across devices:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-emerald-300 text-[10px]">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* User Accounts & Subscription Verification Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search user accounts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search @username, name, reference..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a] w-60"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-200/70 rounded text-xs">
                {(
                  [
                    { id: 'ALL', label: 'All Users' },
                    { id: 'pending_verification', label: 'Pending Verification' },
                    { id: 'active', label: 'Active Paid' },
                    { id: 'trial', label: '7-Day Trial' },
                    { id: 'expired', label: 'Expired / Locked' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 font-medium rounded transition-colors cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Easypaisa: {EASYPAISA_ACCOUNT_NUMBER} ({EASYPAISA_ACCOUNT_TITLE}) · WhatsApp Verification
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2c4268] text-white font-semibold">
                  <th className="py-2.5 px-4 border-r border-slate-600/40">User Account</th>
                  <th className="py-2.5 px-3 border-r border-slate-600/40">Joined Date</th>
                  <th className="py-2.5 px-3 border-r border-slate-600/40">
                    Live Subscription Status
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-600/40">
                    Days Left / Expiry
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-600/40">
                    Payment Reference / WhatsApp Note
                  </th>
                  <th className="py-2.5 px-4 text-right">
                    Admin Subscription Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map(({ account, evalState }) => {
                  const badgeClass =
                    evalState.effectiveStatus === 'active'
                      ? 'bg-[#d9ead3] text-[#137333]'
                      : evalState.effectiveStatus === 'pending_verification' ||
                        account.subscriptionStatus === 'pending_verification'
                      ? 'bg-[#fce8b2] text-amber-950'
                      : evalState.effectiveStatus === 'trial'
                      ? 'bg-blue-50 text-[#1b2a4a]'
                      : 'bg-[#f4cccc] text-[#a50e0e]';

                  const expDate = evalState.expiresAtIso
                    ? new Date(evalState.expiresAtIso).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={account.username} className="hover:bg-slate-50">
                      <td className="py-3 px-4 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{account.displayName}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          @{account.username}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">
                        {new Date(account.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">
                        <span
                          data-testid={`admin-status-${account.username}`}
                          className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] inline-block ${badgeClass}`}
                        >
                          {evalState.statusBadgeText}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono border-r border-slate-200 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {evalState.daysRemaining} days remaining
                        </div>
                        <div className="text-[11px] text-slate-500">Until {expDate}</div>
                      </td>

                      <td className="py-3 px-3 border-r border-slate-200 max-w-xs">
                        {account.paymentReferenceNote ? (
                          <span className="font-mono text-slate-800 bg-[#fff8dc] px-2 py-1 rounded border border-amber-200 inline-block">
                            {account.paymentReferenceNote}
                          </span>
                        ) : (
                          <span className="text-slate-400">No payment note submitted</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveSubscription(account.username)}
                            className="px-3 py-1.5 bg-[#137333] hover:bg-emerald-800 text-white font-bold rounded transition-colors flex items-center gap-1 cursor-pointer"
                            title="Verify Rs. 1,000 Easypaisa screenshot and activate 30-day subscription"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Verify & Start 30d Plan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetTrial(account.username)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer"
                            title="Reset to 7-day free trial"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>7d Trial</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExpireNow(account.username)}
                            className="px-2.5 py-1.5 bg-[#f4cccc]/70 hover:bg-[#f4cccc] text-[#a50e0e] font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer"
                            title="Expire subscription immediately (test paywall)"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Expire / Lock</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
