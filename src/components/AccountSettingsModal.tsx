import React, { useState } from 'react';
import {
  EASYPAISA_ACCOUNT_NUMBER,
  EASYPAISA_ACCOUNT_TITLE,
  EvaluatedSubscription,
  MONTHLY_SUBSCRIPTION_PRICE_RS,
  UserAccount,
  submitUserPaymentVerificationRequest,
} from '../utils/authVault';
import { SUPABASE_SETUP_SQL, getSupabaseConfig } from '../utils/supabaseSync';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  CreditCard,
  Database,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Shield,
  User,
  X,
} from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  account: UserAccount;
  subscription: EvaluatedSubscription;
  isOnline: boolean;
  pendingSync: boolean;
  syncStatusMessage: string;
  tableMissing?: boolean;
  onClose: () => void;
  onSyncNow: () => Promise<void>;
  onAccountUpdated: (updated: UserAccount) => void;
  onOpenResetWarning: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  account,
  subscription,
  isOnline,
  pendingSync,
  syncStatusMessage,
  tableMissing,
  onClose,
  onSyncNow,
  onAccountUpdated,
  onOpenResetWarning,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlBox, setShowSqlBox] = useState(false);
  const [paymentRef, setPaymentRef] = useState(account.paymentReferenceNote || '');
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const supaConfig = getSupabaseConfig();

  const handleCopyEasypaisa = () => {
    try {
      navigator.clipboard.writeText(EASYPAISA_ACCOUNT_NUMBER);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // Ignore
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

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = submitUserPaymentVerificationRequest(
      account.username,
      paymentRef.trim() || 'Easypaisa Rs. 1,000 screenshot sent on WhatsApp'
    );
    if (updated) {
      onAccountUpdated(updated);
      setPaymentSubmitted(true);
      setTimeout(() => setPaymentSubmitted(false), 4000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await onSyncNow();
    setIsSyncing(false);
  };

  const formattedExpiry = subscription.expiresAtIso
    ? new Date(subscription.expiresAtIso).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const formattedJoined = new Date(account.createdAt).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const whatsappUrl = `https://wa.me/923355622036?text=${encodeURIComponent(
    `Assalam o Alaikum! I have sent Rs. ${MONTHLY_SUBSCRIPTION_PRICE_RS} to Easypaisa (${EASYPAISA_ACCOUNT_NUMBER} - ${EASYPAISA_ACCOUNT_TITLE}) for my Ultimate Financial Tracker subscription.\nAccount Username: @${account.username}`
  )}`;

  const statusTone =
    subscription.effectiveStatus === 'active'
      ? 'bg-[#d9ead3] text-[#137333]'
      : subscription.effectiveStatus === 'trial'
      ? 'bg-[#fce8b2] text-slate-900'
      : subscription.effectiveStatus === 'pending_verification'
      ? 'bg-amber-100 text-amber-900'
      : 'bg-[#f4cccc] text-[#a50e0e]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-settings-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full overflow-hidden shadow-xl my-auto">
        {/* Header */}
        <div className="bg-[#1b2a4a] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#fce8b2]" />
            <h2 id="account-settings-modal-title" className="text-sm font-bold">
              Account & Live Subscription Details (@{account.username})
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close Account Settings"
            onClick={onClose}
            className="text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs max-h-[82vh] overflow-y-auto">
          {/* 1. Live Subscription Plan Card */}
          <div className="bg-[#eef2f7] border border-slate-300 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#1b2a4a]" />
                <span className="font-bold text-slate-900 text-sm">
                  Live Subscription Plan
                </span>
              </div>
              <span
                data-testid="account-subscription-badge"
                className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${statusTone}`}
              >
                {subscription.statusBadgeText}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-slate-200">
                <div className="text-[11px] text-slate-500">Current Plan</div>
                <div
                  data-testid="account-plan-label"
                  className="font-bold text-slate-900 mt-0.5"
                >
                  {subscription.planLabel}
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-slate-200">
                <div className="text-[11px] text-slate-500">Days Remaining</div>
                <div
                  data-testid="account-days-remaining"
                  className="font-mono font-bold text-sm text-[#1b2a4a] mt-0.5"
                >
                  {subscription.daysRemaining} {subscription.daysRemaining === 1 ? 'Day' : 'Days'}
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-slate-200">
                <div className="text-[11px] text-slate-500">
                  {subscription.effectiveStatus === 'active'
                    ? 'Subscription Valid Until'
                    : 'Free Trial Valid Until'}
                </div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {formattedExpiry}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
              <span>
                Account Holder: <strong>{account.displayName}</strong> (@{account.username}) · Joined{' '}
                {formattedJoined}
              </span>
              <span>Plan Rate: Rs. {MONTHLY_SUBSCRIPTION_PRICE_RS.toLocaleString('en-US')} / month after 7-day trial</span>
            </div>
          </div>

          {/* 2. Easypaisa Subscription Payment & Verification Section */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-xs">
                  Upgrade or Renew Subscription (Rs. 1,000 / month via Easypaisa)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Transfer Rs. 1,000 to Easypaisa and send screenshot on WhatsApp to activate 30 days
                </p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#137333] hover:bg-emerald-800 text-white font-semibold rounded transition-colors inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send Screenshot on WhatsApp</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Service & Rate
                </div>
                <div className="font-bold text-slate-900 mt-0.5">
                  Easypaisa · Rs. 1,000 / month
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Account / WhatsApp Number
                  </div>
                  <div className="font-mono font-bold text-[#1b2a4a] mt-0.5">
                    {EASYPAISA_ACCOUNT_NUMBER}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEasypaisa}
                  className="px-2 py-1 text-[11px] bg-white border border-slate-300 hover:bg-slate-100 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Account Title
                </div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {EASYPAISA_ACCOUNT_TITLE}
                </div>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Enter Easypaisa Trx ID or note after sending WhatsApp screenshot..."
                className="flex-1 px-3 py-1.5 bg-[#fff8dc]/70 border border-slate-300 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#1b2a4a]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#1b2a4a] hover:bg-[#2c4268] text-white font-semibold rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                Notify Admin of Payment
              </button>
            </form>

            {paymentSubmitted && (
              <div className="p-2 bg-[#d9ead3] text-[#137333] rounded font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Payment note saved! Once verified by the admin in /master, your 30-day plan activates automatically.
                </span>
              </div>
            )}
          </div>

          {/* 3. Offline-First & Multi-Device Cloud Sync Status */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Cloud className="w-4 h-4 text-[#137333]" />
                ) : (
                  <CloudOff className="w-4 h-4 text-amber-600" />
                )}
                <div>
                  <div className="font-bold text-slate-900">
                    Offline-First Local + Cloud Database Sync
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Works offline anytime — automatically uploads to cloud ({supaConfig.projectRef}) when connected
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>

            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-700 font-medium">{syncStatusMessage}</span>
              <span
                className={`px-2 py-0.5 rounded font-mono font-semibold ${
                  !isOnline || pendingSync
                    ? 'bg-[#fce8b2] text-slate-900'
                    : 'bg-[#d9ead3] text-[#137333]'
                }`}
              >
                {!isOnline
                  ? 'Offline Queue Active'
                  : pendingSync
                  ? 'Local Backup Saved'
                  : 'Cloud Synced'}
              </span>
            </div>

            {tableMissing && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSqlBox((prev) => !prev)}
                  className="text-[11px] font-semibold text-[#1b2a4a] underline cursor-pointer flex items-center gap-1"
                >
                  <Database className="w-3 h-3" />
                  <span>
                    {showSqlBox
                      ? 'Hide 1-Time Supabase Table SQL'
                      : 'Show 1-Time Supabase Table Setup SQL (for Cross-Device Cloud Sync)'}
                  </span>
                </button>
                {showSqlBox && (
                  <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded font-mono text-[11px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#fce8b2]">
                        Paste once in Supabase SQL Editor ({supaConfig.projectRef}):
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] cursor-pointer"
                      >
                        {copiedSql ? 'Copied SQL!' : 'Copy SQL'}
                      </button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-[10px] leading-relaxed text-emerald-300">
                      {SUPABASE_SETUP_SQL}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Danger Zone: Strict Reset Account Database */}
          <div className="bg-[#f4cccc]/30 border border-red-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-[#a50e0e]">Reset Account Financial Database</div>
              <div className="text-[11px] text-slate-600">
                Requires strict 2-step confirmation and typing your username (@{account.username})
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenResetWarning();
              }}
              className="px-3.5 py-2 bg-[#a50e0e] hover:bg-red-800 text-white font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Account Database...</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#1b2a4a]" />
            <span>Account synced locally & cloud-ready</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b2a4a] hover:bg-[#2c4268] text-white font-semibold rounded cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
