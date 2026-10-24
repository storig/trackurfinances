import React from 'react';
import { DashboardSummary, Transaction } from '../types/finance';
import {
  CORE_PILLARS,
  filterTransactionsByMonth,
  formatDateDisplay,
  formatDateShort,
  formatPct,
  formatTimeOnly,
  sortTransactionsIncreasing,
} from '../utils/financialEngine';
import { DropdownOption, SmoothSelect } from './SmoothDropdown';

interface CategoryOrganizerViewProps {
  transactions: Transaction[];
  dashboard: DashboardSummary;
  inspectedCategory: string;
  onSelectCategory: (catName: string) => void;
}

export const CategoryOrganizerView: React.FC<CategoryOrganizerViewProps> = ({
  transactions,
  dashboard,
  inspectedCategory,
  onSelectCategory,
}) => {
  const monthTxs = filterTransactionsByMonth(
    transactions,
    dashboard.activeYear,
    dashboard.activeMonthIndex
  );

  const selectedCatRow =
    dashboard.categoryRows.find((r) => r.name === inspectedCategory) ||
    dashboard.categoryRows[0];

  const activeCategoryName = selectedCatRow ? selectedCatRow.name : inspectedCategory;
  const allocatedLimit = selectedCatRow ? selectedCatRow.allocatedLimit : 1;

  const spotlightTxs = sortTransactionsIncreasing(
    monthTxs.filter((t) => t.category === activeCategoryName)
  );

  const categoryOptions: DropdownOption[] = dashboard.categoryRows.map((c) => ({
    value: c.name,
    label: c.name,
    sublabel: `Spent: Rs. ${c.actualSpent.toLocaleString('en-US')} of Rs. ${c.allocatedLimit.toLocaleString('en-US')}`,
    badgeText: c.isSafe ? 'Within Limit' : 'Over Limit',
    badgeTone: c.isSafe ? 'green' : 'red',
  }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              4. Category Spending Explorer & Top 6 Everyday Categories
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Choose any category to see all its transactions, or view your 6 main everyday categories side by side
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-[#fce8b2]">
            Month: {dashboard.activeMonthLabel}
          </div>
        </div>
      </div>

      {/* Main Split: Left = Spotlight Inspector, Right = 6 Core Lifestyle Pillars */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Category Explorer */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 bg-[#eef2f7] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <label
                htmlFor="spotlight-category-select"
                className="text-xs font-bold text-white bg-[#1b2a4a] px-2.5 py-2 rounded whitespace-nowrap shrink-0"
              >
                Choose Category:
              </label>
              <div className="flex-1 min-w-[160px]">
                <SmoothSelect
                  id="spotlight-category-select"
                  ariaLabel="Choose category to inspect"
                  value={activeCategoryName}
                  options={categoryOptions}
                  onChange={onSelectCategory}
                  searchable={true}
                  searchPlaceholder="Search categories..."
                  variant="amber"
                  menuMinWidth={280}
                />
              </div>
            </div>

            {selectedCatRow && (
              <div
                data-testid="spotlight-status"
                className={`px-3 py-1.5 text-xs font-mono tabular-nums font-bold rounded shrink-0 ${
                  selectedCatRow.isSafe
                    ? 'bg-[#d9ead3] text-[#137333]'
                    : 'bg-[#f4cccc] text-[#a50e0e]'
                }`}
              >
                {selectedCatRow.statusText}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2c4268] text-white font-semibold">
                  <th className="py-2 px-3 border-r border-slate-600/40">Date</th>
                  <th className="py-2 px-2.5 border-r border-slate-600/40">Time</th>
                  <th className="py-2 px-3 border-r border-slate-600/40">
                    Description / Details
                  </th>
                  <th className="py-2 px-2.5 border-r border-slate-600/40">Paid Via</th>
                  <th className="py-2 px-3 border-r border-slate-600/40 text-right">
                    Amount (Rs.)
                  </th>
                  <th className="py-2 px-2.5 text-right">% of Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {spotlightTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No entries in {dashboard.activeMonthLabel} for {activeCategoryName}
                    </td>
                  </tr>
                ) : (
                  spotlightTxs.map((tx) => {
                    const pctOfLimit =
                      allocatedLimit <= 0 ? 0 : tx.outAmount / Math.max(1, allocatedLimit);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap border-r border-slate-200">
                          {formatDateDisplay(tx.date)}
                        </td>
                        <td className="py-2 px-2.5 font-mono tabular-nums whitespace-nowrap text-slate-500 border-r border-slate-200">
                          {formatTimeOnly(tx.entryTime)}
                        </td>
                        <td className="py-2 px-3 text-slate-800 border-r border-slate-200">
                          {tx.purpose}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 border-r border-slate-200">
                          {tx.method}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 border-r border-slate-200">
                          {tx.outAmount.toLocaleString('en-US')}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-600">
                          {formatPct(pctOfLimit)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: 6 Core Lifestyle Pillars Grid (Cols H to P in Sheet 4) */}
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CORE_PILLARS.map((pillarName) => {
            const catStats = dashboard.categoryRows.find((r) => r.name === pillarName);
            const pillarTxs = sortTransactionsIncreasing(
              monthTxs.filter((t) => t.category === pillarName)
            ).slice(0, 9);
            const isSelected = activeCategoryName === pillarName;

            return (
              <div
                key={pillarName}
                className={`bg-white border rounded-lg overflow-hidden transition-colors ${
                  isSelected ? 'border-[#1b2a4a] ring-1 ring-[#1b2a4a]' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory(pillarName)}
                  className="w-full bg-[#1b2a4a] hover:bg-[#2c4268] text-white px-3 py-2 text-xs font-bold tracking-wide text-center transition-colors cursor-pointer"
                >
                  {pillarName.toUpperCase()}
                </button>

                {/* Row r0+1: Limit, Spent, Status */}
                <div className="grid grid-cols-2 divide-x divide-slate-200 bg-[#eef2f7] border-b border-slate-200 text-xs font-mono tabular-nums">
                  <div className="px-2.5 py-1.5 font-bold text-slate-700">
                    Limit: {(catStats?.allocatedLimit ?? 0).toLocaleString('en-US')}
                  </div>
                  <div className="px-2.5 py-1.5 font-bold text-slate-900">
                    Spent: {(catStats?.actualSpent ?? 0).toLocaleString('en-US')}
                  </div>
                </div>
                <div
                  className={`px-2.5 py-1 text-xs font-mono tabular-nums font-bold text-center border-b border-slate-200 ${
                    catStats?.isSafe ?? true
                      ? 'bg-[#d9ead3] text-[#137333]'
                      : 'bg-[#f4cccc] text-[#a50e0e]'
                  }`}
                >
                  {catStats?.statusText ?? 'SAFE (Rs. 0 Left)'}
                </div>

                {/* Transactions Table for Pillar */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#2c4268] text-white font-semibold">
                      <th className="py-1.5 px-2.5 border-r border-slate-600/40">Date</th>
                      <th className="py-1.5 px-2.5 border-r border-slate-600/40">Purpose</th>
                      <th className="py-1.5 px-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pillarTxs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400">
                          No spend yet
                        </td>
                      </tr>
                    ) : (
                      pillarTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-mono tabular-nums whitespace-nowrap text-slate-600 border-r border-slate-200">
                            {formatDateShort(tx.date)}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-800 truncate max-w-[120px] border-r border-slate-200">
                            {tx.purpose}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {tx.outAmount.toLocaleString('en-US')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
