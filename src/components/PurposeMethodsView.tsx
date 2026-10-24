import React from 'react';
import { DashboardSummary, Transaction } from '../types/finance';
import { computePurposeAndMethods, formatDateDisplay } from '../utils/financialEngine';

interface PurposeMethodsViewProps {
  transactions: Transaction[];
  dashboard: DashboardSummary;
}

export const PurposeMethodsView: React.FC<PurposeMethodsViewProps> = ({
  transactions,
  dashboard,
}) => {
  const pm = computePurposeAndMethods(transactions, dashboard);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              6. Payment Methods (Digital, Cash, Credit) & Biggest Expenses
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Compare how much you use Digital, Cash, and Credit, plus see your most frequent and largest expenses
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-[#fce8b2]">
            Month: {dashboard.activeMonthLabel}
          </div>
        </div>
      </div>

      {/* Section C: Payment Method Analytics at Top for Quick Scannability */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#3b5998] text-white px-5 py-2.5 text-xs font-bold tracking-wide">
          C. PAYMENT METHOD SUMMARY (DIGITAL / CASH / CREDIT)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2c4268] text-white font-semibold">
                <th className="py-2.5 px-4 border-r border-slate-600/40">Payment Method</th>
                <th className="py-2.5 px-4 border-r border-slate-600/40 text-center">
                  Expense Entries
                </th>
                <th className="py-2.5 px-4 border-r border-slate-600/40 text-right">
                  Money In (Rs.)
                </th>
                <th className="py-2.5 px-4 border-r border-slate-600/40 text-right">
                  Money Spent (Rs.)
                </th>
                <th className="py-2.5 px-4 text-right">Net Balance (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {pm.methodRows.map((m) => (
                <tr key={m.method} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-900 bg-[#f8f9fa] border-r border-slate-200">
                    {m.method}
                  </td>
                  <td className="py-2.5 px-4 text-center border-r border-slate-200">
                    {m.txCountOut}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#137333] font-semibold border-r border-slate-200">
                    {m.monthlyIncoming.toLocaleString('en-US')}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#a50e0e] font-semibold border-r border-slate-200">
                    {m.monthlyOutgoing.toLocaleString('en-US')}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-bold ${
                      m.monthlyNetFlow >= 0 ? 'text-[#137333]' : 'text-[#a50e0e]'
                    }`}
                  >
                    {m.monthlyNetFlow.toLocaleString('en-US')}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#fce8b2] font-bold text-slate-900">
                <td className="py-2.5 px-4 font-sans border-r border-amber-300">
                  TOTAL ALL METHODS
                </td>
                <td className="py-2.5 px-4 text-center border-r border-amber-300">
                  {pm.totalMethodStats.txCountOut}
                </td>
                <td className="py-2.5 px-4 text-right border-r border-amber-300">
                  {pm.totalMethodStats.monthlyIncoming.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-4 text-right border-r border-amber-300">
                  {pm.totalMethodStats.monthlyOutgoing.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {pm.totalMethodStats.monthlyNetFlow.toLocaleString('en-US')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sections A & B Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Section A: Grouped Recurring Purposes */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#3b5998] text-white px-4 py-2.5 text-xs font-bold tracking-wide">
            A. REPEATED EXPENSES GROUPED BY DESCRIPTION
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2c4268] text-white font-semibold">
                  <th className="py-2 px-3 border-r border-slate-600/40">Description</th>
                  <th className="py-2 px-3 border-r border-slate-600/40">Category</th>
                  <th className="py-2 px-2.5 border-r border-slate-600/40 text-center">
                    Times Spent
                  </th>
                  <th className="py-2 px-3 border-r border-slate-600/40 text-right">
                    Total Spent (Rs.)
                  </th>
                  <th className="py-2 px-3 text-right">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pm.groupedPurposes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No expenses in {dashboard.activeMonthLabel}
                    </td>
                  </tr>
                ) : (
                  pm.groupedPurposes.map((item) => (
                    <tr key={item.purpose} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-900 border-r border-slate-200">
                        {item.purpose}
                      </td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                        {item.category}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums border-r border-slate-200">
                        {item.frequency}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 border-r border-slate-200">
                        {item.totalSpent.toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {item.avgPerTx.toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section B: Top 20 Largest Single Expenses */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#3b5998] text-white px-4 py-2.5 text-xs font-bold tracking-wide">
            B. TOP 20 BIGGEST SINGLE EXPENSES THIS MONTH
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2c4268] text-white font-semibold">
                  <th className="py-2 px-3 border-r border-slate-600/40">Date</th>
                  <th className="py-2 px-3 border-r border-slate-600/40">Category</th>
                  <th className="py-2 px-3 border-r border-slate-600/40">Description</th>
                  <th className="py-2 px-2.5 border-r border-slate-600/40">Paid Via</th>
                  <th className="py-2 px-3 text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pm.top20Expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No expenses in {dashboard.activeMonthLabel}
                    </td>
                  </tr>
                ) : (
                  pm.top20Expenses.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap border-r border-slate-200">
                        {formatDateDisplay(tx.date)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">
                        {tx.category}
                      </td>
                      <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                        {tx.purpose}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 border-r border-slate-200">
                        {tx.method}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-[#a50e0e]">
                        {tx.outAmount.toLocaleString('en-US')}
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
