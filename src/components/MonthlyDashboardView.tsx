import React, { useState } from 'react';
import { CategoryAllocationSlot, DashboardSummary } from '../types/finance';
import { formatPct, formatRs } from '../utils/financialEngine';
import { SmoothCombobox, buildMonthDropdownOptions } from './SmoothDropdown';
import { Plus, Trash2, ArrowUpRight } from 'lucide-react';

interface MonthlyDashboardViewProps {
  dashboard: DashboardSummary;
  categorySlots: CategoryAllocationSlot[];
  incomeSources: string[];
  activeMonthInput: string;
  onActiveMonthChange: (val: string) => void;
  onUpdateCategorySlot: (slotIndex: number, updates: Partial<CategoryAllocationSlot>) => void;
  onAddIncomeSource: (name: string) => void;
  onRemoveIncomeSource: (name: string) => void;
  onInspectCategory: (categoryName: string) => void;
}

export const MonthlyDashboardView: React.FC<MonthlyDashboardViewProps> = ({
  dashboard,
  categorySlots,
  incomeSources,
  activeMonthInput,
  onActiveMonthChange,
  onUpdateCategorySlot,
  onAddIncomeSource,
  onRemoveIncomeSource,
  onInspectCategory,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatPct, setNewCatPct] = useState('5');
  const [newIncomeName, setNewIncomeName] = useState('');

  const emptySlot = categorySlots.find((s) => s.name.trim() === '');
  const monthOptions = buildMonthDropdownOptions(dashboard.activeYear);

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !emptySlot) return;
    const pctNum = parseFloat(newCatPct);
    const validPct = isNaN(pctNum) ? 0.05 : Math.max(0, Math.min(100, pctNum)) / 100;
    onUpdateCategorySlot(emptySlot.slotIndex, {
      name: newCatName.trim(),
      defaultPct: validPct,
    });
    setNewCatName('');
    setNewCatPct('5');
  };

  const handleAddIncomeCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newIncomeName.trim();
    if (!trimmed) return;
    onAddIncomeSource(trimmed);
    setNewIncomeName('');
  };

  const cashflowItems = [
    ...dashboard.incomingSourceBreakdown.map((inc) => ({
      label: inc.name,
      amount: formatRs(inc.amount),
      share: formatPct(inc.share),
      tone: 'neutral' as const,
      isIncomeCategory: true,
      testId: undefined as string | undefined,
    })),
    {
      label: 'TOTAL INCOME',
      amount: formatRs(dashboard.totalIncoming),
      share: formatPct(dashboard.totalIncomingShare),
      tone: 'green' as const,
      isIncomeCategory: false,
      testId: 'dash-total-incoming',
    },
    {
      label: 'TOTAL SPENT',
      amount: formatRs(dashboard.totalSpent),
      share: formatPct(dashboard.totalSpentShare),
      tone: 'red' as const,
      isIncomeCategory: false,
      testId: 'dash-total-spent',
    },
    {
      label: 'NET SAVINGS',
      amount: formatRs(dashboard.netSavings),
      share: formatPct(dashboard.netSavingsShare),
      tone: 'gold' as const,
      isIncomeCategory: false,
      testId: 'dash-net-savings',
    },
    {
      label: 'PLANNED SAVINGS',
      amount: formatRs(dashboard.unallocatedTargetRs),
      share: formatPct(dashboard.unallocatedTargetPct),
      tone: 'card' as const,
      isIncomeCategory: false,
      testId: undefined as string | undefined,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Banner & Row 2 Command Strip */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              2. Monthly Budget & Cashflow Overview
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Track your income, category spending limits, charity goal, loans, and monthly savings in one place
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-[#fce8b2]">
            Showing Summary for: {dashboard.activeMonthLabel}
          </div>
        </div>

        {/* Row 2: Responsive Command Strip - Zero Overlap on Mobile, Tablet & Desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-200 bg-[#eef2f7]">
          {/* Zone A: Viewing Month Smooth Dropdown + Resolved Badge */}
          <div className="xl:col-span-5 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between sm:justify-start gap-2.5 min-w-0">
            <label
              htmlFor="dashboard-month-input"
              className="text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
            >
              Viewing Month:
            </label>
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 justify-end sm:justify-start">
              <div className="w-48 sm:w-52 shrink-0">
                <SmoothCombobox
                  id="dashboard-month-input"
                  ariaLabel="Select or type month to view"
                  value={activeMonthInput}
                  options={monthOptions}
                  onChange={onActiveMonthChange}
                  placeholder="Select month..."
                  menuMinWidth={240}
                />
              </div>
              <div className="px-2.5 py-1.5 bg-[#fce8b2] text-slate-900 font-bold text-xs rounded font-mono tabular-nums whitespace-nowrap shrink-0">
                {dashboard.activeMonthLabel}
              </div>
            </div>
          </div>

          {/* Zone B: Active View Status Banner */}
          <div className="xl:col-span-4 px-4 sm:px-5 py-2.5 xl:py-3 flex items-center justify-center text-xs font-bold text-slate-700 text-center min-w-0 overflow-hidden">
            <span className="truncate">
              {dashboard.isCurrentMonthView
                ? `Showing Current Month: ${dashboard.activeMonthLabel}`
                : `Showing Selected Month: ${dashboard.activeMonthLabel}`}
            </span>
          </div>

          {/* Zone C: Safe to Spend Per Day */}
          <div className="xl:col-span-3 px-4 sm:px-5 py-3 flex items-center justify-between bg-[#d9ead3] min-w-0 overflow-hidden gap-2">
            <span className="text-xs font-semibold text-[#137333] whitespace-nowrap shrink-0">
              Safe to Spend / Day:
            </span>
            <span
              data-testid="daily-safe-spend"
              className="text-sm font-bold text-[#137333] font-mono tabular-nums whitespace-nowrap shrink-0"
            >
              {dashboard.dailySafeSpendText}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: MONTHLY INCOME SOURCES & CASHFLOW SUMMARY (WITH ADD / DELETE INCOME CATEGORIES) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#3b5998] text-white px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold tracking-wide">
              MONTHLY INCOME SOURCES & OVERALL CASHFLOW (ADD OR REMOVE INCOME CATEGORIES)
            </div>
          </div>
          <form
            onSubmit={handleAddIncomeCategorySubmit}
            className="flex flex-wrap items-center gap-2 w-full sm:w-auto"
          >
            <input
              id="add-income-source-input"
              type="text"
              aria-label="New income category name"
              value={newIncomeName}
              onChange={(e) => setNewIncomeName(e.target.value)}
              placeholder="Add income category (e.g. Freelance)"
              className="px-2.5 py-1 text-xs bg-[#fff8dc] text-slate-900 placeholder:text-slate-500 rounded border border-slate-300 focus:outline-none flex-1 sm:w-52"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#1b2a4a] hover:bg-slate-900 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Income Category</span>
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-10 divide-y divide-x divide-slate-200">
          {cashflowItems.map((item) => {
            const headerClass =
              item.tone === 'green'
                ? 'bg-[#d9ead3]/60 text-[#137333]'
                : item.tone === 'red'
                ? 'bg-[#f4cccc]/60 text-[#a50e0e]'
                : item.tone === 'gold'
                ? 'bg-[#fce8b2]/70 text-slate-900'
                : 'bg-[#eef2f7] text-slate-800';

            const amountClass =
              item.tone === 'green'
                ? 'bg-[#d9ead3] text-[#137333]'
                : item.tone === 'red'
                ? 'bg-[#f4cccc] text-[#a50e0e]'
                : item.tone === 'gold'
                ? 'bg-[#fce8b2] text-slate-900'
                : item.tone === 'card'
                ? 'bg-[#eef2f7] text-slate-900'
                : 'bg-white text-slate-900';

            const shareClass =
              item.tone === 'green'
                ? 'font-semibold text-[#137333]'
                : item.tone === 'red'
                ? 'font-semibold text-[#a50e0e]'
                : item.tone === 'gold' || item.tone === 'card'
                ? 'font-semibold text-slate-900'
                : 'text-slate-600';

            return (
              <div key={item.label} className="flex flex-col text-center">
                <div
                  className={`py-2 px-2 text-[11px] font-bold border-b border-slate-200 flex items-center justify-center gap-1 ${headerClass}`}
                  title={item.label}
                >
                  <span className="truncate">{item.label}</span>
                  {item.isIncomeCategory && incomeSources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveIncomeSource(item.label)}
                      title={`Delete income category ${item.label}`}
                      aria-label={`Delete income category ${item.label}`}
                      className="p-0.5 text-slate-400 hover:text-[#a50e0e] rounded transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div
                  data-testid={item.testId}
                  className={`py-2.5 px-2 font-mono tabular-nums text-xs font-bold border-b border-slate-200 whitespace-nowrap ${amountClass}`}
                >
                  {item.amount}
                </div>
                <div
                  className={`py-1.5 px-2 font-mono tabular-nums text-[11px] bg-[#f8f9fa] ${shareClass}`}
                >
                  {item.share}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: CHARITY GOAL, LOANS SUMMARY & TOTAL SAVINGS */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#3b5998] text-white px-4 sm:px-5 py-2.5 text-xs font-bold tracking-wide">
          CHARITY (SADAQAH) GOAL, LOANS SUMMARY & TOTAL SAVINGS
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="flex flex-col">
            <div className="bg-[#eef2f7] px-4 py-2.5 text-xs font-bold text-slate-800 text-center border-b border-slate-200">
              Sadaqah Left to Give (This Month)
            </div>
            <div
              data-testid="dash-sadaqah-goal"
              className="px-4 py-3.5 bg-[#d9ead3] text-[#137333] font-mono tabular-nums text-sm font-bold text-center flex-1 flex items-center justify-center"
            >
              {dashboard.sadaqahGoalText}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="bg-[#eef2f7] px-4 py-2.5 text-xs font-bold text-slate-800 text-center border-b border-slate-200">
              Loans You Owe Others
            </div>
            <div
              data-testid="dash-payable-loans"
              className="px-4 py-3.5 bg-[#f4cccc] text-[#a50e0e] font-mono tabular-nums text-sm font-bold text-center flex-1 flex items-center justify-center"
            >
              {formatRs(dashboard.netPayableLoans)}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="bg-[#eef2f7] px-4 py-2.5 text-xs font-bold text-slate-800 text-center border-b border-slate-200">
              Money Others Owe You
            </div>
            <div
              data-testid="dash-receivable-loans"
              className="px-4 py-3.5 bg-[#fce8b2] text-slate-900 font-mono tabular-nums text-sm font-bold text-center flex-1 flex items-center justify-center"
            >
              {formatRs(dashboard.netReceivableLoans)}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="bg-[#eef2f7] px-4 py-2.5 text-xs font-bold text-slate-800 text-center border-b border-slate-200">
              Total Money Saved
            </div>
            <div
              data-testid="dash-savings-vault"
              className="px-4 py-3.5 bg-[#d9ead3] text-[#137333] font-mono tabular-nums text-sm font-bold text-center flex-1 flex items-center justify-center"
            >
              {formatRs(dashboard.netRetainedSavingsVault)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: MONTHLY BUDGET LIMITS BY CATEGORY */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold tracking-wide">
              MONTHLY BUDGET LIMITS BY CATEGORY (EDIT NAMES OR % ANYTIME)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Click any category name or budget % below to customize your monthly spending limits
            </p>
          </div>

          {emptySlot && (
            <form
              onSubmit={handleAddCustomCategory}
              className="flex flex-wrap items-center gap-2 w-full sm:w-auto"
            >
              <input
                type="text"
                aria-label="New category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Add category (e.g. Healthcare)"
                className="px-2.5 py-1.5 text-xs bg-[#fff8dc] text-slate-900 rounded border border-slate-400 focus:outline-none flex-1 sm:w-48"
              />
              <div className="flex items-center bg-[#fff8dc] text-slate-900 rounded border border-slate-400 px-2 py-1.5">
                <input
                  type="number"
                  aria-label="New category default percentage"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newCatPct}
                  onChange={(e) => setNewCatPct(e.target.value)}
                  className="w-12 text-xs font-mono tabular-nums bg-transparent focus:outline-none text-right"
                />
                <span className="text-xs font-mono ml-0.5">%</span>
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#3b5998] hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </form>
          )}
        </div>

        {/* Mobile View (< 640px): Clean Interactive Cards so nothing is squished on phones */}
        <div className="sm:hidden divide-y divide-slate-200">
          {dashboard.categoryRows.map((row) => (
            <div key={row.slotIndex} className="p-3.5 space-y-2.5 bg-white">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  aria-label={`Mobile category name ${row.name}`}
                  defaultValue={row.name}
                  onBlur={(e) => {
                    const nextName = e.target.value.trim();
                    if (nextName !== row.name) {
                      onUpdateCategorySlot(row.slotIndex, { name: nextName });
                    }
                  }}
                  className="bg-[#fff8dc] px-2.5 py-1 rounded border border-slate-300 font-bold text-xs text-slate-900 flex-1 min-w-0"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="inline-flex items-center bg-[#fff8dc] border border-slate-300 rounded px-2 py-1">
                    <input
                      type="number"
                      aria-label={`Mobile default percentage for ${row.name}`}
                      min="0"
                      max="100"
                      step="0.5"
                      value={Number((row.defaultPct * 100).toFixed(1))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          onUpdateCategorySlot(row.slotIndex, {
                            defaultPct: Math.max(0, Math.min(100, val)) / 100,
                          });
                        }
                      }}
                      className="w-10 text-right font-mono tabular-nums text-xs font-semibold bg-transparent focus:outline-none"
                    />
                    <span className="text-xs font-mono ml-0.5">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspectCategory(row.name)}
                    aria-label={`Inspect ${row.name} mobile`}
                    className="p-1.5 text-slate-500 hover:text-[#1b2a4a] bg-slate-100 rounded"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateCategorySlot(row.slotIndex, { name: '', defaultPct: 0 })
                    }
                    aria-label={`Remove ${row.name} mobile`}
                    className="p-1.5 text-slate-500 hover:text-[#a50e0e] bg-slate-100 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums bg-slate-50 p-2 rounded border border-slate-200/70">
                <div>
                  <div className="text-[10px] font-sans text-slate-500">Limit</div>
                  <div className="font-semibold text-slate-800">
                    Rs. {row.allocatedLimit.toLocaleString('en-US')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-sans text-slate-500">Spent ({row.txCount} entries)</div>
                  <div className="font-bold text-slate-900">
                    Rs. {row.actualSpent.toLocaleString('en-US')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-sans text-slate-500">Remaining</div>
                  <div
                    className={`font-bold ${
                      row.isSafe ? 'text-[#137333]' : 'text-[#a50e0e]'
                    }`}
                  >
                    Rs. {row.remainingOrOver.toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-slate-200 rounded-xs overflow-hidden">
                  <div
                    className={`h-full ${row.isSafe ? 'bg-[#1e8e3e]' : 'bg-[#d93025]'}`}
                    style={{ width: `${Math.round(row.usageRatio * 100)}%` }}
                  />
                </div>
                <span
                  className={`px-2 py-0.5 text-[11px] font-mono tabular-nums font-bold rounded ${
                    row.isSafe
                      ? 'bg-[#d9ead3] text-[#137333]'
                      : 'bg-[#f4cccc] text-[#a50e0e]'
                  }`}
                >
                  {row.statusText}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tablet & Desktop Table View (>= 640px): With explicit min-w on Col A so names NEVER squish */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[960px] text-left border-collapse">
            <thead>
              <tr className="bg-[#2c4268] text-white text-xs font-semibold">
                <th className="py-2.5 px-3.5 border-r border-slate-600/40 min-w-[235px] sticky left-0 z-10 bg-[#2c4268]">
                  Expense Category (Editable)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-center whitespace-nowrap">
                  Budget %
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Monthly Limit (Rs.)
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Spent So Far (Rs.)
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Left / Over Budget
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-center whitespace-nowrap">
                  % of Income
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-center whitespace-nowrap">
                  Entries
                </th>
                <th className="py-2.5 px-3.5 border-r border-slate-600/40 w-36 whitespace-nowrap">
                  Budget Used
                </th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">
                  Budget Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {dashboard.categoryRows.map((row) => (
                <tr key={row.slotIndex} className="hover:bg-slate-50/80 transition-colors">
                  {/* Col A: Editable Category Name - Pinned & Wide so text never truncates to 3 chars */}
                  <td className="py-2 px-3.5 bg-[#fff8dc] border-r border-slate-200 font-bold text-slate-900 min-w-[235px] sticky left-0 z-10">
                    <div className="flex items-center justify-between gap-1.5">
                      <input
                        type="text"
                        aria-label={`Category name ${row.name}`}
                        defaultValue={row.name}
                        onBlur={(e) => {
                          const nextName = e.target.value.trim();
                          if (nextName !== row.name) {
                            onUpdateCategorySlot(row.slotIndex, { name: nextName });
                          }
                        }}
                        className="bg-transparent focus:bg-white px-1.5 py-0.5 rounded border border-transparent focus:border-slate-300 focus:outline-none font-bold text-slate-900 min-w-[155px] w-full"
                      />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onInspectCategory(row.name)}
                          title={`See all ${row.name} transactions`}
                          aria-label={`Inspect ${row.name}`}
                          className="p-1 text-slate-500 hover:text-[#1b2a4a] rounded cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCategorySlot(row.slotIndex, { name: '', defaultPct: 0 })
                          }
                          title={`Remove ${row.name}`}
                          aria-label={`Remove category ${row.name}`}
                          className="p-1 text-slate-500 hover:text-[#a50e0e] rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Col B: Editable Default % */}
                  <td className="py-2 px-2.5 bg-[#fff8dc]/65 border-r border-slate-200 text-center font-mono tabular-nums whitespace-nowrap">
                    <div className="inline-flex items-center justify-center">
                      <input
                        type="number"
                        aria-label={`Default percentage for ${row.name}`}
                        min="0"
                        max="100"
                        step="0.5"
                        value={Number((row.defaultPct * 100).toFixed(1))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateCategorySlot(row.slotIndex, {
                              defaultPct: Math.max(0, Math.min(100, val)) / 100,
                            });
                          }
                        }}
                        className="w-14 text-center font-mono tabular-nums font-semibold bg-white/80 border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#1b2a4a]"
                      />
                      <span className="ml-0.5 text-slate-600">%</span>
                    </div>
                  </td>

                  {/* Col C: Allocated Limit */}
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {row.allocatedLimit.toLocaleString('en-US')}
                  </td>

                  {/* Col D: Actual Spent */}
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {row.actualSpent.toLocaleString('en-US')}
                  </td>

                  {/* Col E: Remaining / Over */}
                  <td
                    className={`py-2 px-3 border-r border-slate-200 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                      row.isSafe
                        ? 'bg-[#d9ead3] text-[#137333]'
                        : 'bg-[#f4cccc] text-[#a50e0e]'
                    }`}
                  >
                    {row.remainingOrOver.toLocaleString('en-US')}
                  </td>

                  {/* Col F: Actual % of Income */}
                  <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatPct(row.actualPctOfIncome)}
                  </td>

                  {/* Col G: Tx Count */}
                  <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {row.txCount}
                  </td>

                  {/* Col H: Progress Bar */}
                  <td className="py-2 px-3.5 border-r border-slate-200">
                    <div className="w-full min-w-[90px] h-3 bg-slate-200 rounded-xs overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          row.isSafe ? 'bg-[#1e8e3e]' : 'bg-[#d93025]'
                        }`}
                        style={{ width: `${Math.round(row.usageRatio * 100)}%` }}
                      />
                    </div>
                  </td>

                  {/* Col I: Budget Status */}
                  <td
                    className={`py-2 px-3.5 text-center font-mono tabular-nums font-bold whitespace-nowrap ${
                      row.isSafe
                        ? 'bg-[#d9ead3] text-[#137333]'
                        : 'bg-[#f4cccc] text-[#a50e0e]'
                    }`}
                  >
                    {row.statusText}
                  </td>
                </tr>
              ))}

              {/* Row 31: TOTAL CATEGORY BUDGETS */}
              <tr className="bg-[#eef2f7] font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-3.5 border-r border-slate-300 sticky left-0 z-10 bg-[#eef2f7]">
                  TOTAL CATEGORY BUDGETS
                </td>
                <td
                  data-testid="dash-total-allocated-pct"
                  className="py-3 px-2.5 border-r border-slate-300 text-center font-mono tabular-nums"
                >
                  {formatPct(dashboard.totalAllocatedPct)}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 text-right font-mono tabular-nums">
                  {dashboard.totalAllocatedLimit.toLocaleString('en-US')}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 text-right font-mono tabular-nums">
                  {dashboard.totalCategorySpent.toLocaleString('en-US')}
                </td>
                <td className="py-3 px-3 border-r border-slate-300 text-right font-mono tabular-nums">
                  {dashboard.totalCategoryRemaining.toLocaleString('en-US')}
                </td>
                <td className="py-3 px-2.5 border-r border-slate-300 text-center font-mono tabular-nums">
                  {formatPct(dashboard.totalCategoryPctOfIncome)}
                </td>
                <td className="py-3 px-2.5 border-r border-slate-300 text-center font-mono tabular-nums">
                  {dashboard.totalCategoryTxCount}
                </td>
                <td className="py-3 px-3.5 border-r border-slate-300">
                  <div className="w-full h-3 bg-slate-300 rounded-xs overflow-hidden">
                    <div
                      className={`h-full ${
                        dashboard.isTotalWithinAllocation ? 'bg-[#1e8e3e]' : 'bg-[#d93025]'
                      }`}
                      style={{
                        width: `${
                          dashboard.totalAllocatedLimit <= 0
                            ? 0
                            : Math.min(
                                100,
                                Math.round(
                                  (dashboard.totalCategorySpent / dashboard.totalAllocatedLimit) *
                                    100
                                )
                              )
                        }%`,
                      }}
                    />
                  </div>
                </td>
                <td className="py-3 px-3.5 text-center font-mono tabular-nums whitespace-nowrap">
                  {dashboard.totalAllocationStatusText}
                </td>
              </tr>

              {/* Row 32: PLANNED MONTHLY SAVINGS GOAL */}
              <tr className="bg-[#fce8b2] font-bold text-slate-900">
                <td className="py-3 px-3.5 border-r border-amber-300 sticky left-0 z-10 bg-[#fce8b2]">
                  PLANNED MONTHLY SAVINGS GOAL
                </td>
                <td
                  data-testid="dash-unallocated-pct"
                  className="py-3 px-2.5 border-r border-amber-300 text-center font-mono tabular-nums"
                >
                  {formatPct(dashboard.unallocatedPlannedPct)}
                </td>
                <td className="py-3 px-3 border-r border-amber-300 text-right font-mono tabular-nums">
                  {dashboard.unallocatedPlannedRs.toLocaleString('en-US')}
                </td>
                <td className="py-3 px-3 border-r border-amber-300 text-right font-mono tabular-nums">
                  {dashboard.actualNetSavingsRs.toLocaleString('en-US')}
                </td>
                <td className="py-3 px-3 border-r border-amber-300 text-right font-mono tabular-nums">
                  {dashboard.savingsDiffRs.toLocaleString('en-US')}
                </td>
                <td className="py-3 px-2.5 border-r border-amber-300 text-center font-mono tabular-nums">
                  {formatPct(dashboard.actualNetSavingsPctOfIncome)}
                </td>
                <td className="py-3 px-2.5 border-r border-amber-300 text-center font-mono tabular-nums">
                  -
                </td>
                <td className="py-3 px-3.5 border-r border-amber-300">
                  <div className="w-full h-3 bg-amber-200 rounded-xs overflow-hidden">
                    <div
                      className={`h-full ${
                        dashboard.savingsTargetMet ? 'bg-[#1e8e3e]' : 'bg-[#d93025]'
                      }`}
                      style={{
                        width: `${
                          dashboard.unallocatedPlannedRs <= 0
                            ? 100
                            : Math.max(
                                0,
                                Math.min(
                                  100,
                                  Math.round(
                                    (dashboard.actualNetSavingsRs /
                                      dashboard.unallocatedPlannedRs) *
                                      100
                                  )
                                )
                              )
                        }%`,
                      }}
                    />
                  </div>
                </td>
                <td className="py-3 px-3.5 text-center font-mono tabular-nums whitespace-nowrap">
                  {dashboard.savingsTargetStatusText}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
