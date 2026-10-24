import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert, X } from 'lucide-react';

interface ResetConfirmModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (mode: 'empty' | 'sample') => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  username,
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [resetMode, setResetMode] = useState<'empty' | 'sample'>('empty');
  const [typedUsername, setTypedUsername] = useState('');

  if (!isOpen) return null;

  const isUsernameMatched =
    typedUsername.trim().toLowerCase() === username.trim().toLowerCase();

  const handleClose = () => {
    setStep(1);
    setTypedUsername('');
    onClose();
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameMatched) return;
    onConfirmReset(resetMode);
    setStep(1);
    setTypedUsername('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-warning-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-red-200 rounded-lg max-w-md w-full overflow-hidden shadow-xl">
        {/* Red Warning Header */}
        <div className="bg-[#a50e0e] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#fce8b2] shrink-0" />
            <h2 id="reset-warning-modal-title" className="text-sm font-bold">
              {step === 1
                ? 'Warning: Reset Account Financial Database?'
                : 'Final Confirmation: Type Username to Reset'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close Reset Warning Modal"
            onClick={handleClose}
            className="text-red-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3.5 bg-[#f4cccc]/60 border border-[#a50e0e]/30 rounded-md space-y-1.5 text-[#a50e0e]">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Strict Data Loss Warning</span>
              </div>
              <p className="leading-relaxed">
                You are about to reset the financial database for account{' '}
                <strong className="font-mono">@{username}</strong>. This action will
                overwrite your logged transactions, custom category budgets, and income
                sources on this device and in your synced cloud account.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-slate-800">
                Choose how you want to reset your account:
              </div>
              <label className="flex items-start gap-2.5 p-2.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="reset-mode"
                  checked={resetMode === 'empty'}
                  onChange={() => setResetMode('empty')}
                  className="mt-0.5 text-[#a50e0e] focus:ring-[#a50e0e]"
                />
                <div>
                  <div className="font-semibold text-slate-900">
                    Wipe All Transactions (Start Fresh from Rs. 0)
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Clears all logged transactions and resets categories to default
                    percentages.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="reset-mode"
                  checked={resetMode === 'sample'}
                  onChange={() => setResetMode('sample')}
                  className="mt-0.5 text-[#a50e0e] focus:ring-[#a50e0e]"
                />
                <div>
                  <div className="font-semibold text-slate-900">
                    Restore Sample Demo Transactions
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Replaces current entries with sample October 2026 transactions.
                  </div>
                </div>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              >
                Cancel (Keep My Data)
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#a50e0e] hover:bg-red-800 rounded transition-colors cursor-pointer"
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFinalSubmit} className="p-5 space-y-4 text-xs">
            <p className="text-slate-700 leading-relaxed">
              To confirm that you really want to reset the database for{' '}
              <span className="font-mono font-bold text-slate-900">@{username}</span>,
              please type your exact username below:
            </p>

            <div>
              <label
                htmlFor="confirm-reset-username-input"
                className="block font-semibold text-slate-800 mb-1"
              >
                Type <span className="font-mono text-[#a50e0e]">{username}</span> to
                unlock reset:
              </label>
              <input
                id="confirm-reset-username-input"
                type="text"
                autoFocus
                value={typedUsername}
                onChange={(e) => setTypedUsername(e.target.value)}
                placeholder={`Type "${username}" here`}
                className="w-full px-3 py-2 font-mono text-xs bg-[#fff8dc] border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-[#a50e0e]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isUsernameMatched}
                  className={`px-4 py-2 text-xs font-bold rounded transition-colors flex items-center gap-1.5 ${
                    isUsernameMatched
                      ? 'bg-[#a50e0e] hover:bg-red-800 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirm & Reset Database</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
