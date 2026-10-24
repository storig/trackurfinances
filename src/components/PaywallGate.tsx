import React, { useState } from 'react';
import {
  EASYPAISA_ACCOUNT_NUMBER,
  EASYPAISA_ACCOUNT_TITLE,
  EvaluatedSubscription,
  MONTHLY_SUBSCRIPTION_PRICE_RS,
  UserAccount,
  submitUserPaymentVerificationRequest,
} from '../utils/authVault';
import {
  CheckCircle2,
  Copy,
  Lock,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';

interface PaywallGateProps {
  account: UserAccount;
  subscription: EvaluatedSubscription;
  onRefreshStatus: () => Promise<void>;
  onAccountUpdated: (updated: UserAccount) => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void;
}

export const PaywallGate: React.FC<PaywallGateProps> = ({
  account,
  subscription,
  onRefreshStatus,
  onAccountUpdated,
  onOpenAccountSettings,
  onSignOut,
}) => {
  const [copied, setCopied] = useState(false);
  const [referenceInput, setReferenceInput] = useState(
    account.paymentReferenceNote || ''
  );
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopyNumber = () => {
    try {
      navigator.clipboard.writeText(EASYPAISA_ACCOUNT_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleMarkPaymentSent = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = submitUserPaymentVerificationRequest(
      account.username,
      referenceInput.trim() || 'Sent Easypaisa Rs. 1,000 screenshot on WhatsApp'
    );
    if (updated) {
      onAccountUpdated(updated);
      setSubmittedNotice(
        'Payment verification request saved! Make sure you have sent your payment screenshot on WhatsApp to 03355622036. Once the admin verifies it in /master, your subscription starts immediately.'
      );
    }
  };

  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    await onRefreshStatus();
    setIsRefreshing(false);
  };

  const whatsappMessage = encodeURIComponent(
    `Assalam o Alaikum! I have transferred Rs. ${MONTHLY_SUBSCRIPTION_PRICE_RS} to Easypaisa (${EASYPAISA_ACCOUNT_NUMBER} - ${EASYPAISA_ACCOUNT_TITLE}) for my Ultimate Financial Tracker subscription.\nUsername: @${account.username}\nReference: ${
      referenceInput.trim() || 'Attached Screenshot'
    }`
  );
  const whatsappUrl = `https://wa.me/923355622036?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between text-slate-900">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold tracking-tight text-[#1b2a4a]">
            Ultimate Financial Tracker
          </span>
          <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#f4cccc] text-[#a50e0e] rounded">
            Subscription Required
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAccountSettings}
            className="px-3 py-1.5 text-xs font-semibold text-[#1b2a4a] bg-[#eef2f7] hover:bg-slate-200 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>@{account.username} · Account Settings</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-1.5 text-xs font-semibold text-[#a50e0e] bg-[#f4cccc]/60 hover:bg-[#f4cccc] rounded transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Paywall Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-md">
          <div className="bg-[#1b2a4a] text-white px-6 py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#fce8b2]">
                <Lock className="w-3.5 h-3.5" />
                <span>7-DAY FREE TRIAL ENDED · ACTIVATE MONTHLY PLAN</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Activate Your Monthly Subscription (Rs. 1,000 / month)
              </h1>
              <p className="text-xs text-slate-300">
                Your financial data for <strong className="font-mono">@{account.username}</strong>{' '}
                is safely stored. Renew your subscription below to unlock full access across all devices.
              </p>
            </div>
            <div className="bg-[#fce8b2] text-slate-900 px-4 py-2.5 rounded-md text-center shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Monthly Subscription
              </div>
              <div className="text-base font-extrabold font-mono">
                Rs. {MONTHLY_SUBSCRIPTION_PRICE_RS.toLocaleString('en-US')} / mo
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 text-xs">
            {/* Easypaisa Payment Box */}
            <div className="bg-[#eef2f7] border border-slate-300 rounded-lg p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#137333]">
                    Step 1 · Send Subscription Payment via Easypaisa
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    Transfer Rs. 1,000 to the Easypaisa account below
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-[#d9ead3] text-[#137333] font-bold rounded text-xs">
                  Easypaisa Transfer
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-500">Payment Service</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">Easypaisa</div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-slate-500">Easypaisa Account Number</div>
                    <div
                      data-testid="easypaisa-number"
                      className="text-sm font-bold font-mono text-[#1b2a4a] mt-0.5"
                    >
                      {EASYPAISA_ACCOUNT_NUMBER}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-500">Account Title</div>
                  <div
                    data-testid="easypaisa-title"
                    className="text-sm font-bold text-slate-900 mt-0.5"
                  >
                    {EASYPAISA_ACCOUNT_TITLE}
                  </div>
                </div>
              </div>

              {/* Step 2: Send Screenshot on WhatsApp */}
              <div className="bg-white p-4 rounded border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#1b2a4a]">
                  Step 2 · Send Payment Screenshot on WhatsApp ({EASYPAISA_ACCOUNT_NUMBER})
                </div>
                <p className="text-slate-600 leading-relaxed">
                  After transferring <strong>Rs. 1,000</strong> to{' '}
                  <strong>{EASYPAISA_ACCOUNT_TITLE}</strong> (
                  <span className="font-mono font-semibold">{EASYPAISA_ACCOUNT_NUMBER}</span>
                  ), send your payment screenshot on WhatsApp to the same number{' '}
                  <span className="font-mono font-semibold">{EASYPAISA_ACCOUNT_NUMBER}</span>{' '}
                  along with your username <strong className="font-mono">@{account.username}</strong>.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#137333] hover:bg-emerald-800 text-white font-bold rounded transition-colors inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Screenshot on WhatsApp ({EASYPAISA_ACCOUNT_NUMBER})</span>
                  </a>
                </div>
              </div>

              {/* Step 3: Notify Admin & Check Verification */}
              <form onSubmit={handleMarkPaymentSent} className="bg-white p-4 rounded border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                  Step 3 · Log Your Payment Reference for Fast Admin Verification
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    placeholder="Optional: Enter Easypaisa Trx ID or sender number..."
                    className="flex-1 px-3 py-2 bg-[#fff8dc]/70 border border-slate-300 rounded font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1b2a4a] hover:bg-[#2c4268] text-white font-semibold rounded transition-colors whitespace-nowrap cursor-pointer"
                  >
                    I Have Sent Payment Screenshot
                  </button>
                </div>

                {submittedNotice && (
                  <div className="p-2.5 bg-[#d9ead3] text-[#137333] rounded font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{submittedNotice}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <ShieldCheck className="w-4 h-4 text-[#1b2a4a]" />
                <span>
                  Status: <strong>{subscription.statusBadgeText}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isRefreshing}
                className="px-4 py-2 bg-[#fce8b2] hover:bg-amber-200 text-slate-900 font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Check Verification Status / Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
        Ultimate Financial Tracker · Easypaisa Subscription Verification ({EASYPAISA_ACCOUNT_NUMBER} — {EASYPAISA_ACCOUNT_TITLE})
      </footer>
    </div>
  );
};
