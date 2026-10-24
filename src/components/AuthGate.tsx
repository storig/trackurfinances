import React, { useState } from 'react';
import {
  UserAccount,
  UserVaultData,
  authenticateUserWithCloudFallback,
  getRegisteredAccounts,
  registerUserAccount,
  setActiveSessionUser,
} from '../utils/authVault';
import {
  Lock,
  UserPlus,
  LogIn,
  ShieldCheck,
  ArrowRight,
  Cloud,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface AuthGateProps {
  onAuthenticated: (account: UserAccount, cloudVault?: UserVaultData) => void;
  onOpenAdminPanel: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onAuthenticated,
  onOpenAdminPanel,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [seedDemoData, setSeedDemoData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingAccounts = getRegisteredAccounts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signin') {
      setIsSubmitting(true);
      try {
        const res = await authenticateUserWithCloudFallback(username, password);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        onAuthenticated(res.account, res.vault);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const res = registerUserAccount(username, displayName, password, seedDemoData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAuthenticated(res.account);
    }
  };

  const handleQuickDemoLogin = () => {
    const accounts = getRegisteredAccounts();
    const demo = accounts.find((a) => a.username === 'demo') || accounts[0];
    if (demo) {
      setActiveSessionUser(demo.username);
      onAuthenticated(demo);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      {/* Top Minimal Brand Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <span className="text-sm sm:text-base font-bold tracking-tight text-[#1b2a4a]">
          Ultimate Financial Tracker
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAdminPanel}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-[#1b2a4a] hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            Admin (/master)
          </button>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#1b2a4a] bg-[#eef2f7] hover:bg-slate-200 rounded transition-colors cursor-pointer"
          >
            Instant Demo Workspace
          </button>
        </div>
      </header>

      {/* Main Split Auth Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-10">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-5 bg-[#1b2a4a] text-white p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs font-mono text-[#fce8b2] tracking-wide">
                COMPLETE PERSONAL FINANCE TRACKER
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug text-balance">
                Personal Financial Command Center
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sign in to your private financial space from any phone, tablet, or laptop.
                Each account keeps its own Transaction Log, Custom Income & Expense
                Categories, Monthly Budgets, Charity Goal, Loan Tracker, and 12-Month
                Summary.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-700/80 text-xs text-slate-200">
              <div className="flex items-start gap-2.5">
                <Cloud className="w-4 h-4 text-[#fce8b2] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">
                    Offline-First + Cloud Backup:
                  </span>{' '}
                  Log transactions even without internet. Your records save on your device
                  immediately and automatically sync to the cloud for multi-device access.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#fce8b2] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">7-Day Free Trial:</span> Every
                  new account gets full 7-day access free, then{' '}
                  <span className="font-mono text-[#fce8b2]">Rs. 1,000 / month</span> via
                  Easypaisa.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#fce8b2] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Excel-Ready:</span> Download
                  or upload full <span className="font-mono text-[#fce8b2]">.xlsx</span>{' '}
                  workbooks anytime.
                </div>
              </div>
            </div>

            {/* Quick Demo Access Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="w-full py-2.5 px-4 bg-[#fce8b2] hover:bg-amber-200 text-slate-900 font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Demo Account (Pre-loaded Data)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Sign In / Create Account Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-[#1b2a4a] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#1b2a4a] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account (7-Day Free Trial)</span>
              </button>
            </div>

            {mode === 'signup' && (
              <div className="mb-4 px-3.5 py-2.5 bg-[#eef2f7] border border-slate-200 rounded text-xs text-slate-700 flex items-center justify-between gap-2">
                <span>
                  <strong className="text-[#1b2a4a]">7-Day Free Trial included!</strong>{' '}
                  After 7 days, continue for Rs. 1,000/month via Easypaisa.
                </span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 px-3.5 py-2.5 bg-[#f4cccc]/70 border border-[#a50e0e]/30 text-[#a50e0e] text-xs font-medium rounded"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-username"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Username
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    mode === 'signin' ? 'e.g. demo or your username' : 'e.g. ahmad'
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-[#fff8dc]/60 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-displayname"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Your Name (Optional)
                  </label>
                  <input
                    id="auth-displayname"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Ahmad's Personal Budget"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'signin'
                      ? 'Enter password (demo is demo123)'
                      : 'At least 4 characters'
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-[#fff8dc]/60 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                />
              </div>

              {mode === 'signup' && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seedDemoData}
                      onChange={(e) => setSeedDemoData(e.target.checked)}
                      className="rounded border-slate-300 text-[#1b2a4a] focus:ring-[#1b2a4a]"
                    />
                    <span>Include sample transactions so I can explore how it works</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#1b2a4a] hover:bg-[#2c4268] disabled:opacity-60 text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? 'Checking Account & Cloud Sync...'
                    : mode === 'signin'
                    ? 'Sign In to My Tracker'
                    : 'Start 7-Day Free Trial'}
                </span>
              </button>
            </form>

            {/* Quick Select from Existing Accounts on This Device */}
            {existingAccounts.length > 0 && mode === 'signin' && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 mb-2">
                  Saved Accounts on This Device (Tap to select):
                </div>
                <div className="flex flex-wrap gap-2">
                  {existingAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => {
                        setUsername(acc.username);
                        if (acc.username === 'demo') {
                          setPassword('demo123');
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors cursor-pointer"
                    >
                      {acc.displayName} (@{acc.username})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Ultimate Financial Tracker · Personal Budget, Savings & Expense Planner</span>
        <button
          type="button"
          onClick={onOpenAdminPanel}
          className="text-slate-500 hover:text-[#1b2a4a] underline cursor-pointer flex items-center gap-1"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Admin Verification Portal (/master)</span>
        </button>
      </footer>
    </div>
  );
};
