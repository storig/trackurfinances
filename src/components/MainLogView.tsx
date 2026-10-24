import React, { useState } from 'react';
import {
  CategoryAllocationSlot,
  DashboardSummary,
  FlowType,
  PaymentMethod,
  Transaction,
} from '../types/finance';
import {
  INCOMING_SOURCES,
  formatDateDisplay,
  formatEntryTimestamp,
  formatRs,
  matchCategoryInPlace,
  parseSmartDateInPlace,
  parseSmartMethodInPlace,
} from '../utils/financialEngine';
import {
  FLOW_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  SmoothCombobox,
  SmoothSelect,
  buildCategoryDropdownOptions,
} from './SmoothDropdown';
import { ArrowDownRight, ArrowUpRight, Plus, Search, Trash2, Info } from 'lucide-react';

interface MainLogViewProps {
  transactions: Transaction[];
  categorySlots: CategoryAllocationSlot[];
  incomeSources: string[];
  dashboard: DashboardSummary;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const MainLogView: React.FC<MainLogViewProps> = ({
  transactions,
  categorySlots,
  incomeSources,
  dashboard,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const [rawDate, setRawDate] = useState('');
  const [rawCategory, setRawCategory] = useState('');
  const [flowType, setFlowType] = useState<'' | FlowType>('');
  const [purpose, setPurpose] = useState('');
  const [rawMethod, setRawMethod] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [flowFilter, setFlowFilter] = useState<'ALL' | FlowType>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');

  const activeExpenseNames = categorySlots
    .map((s) => s.name.trim())
    .filter((n) => n !== '');

  const categoryDropdownOptions = buildCategoryDropdownOptions(
    activeExpenseNames,
    incomeSources
  );

  const previewDate = parseSmartDateInPlace(
    rawDate,
    dashboard.activeYear,
    dashboard.activeMonthIndex
  );
  const previewCategoryMatch = matchCategoryInPlace(rawCategory, categorySlots, incomeSources);
  const resolvedCategoryName = previewCategoryMatch ? previewCategoryMatch.name : rawCategory.trim();
  const isCustomIncome = incomeSources.some(
    (inc) => inc.trim().toLowerCase() === resolvedCategoryName.toLowerCase()
  );
  const resolvedFlowType: FlowType =
    flowType !== ''
      ? flowType
      : previewCategoryMatch
      ? previewCategoryMatch.flow
      : isCustomIncome || INCOMING_SOURCES.includes(resolvedCategoryName as any)
      ? 'Incoming'
      : 'Outgoing';
  const resolvedMethod = rawMethod.trim() ? parseSmartMethodInPlace(rawMethod) : 'Digital';

  const handleCategoryChange = (val: string) => {
    setRawCategory(val);
    const matched = matchCategoryInPlace(val, categorySlots, incomeSources);
    if (matched) {
      setFlowType(matched.flow);
    }
  };

  const handleCategoryBlur = () => {
    if (!rawCategory.trim()) return;
    const matched = matchCategoryInPlace(rawCategory, categorySlots, incomeSources);
    if (matched) {
      setRawCategory(matched.name);
      setFlowType(matched.flow);
    }
  };

  const handleMethodBlur = () => {
    if (!rawMethod.trim()) return;
    setRawMethod(parseSmartMethodInPlace(rawMethod));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);

    const numericAmount = parseFloat(amountInput.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Please enter a valid positive amount in Rs.');
      return;
    }

    const finalCatMatch = matchCategoryInPlace(rawCategory, categorySlots, incomeSources);
    const finalCategory = finalCatMatch ? finalCatMatch.name : rawCategory.trim();
    if (!finalCategory) {
      setFormError('Please choose or type a Category or Income Source.');
      return;
    }

    const isInc = incomeSources.some(
      (inc) => inc.trim().toLowerCase() === finalCategory.toLowerCase()
    );
    const finalFlow: FlowType = finalCatMatch
      ? finalCatMatch.flow
      : isInc || INCOMING_SOURCES.includes(finalCategory as any)
      ? 'Incoming'
      : flowType || 'Outgoing';

    const parsedDate = parseSmartDateInPlace(
      rawDate,
      dashboard.activeYear,
      dashboard.activeMonthIndex
    );

    if (parsedDate.monthChanged) {
      setFormNotice(
        `Note: Entries in this log belong to ${dashboard.activeMonthLabel}. Date was kept in ${parsedDate.displayLabel}.`
      );
    }

    const now = new Date();
    const [yr, mo, dy] = parsedDate.dateStr.split('-').map(Number);
    const stampedTime = new Date(
      yr,
      mo - 1,
      dy,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ).toISOString();

    const finalMethod = rawMethod.trim()
      ? parseSmartMethodInPlace(rawMethod)
      : 'Digital';

    onAddTransaction({
      entryTime: stampedTime,
      date: parsedDate.dateStr,
      flowType: finalFlow,
      category: finalCategory,
      purpose: purpose.trim() || `${finalCategory} Entry`,
      method: finalMethod,
      inAmount: finalFlow === 'Incoming' ? Math.round(numericAmount) : 0,
      outAmount: finalFlow === 'Outgoing' ? Math.round(numericAmount) : 0,
    });

    setAmountInput('');
    setPurpose('');
    setRawDate('');
    setRawCategory('');
    setRawMethod('');
    setFlowType('');
  };

  const totalLoggedCount = transactions.length;
  const totalIncomingAll = transactions.reduce((acc, t) => acc + t.inAmount, 0);
  const totalOutgoingAll = transactions.reduce((acc, t) => acc + t.outAmount, 0);
  const netMonthlySavingsAll = totalIncomingAll - totalOutgoingAll;

  const filteredTransactions = transactions.filter((t) => {
    if (flowFilter !== 'ALL' && t.flowType !== flowFilter) return false;
    if (methodFilter !== 'ALL' && t.method !== methodFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchCat = t.category.toLowerCase().includes(q);
      const matchPurp = t.purpose.toLowerCase().includes(q);
      const matchDate = formatDateDisplay(t.date).toLowerCase().includes(q);
      if (!matchCat && !matchPurp && !matchDate) return false;
    }
    return true;
  });

  const shortcutHint =
    previewCategoryMatch &&
    previewCategoryMatch.name.toLowerCase() !== rawCategory.trim().toLowerCase()
      ? {
          matchedLabel: previewCategoryMatch.name,
          badgeText: previewCategoryMatch.flow === 'Incoming' ? 'Money In' : 'Expense',
          badgeTone:
            previewCategoryMatch.flow === 'Incoming' ? ('green' as const) : ('red' as const),
        }
      : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Sheet Header Banner & KPI Strip */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              1. Monthly Transactions Log
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              All income and expenses sorted by date · Active Month: {dashboard.activeMonthLabel}
            </p>
          </div>
          <div className="text-xs text-slate-200 font-mono tabular-nums">
            Month: {dashboard.activeMonthLabel}
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x divide-slate-200 bg-[#eef2f7]">
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Total Entries</span>
            <span
              data-testid="mainlog-tx-count"
              className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums"
            >
              {totalLoggedCount.toLocaleString('en-US')}
            </span>
          </div>
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Total Money In</span>
            <span
              data-testid="mainlog-total-in"
              className="text-sm sm:text-base font-bold text-[#137333] font-mono tabular-nums whitespace-nowrap"
            >
              {formatRs(totalIncomingAll)}
            </span>
          </div>
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Total Spent</span>
            <span
              data-testid="mainlog-total-out"
              className="text-sm sm:text-base font-bold text-[#a50e0e] font-mono tabular-nums whitespace-nowrap"
            >
              {formatRs(totalOutgoingAll)}
            </span>
          </div>
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2 bg-[#d9ead3]/60">
            <span className="text-xs font-semibold text-[#137333]">Net Savings</span>
            <span
              data-testid="mainlog-net-savings"
              className="text-sm sm:text-base font-bold text-[#137333] font-mono tabular-nums whitespace-nowrap"
            >
              {formatRs(netMonthlySavingsAll)}
            </span>
          </div>
        </div>
      </div>

      {/* Add New Transaction Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Add a New Transaction
            </h3>
            <span className="text-xs text-slate-500">
              · Pick from the dropdowns below, or type quick shortcuts like "yesterday", "sal" (Salary), or "fod" (Food)
            </span>
          </div>
          <div className="text-xs text-slate-600 font-mono tabular-nums bg-slate-100 px-2.5 py-1 rounded">
            Preview: {previewDate.displayLabel} ·{' '}
            {resolvedFlowType === 'Incoming' ? 'Money In' : 'Money Out'} ·{' '}
            {resolvedCategoryName || '—'} · {resolvedMethod}
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="px-3.5 py-2.5 bg-[#f4cccc]/60 border border-[#a50e0e]/30 text-[#a50e0e] text-xs font-medium rounded"
          >
            {formError}
          </div>
        )}

        {formNotice && (
          <div
            role="status"
            className="px-3.5 py-2.5 bg-[#fce8b2]/70 border border-amber-400/50 text-amber-950 text-xs font-medium rounded flex items-center gap-2"
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{formNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-3 items-end">
          {/* Date */}
          <div className="md:col-span-2 lg:col-span-2">
            <label
              htmlFor="tx-date-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Date (Blank = Today)
            </label>
            <input
              id="tx-date-input"
              type="text"
              value={rawDate}
              onChange={(e) => setRawDate(e.target.value)}
              placeholder="e.g. 15, yesterday, today"
              className="w-full px-3 py-2 text-xs font-mono bg-[#fff8dc]/80 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
            />
          </div>

          {/* Category / Income Source with SmoothCombobox */}
          <div className="md:col-span-2 lg:col-span-3">
            <label
              htmlFor="tx-category-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Category or Income Source
            </label>
            <SmoothCombobox
              id="tx-category-input"
              ariaLabel="Category or Income Source"
              value={rawCategory}
              options={categoryDropdownOptions}
              onChange={handleCategoryChange}
              onBlur={handleCategoryBlur}
              resolvedShortcutHint={shortcutHint}
              placeholder="Choose or type e.g. Food, Salary..."
              menuMinWidth={270}
            />
          </div>

          {/* Transaction Type (Flow) */}
          <div className="md:col-span-2 lg:col-span-2">
            <label
              htmlFor="tx-flow-select"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Type
            </label>
            <SmoothSelect
              id="tx-flow-select"
              ariaLabel="Transaction Type"
              value={flowType}
              options={FLOW_TYPE_OPTIONS}
              onChange={(val) => setFlowType(val as FlowType)}
              placeholder="Auto / Select type..."
              variant="default"
              menuMinWidth={230}
            />
          </div>

          {/* Description / Person */}
          <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
            <label
              htmlFor="tx-purpose-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Description / Person
            </label>
            <input
              id="tx-purpose-input"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Groceries, Lent to Bilal..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
            />
          </div>

          {/* Payment Method with SmoothCombobox */}
          <div className="md:col-span-2 lg:col-span-1">
            <label
              htmlFor="tx-method-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Paid Via
            </label>
            <SmoothCombobox
              id="tx-method-input"
              ariaLabel="Payment Method"
              value={rawMethod}
              options={PAYMENT_METHOD_OPTIONS}
              onChange={(val) => setRawMethod(val)}
              onBlur={handleMethodBlur}
              placeholder="Digital / Cash / Credit"
              menuMinWidth={230}
            />
          </div>

          {/* Amount (Rs.) + Submit */}
          <div className="sm:col-span-2 md:col-span-2 lg:col-span-2 flex gap-2">
            <div className="flex-1">
              <label
                htmlFor="tx-amount-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Amount (Rs.)
              </label>
              <input
                id="tx-amount-input"
                type="number"
                min="1"
                step="any"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#fff8dc]/80 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1b2a4a] hover:bg-[#2c4268] text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 h-[34px] self-end cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </form>

      {/* Filter & Search Bar + Transaction Log Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search transactions"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search category, description, date..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a] w-full sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded">
              {(['ALL', 'Incoming', 'Outgoing'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFlowFilter(f)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    flowFilter === f
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'Incoming' ? 'Money In' : 'Money Out'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded">
              {(['ALL', 'Digital', 'Cash', 'Credit'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    methodFilter === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m === 'ALL' ? 'All Methods' : m}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Showing {filteredTransactions.length} of {transactions.length} entries
          </div>
        </div>

        {/* Mobile Transaction Cards (< 640px) with Smooth Dropdown Editing */}
        <div className="sm:hidden divide-y divide-slate-200">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-slate-500">
              No matching transactions found.
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-3.5 space-y-2.5 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-xs font-bold text-slate-800">
                      {formatDateDisplay(tx.date)}
                    </span>
                    <span className="text-[11px] text-slate-400">·</span>
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                        tx.flowType === 'Incoming' ? 'text-[#137333]' : 'text-[#a50e0e]'
                      }`}
                    >
                      {tx.flowType === 'Incoming' ? 'Money In' : 'Expense'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono tabular-nums text-xs font-bold ${
                        tx.inAmount > 0 ? 'text-[#137333]' : 'text-[#a50e0e]'
                      }`}
                    >
                      {tx.inAmount > 0
                        ? `+Rs. ${tx.inAmount.toLocaleString('en-US')}`
                        : `-Rs. ${tx.outAmount.toLocaleString('en-US')}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx.id)}
                      aria-label={`Delete mobile transaction ${tx.purpose}`}
                      className="p-1 text-slate-400 hover:text-[#a50e0e]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-900">{tx.purpose}</div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <SmoothSelect
                    ariaLabel={`Mobile category for ${tx.purpose}`}
                    value={tx.category}
                    options={categoryDropdownOptions}
                    searchable={true}
                    searchPlaceholder="Find category..."
                    size="sm"
                    variant="amber"
                    onChange={(newCat) => {
                      const isInc =
                        incomeSources.some(
                          (inc) => inc.trim().toLowerCase() === newCat.toLowerCase()
                        ) || INCOMING_SOURCES.includes(newCat as any);
                      const newFlow: FlowType = isInc ? 'Incoming' : 'Outgoing';
                      const amt = tx.inAmount > 0 ? tx.inAmount : tx.outAmount;
                      onUpdateTransaction(tx.id, {
                        category: newCat,
                        flowType: newFlow,
                        inAmount: newFlow === 'Incoming' ? amt : 0,
                        outAmount: newFlow === 'Outgoing' ? amt : 0,
                      });
                    }}
                  />
                  <SmoothSelect
                    ariaLabel={`Mobile method for ${tx.purpose}`}
                    value={tx.method}
                    options={PAYMENT_METHOD_OPTIONS}
                    size="sm"
                    variant="default"
                    onChange={(newMethod) =>
                      onUpdateTransaction(tx.id, {
                        method: newMethod as PaymentMethod,
                      })
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tablet & Desktop Full Editable Table (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="bg-[#2c4268] text-white text-xs font-semibold">
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap">
                  Logged Time
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap">
                  Date
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap">
                  Type
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap min-w-[200px]">
                  Category / Income Source
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap min-w-[260px]">
                  Description / Person
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap min-w-[130px]">
                  Paid Via
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Money In (Rs.)
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Money Out (Rs.)
                </th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No matching transactions found. Use the form above to add a transaction.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/90 transition-colors group"
                  >
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-500 bg-[#f3f5f8] whitespace-nowrap">
                      {formatEntryTimestamp(tx.entryTime)}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap">
                      <input
                        type="text"
                        aria-label={`Edit date for ${tx.purpose}`}
                        defaultValue={formatDateDisplay(tx.date)}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== formatDateDisplay(tx.date)) {
                            const parsed = parseSmartDateInPlace(
                              val,
                              dashboard.activeYear,
                              dashboard.activeMonthIndex
                            );
                            onUpdateTransaction(tx.id, { date: parsed.dateStr });
                            e.target.value = parsed.displayLabel;
                          }
                        }}
                        className="w-28 bg-transparent hover:bg-amber-50/60 focus:bg-[#fff8dc] px-1.5 py-1 rounded border border-transparent focus:border-slate-300 focus:outline-none font-mono tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          tx.flowType === 'Incoming' ? 'text-[#137333]' : 'text-[#a50e0e]'
                        }`}
                      >
                        {tx.flowType === 'Incoming' ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        {tx.flowType === 'Incoming' ? 'Money In' : 'Expense'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-900 whitespace-nowrap min-w-[200px]">
                      <SmoothSelect
                        ariaLabel={`Change category for ${tx.purpose}`}
                        value={tx.category}
                        options={categoryDropdownOptions}
                        searchable={true}
                        searchPlaceholder="Search category..."
                        variant="ghost"
                        size="sm"
                        menuMinWidth={260}
                        onChange={(newCat) => {
                          const isInc =
                            incomeSources.some(
                              (inc) => inc.trim().toLowerCase() === newCat.toLowerCase()
                            ) || INCOMING_SOURCES.includes(newCat as any);
                          const newFlow: FlowType = isInc ? 'Incoming' : 'Outgoing';
                          const amt = tx.inAmount > 0 ? tx.inAmount : tx.outAmount;
                          onUpdateTransaction(tx.id, {
                            category: newCat,
                            flowType: newFlow,
                            inAmount: newFlow === 'Incoming' ? amt : 0,
                            outAmount: newFlow === 'Outgoing' ? amt : 0,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3 text-slate-700 min-w-[260px] w-full">
                      <input
                        type="text"
                        aria-label={`Edit purpose for ${tx.purpose}`}
                        defaultValue={tx.purpose}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== tx.purpose) {
                            onUpdateTransaction(tx.id, { purpose: e.target.value.trim() });
                          }
                        }}
                        className="w-full bg-transparent hover:bg-slate-100 focus:bg-[#fff8dc] px-1.5 py-1 rounded border border-transparent focus:border-slate-300 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-700 whitespace-nowrap min-w-[130px]">
                      <SmoothSelect
                        ariaLabel={`Change payment method for ${tx.purpose}`}
                        value={tx.method}
                        options={PAYMENT_METHOD_OPTIONS}
                        variant="ghost"
                        size="sm"
                        menuMinWidth={220}
                        onChange={(newMethod) =>
                          onUpdateTransaction(tx.id, {
                            method: newMethod as PaymentMethod,
                          })
                        }
                      />
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                        tx.inAmount > 0 ? 'font-bold text-[#137333] bg-[#d9ead3]/25' : 'text-slate-300'
                      }`}
                    >
                      {tx.inAmount > 0 ? tx.inAmount.toLocaleString('en-US') : '—'}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                        tx.outAmount > 0 ? 'font-bold text-[#a50e0e] bg-[#f4cccc]/25' : 'text-slate-300'
                      }`}
                    >
                      {tx.outAmount > 0 ? tx.outAmount.toLocaleString('en-US') : '—'}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        aria-label={`Delete transaction ${tx.purpose}`}
                        className="p-1 text-slate-400 hover:text-[#a50e0e] rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

