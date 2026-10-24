import React, { useState } from 'react';
import { DashboardSummary, Transaction } from '../types/finance';
import {
  computeIncomeSavingsLoans,
  formatDateDisplay,
  formatPct,
  formatRs,
} from '../utils/financialEngine';
import { Plus, Trash2 } from 'lucide-react';

interface IncomeSavingsLoansViewProps {
  transactions: Transaction[];
  dashboard: DashboardSummary;
  incomeSources: string[];
  onAddIncomeSource: (name: string) => void;
  onRemoveIncomeSource: (name: string) => void;
}

export const IncomeSavingsLoansView: React.FC<IncomeSavingsLoansViewProps> = ({
  transactions,
  dashboard,
  incomeSources,
  onAddIncomeSource,
  onRemoveIncomeSource,
}) => {
  const [newSourceInput, setNewSourceInput] = useState('');
  const data = computeIncomeSavingsLoans(transactions, dashboard, incomeSources);

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSourceInput.trim();
    if (!trimmed) return;
    onAddIncomeSource(trimmed);
    setNewSourceInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              3. Income Sources, Savings Breakdown & Loans Tracker
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              See where your money came from, how your savings are distributed, and loans you owe vs. money owed to you
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-[#fce8b2]">
            Month: {dashboard.activeMonthLabel}
          </div>
        </div>
      </div>

      {/* Top Grid: Section A (Incoming Breakdown) & Section B (Savings Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Section A: Incoming Sources Breakdown + Individual Entries */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-[#3b5998] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold tracking-wide">
                A. INCOME SOURCES THIS MONTH
              </div>
              <form onSubmit={handleAddSource} className="flex items-center gap-1.5">
                <input
                  type="text"
                  aria-label="Add new income source in Section A"
                  value={newSourceInput}
                  onChange={(e) => setNewSourceInput(e.target.value)}
                  placeholder="Add source (e.g. Rental)"
                  className="px-2 py-1 text-xs bg-[#fff8dc] text-slate-900 placeholder:text-slate-500 rounded border border-slate-300 focus:outline-none w-36 sm:w-44"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-[#1b2a4a] hover:bg-slate-900 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#2c4268] text-white font-semibold">
                    <th className="py-2 px-3 border-r border-slate-600/40">Income Source</th>
                    <th className="py-2 px-2.5 border-r border-slate-600/40 text-center">
                      Entries
                    </th>
                    <th className="py-2 px-3 border-r border-slate-600/40 text-right">
                      This Month (Rs.)
                    </th>
                    <th className="py-2 px-2.5 border-r border-slate-600/40 text-center">% Share</th>
                    <th className="py-2 px-3 text-right">All-Time Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.sourceRows.map((row) => (
                    <tr key={row.source} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-800 bg-[#f8f9fa] border-r border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>{row.source}</span>
                          {incomeSources.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onRemoveIncomeSource(row.source)}
                              title={`Remove income source ${row.source}`}
                              aria-label={`Remove income source ${row.source}`}
                              className="p-1 text-slate-400 hover:text-[#a50e0e] rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums border-r border-slate-200">
                        {row.txCount}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                        {row.monthlyAmount.toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums border-r border-slate-200">
                        {formatPct(row.sharePct)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {row.totalLogged.toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#d9ead3] font-bold text-slate-900">
                    <td className="py-2.5 px-3 border-r border-emerald-300">TOTAL INCOME</td>
                    <td className="py-2.5 px-2.5 text-center font-mono tabular-nums border-r border-emerald-300">
                      {data.totalIncomingTxCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-emerald-300 text-[#137333]">
                      {formatRs(data.totalIncomingMonthly)}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-mono tabular-nums border-r border-emerald-300">
                      {data.totalIncomingMonthly > 0 ? '100.0%' : '0.0%'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#137333]">
                      {formatRs(data.totalIncomingAllTime)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Incoming Entries */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-[#3b5998] text-white px-4 py-2.5 text-xs font-bold tracking-wide">
              INCOME TRANSACTIONS THIS MONTH (SORTED BY DATE)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#2c4268] text-white font-semibold">
                    <th className="py-2 px-3 border-r border-slate-600/40">Date</th>
                    <th className="py-2 px-3 border-r border-slate-600/40">Income Source</th>
                    <th className="py-2 px-3 border-r border-slate-600/40">
                      Description / Person
                    </th>
                    <th className="py-2 px-2.5 border-r border-slate-600/40">Paid Via</th>
                    <th className="py-2 px-3 text-right">Amount In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.incomingEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No income entries in {dashboard.activeMonthLabel}
                      </td>
                    </tr>
                  ) : (
                    data.incomingEntries.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap border-r border-slate-200">
                          {formatDateDisplay(tx.date)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                          {tx.category}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                          {tx.purpose}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 border-r border-slate-200">
                          {tx.method}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-[#137333]">
                          {tx.inAmount.toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section B: Savings Breakdown */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#3b5998] text-white px-4 py-2.5 text-xs font-bold tracking-wide">
            B. HOW YOUR SAVINGS ARE CALCULATED & STORED
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2c4268] text-white font-semibold">
                  <th className="py-2 px-3.5 border-r border-slate-600/40">Savings Breakdown</th>
                  <th className="py-2 px-3.5 border-r border-slate-600/40 text-right">
                    Amount
                  </th>
                  <th className="py-2 px-3.5">Status / Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.savingsMechanics.map((row) => {
                  const rowBg =
                    row.highlight === 'gold'
                      ? 'bg-[#fce8b2] font-bold'
                      : row.highlight === 'green'
                      ? 'bg-[#d9ead3] font-bold'
                      : 'hover:bg-slate-50';
                  return (
                    <tr key={row.metric} className={rowBg}>
                      <td
                        className={`py-2.5 px-3.5 font-bold text-slate-800 border-r border-slate-200 ${
                          row.highlight === 'normal' ? 'bg-[#f8f9fa]' : ''
                        }`}
                      >
                        {row.metric}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900 border-r border-slate-200">
                        {row.valueFormatted}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">{row.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section C: Loans & Gifts Summary + Complete Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#3b5998] text-white px-4 py-2.5 text-xs font-bold tracking-wide">
            C. LOANS & GIFTS SUMMARY (WHAT YOU OWE VS. WHAT OTHERS OWE YOU)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2c4268] text-white font-semibold">
                  <th className="py-2 px-3 border-r border-slate-600/40">Loan / Gift Type</th>
                  <th className="py-2 px-3 border-r border-slate-600/40 text-right">
                    Received (Rs.)
                  </th>
                  <th className="py-2 px-3 border-r border-slate-600/40 text-right">
                    Paid / Given (Rs.)
                  </th>
                  <th className="py-2 px-3 border-r border-slate-600/40 text-right">
                    Current Balance
                  </th>
                  <th className="py-2 px-3 text-right">This Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.dualLoanDimensions.map((dim) => {
                  const netToneClass =
                    dim.tone === 'red'
                      ? 'bg-[#f4cccc] text-[#a50e0e] font-bold'
                      : dim.tone === 'gold'
                      ? 'bg-[#fce8b2] text-slate-900 font-bold'
                      : 'bg-[#d9ead3] text-[#137333] font-bold';
                  return (
                    <tr key={dim.dimension} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800 bg-[#f8f9fa] border-r border-slate-200">
                        {dim.dimension}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                        {dim.totalInflow.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                        {dim.totalOutflow.toLocaleString('en-US')}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums border-r border-slate-200 ${netToneClass}`}
                      >
                        {dim.netPosition.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                        {dim.activeMonthNet.toLocaleString('en-US')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#3b5998] text-white px-4 py-2.5 text-xs font-bold tracking-wide">
            ALL LOAN & GIFT TRANSACTIONS (SORTED BY DATE)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2c4268] text-white font-semibold">
                  <th className="py-2 px-3 border-r border-slate-600/40">Date</th>
                  <th className="py-2 px-3 border-r border-slate-600/40">Type</th>
                  <th className="py-2 px-3 border-r border-slate-600/40">
                    Person / Details
                  </th>
                  <th className="py-2 px-3 border-r border-slate-600/40 text-right">
                    Money In (Rs.)
                  </th>
                  <th className="py-2 px-3 text-right">Money Out (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.loanGiftLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No loan or gift records logged yet
                    </td>
                  </tr>
                ) : (
                  data.loanGiftLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap border-r border-slate-200">
                        {formatDateDisplay(tx.date)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        {tx.category}
                      </td>
                      <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                        {tx.purpose}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-[#137333] font-semibold border-r border-slate-200">
                        {tx.inAmount > 0 ? tx.inAmount.toLocaleString('en-US') : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-[#a50e0e] font-semibold">
                        {tx.outAmount > 0 ? tx.outAmount.toLocaleString('en-US') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
