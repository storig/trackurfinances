import {
  CategoryAllocationSlot,
  CategoryComputedRow,
  DashboardSummary,
  FlowType,
  IncomingSourceName,
  ParsedDateResult,
  PaymentMethod,
  Transaction,
} from '../types/finance';

export const INCOMING_SOURCES: IncomingSourceName[] = [
  'Salary',
  'Bonus',
  'Gifts',
  'Loans',
  'Loan Recovery',
  'Other Income',
];

export const DEFAULT_INCOMING_SOURCES: string[] = [...INCOMING_SOURCES];

export const CORE_PILLARS: string[] = [
  'Sadaqah',
  'Food & Dining',
  'Gym',
  'Protein & Supplements',
  'Fuel Expense',
  'Giving Gifts',
];

export const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const DEFAULT_CATEGORY_SLOTS: CategoryAllocationSlot[] = [
  { id: 'slot-0', slotIndex: 0, name: 'Sadaqah', defaultPct: 0.05 },
  { id: 'slot-1', slotIndex: 1, name: 'Food & Dining', defaultPct: 0.15 },
  { id: 'slot-2', slotIndex: 2, name: 'Gym', defaultPct: 0.04 },
  { id: 'slot-3', slotIndex: 3, name: 'Protein & Supplements', defaultPct: 0.10 },
  { id: 'slot-4', slotIndex: 4, name: 'Fuel Expense', defaultPct: 0.06 },
  { id: 'slot-5', slotIndex: 5, name: 'Giving Gifts', defaultPct: 0.05 },
  { id: 'slot-6', slotIndex: 6, name: 'Bills & Utilities', defaultPct: 0.10 },
  { id: 'slot-7', slotIndex: 7, name: 'Shopping & Personal', defaultPct: 0.07 },
  { id: 'slot-8', slotIndex: 8, name: 'Family & Home', defaultPct: 0.10 },
  { id: 'slot-9', slotIndex: 9, name: 'Loan Repayment', defaultPct: 0.06 },
  { id: 'slot-10', slotIndex: 10, name: 'Giving Loan', defaultPct: 0.04 },
  { id: 'slot-11', slotIndex: 11, name: 'Miscellaneous', defaultPct: 0.03 },
  { id: 'slot-12', slotIndex: 12, name: '', defaultPct: 0 },
  { id: 'slot-13', slotIndex: 13, name: '', defaultPct: 0 },
  { id: 'slot-14', slotIndex: 14, name: '', defaultPct: 0 },
  { id: 'slot-15', slotIndex: 15, name: '', defaultPct: 0 },
];

export function formatRs(amount: number, includePrefix = true): string {
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-US');
  if (!includePrefix) {
    return rounded < 0 ? `-${absFormatted}` : absFormatted;
  }
  return rounded < 0 ? `-Rs. ${absFormatted}` : `Rs. ${absFormatted}`;
}

export function formatPct(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return '0.0%';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yr = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(yr) || isNaN(mo) || isNaN(day) || mo < 0 || mo > 11) return dateStr;
  const dd = String(day).padStart(2, '0');
  return `${dd}-${MONTH_NAMES_SHORT[mo]}-${yr}`;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const mo = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(mo) || isNaN(day) || mo < 0 || mo > 11) return dateStr;
  const dd = String(day).padStart(2, '0');
  return `${dd}-${MONTH_NAMES_SHORT[mo]}`;
}

export function formatTimeOnly(entryTime: string): string {
  if (!entryTime) return '';
  const d = new Date(entryTime);
  if (isNaN(d.getTime())) return entryTime;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatEntryTimestamp(entryTime: string): string {
  if (!entryTime) return '';
  const d = new Date(entryTime);
  if (isNaN(d.getTime())) return entryTime;
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = MONTH_NAMES_SHORT[d.getMonth()];
  const yyyy = d.getFullYear();
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${dd}-${mmm}-${yyyy} ${timePart}`;
}

/**
 * Matches the Apps Script `parseSmartMonthInPlace` and cell C2 formula.
 * Returns `{ year, monthIndex, label }` where monthIndex is 0-11.
 */
export function resolveActiveMonth(
  rawInput: string,
  referenceToday: Date = new Date(2026, 9, 23)
): { year: number; monthIndex: number; label: string; normalizedInput: string } {
  const defaultYear = referenceToday.getFullYear();
  const defaultMonth = referenceToday.getMonth();
  const defaultLabel = `${MONTH_NAMES_FULL[defaultMonth]} ${defaultYear}`;

  if (!rawInput) {
    return {
      year: defaultYear,
      monthIndex: defaultMonth,
      label: defaultLabel,
      normalizedInput: '',
    };
  }

  const s = rawInput.toString().trim().toLowerCase();
  if (s === '' || s === 'current' || s === 'now' || s === 'today' || s === '0') {
    return {
      year: defaultYear,
      monthIndex: defaultMonth,
      label: defaultLabel,
      normalizedInput: '',
    };
  }

  let yr = defaultYear;
  const yrMatch = s.match(/\b(20\d{2}|\d{2})\b/);
  if (yrMatch) {
    const yNum = parseInt(yrMatch[1], 10);
    yr = yNum < 100 ? 2000 + yNum : yNum;
  }

  const shortM = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = 0; i < 12; i++) {
    if (s.indexOf(shortM[i]) !== -1) {
      const label = `${MONTH_NAMES_FULL[i]} ${yr}`;
      return {
        year: yr,
        monthIndex: i,
        label,
        normalizedInput: label,
      };
    }
  }

  return {
    year: defaultYear,
    monthIndex: defaultMonth,
    label: defaultLabel,
    normalizedInput: rawInput,
  };
}

/**
 * Matches `matchCategoryInPlace(input, ss)` from the Apps Script.
 */
export function matchCategoryInPlace(
  input: string,
  categorySlots: CategoryAllocationSlot[],
  incomeSources: readonly string[] = INCOMING_SOURCES
): { name: string; flow: FlowType } | null {
  if (!input) return null;
  const s = input.toString().trim().toLowerCase();
  if (!s) return null;

  // 1a. Exact match on custom or default income sources
  for (const inc of incomeSources) {
    const incName = inc.trim();
    if (incName && incName.toLowerCase() === s) {
      return { name: incName, flow: 'Incoming' };
    }
  }

  // 1b. Exact match on custom dashboard expense categories
  for (const slot of categorySlots) {
    const cName = slot.name.trim();
    if (cName && cName.toLowerCase() === s) {
      return { name: cName, flow: 'Outgoing' };
    }
  }

  // 2. Shorthand dictionary map
  const map: Array<{ keys: string[]; name: string; flow: FlowType }> = [
    { keys: ['sal', 'salary', 'pay'], name: 'Salary', flow: 'Incoming' },
    { keys: ['bon', 'bonus'], name: 'Bonus', flow: 'Incoming' },
    { keys: ['gift in', 'gifts', 'received gift'], name: 'Gifts', flow: 'Incoming' },
    { keys: ['loan in', 'loans', 'borrow'], name: 'Loans', flow: 'Incoming' },
    { keys: ['rec', 'loan rec', 'recovery'], name: 'Loan Recovery', flow: 'Incoming' },
    { keys: ['oth', 'other in', 'side'], name: 'Other Income', flow: 'Incoming' },
    { keys: ['sad', 'sadaqah', 'charity', 'zakat'], name: 'Sadaqah', flow: 'Outgoing' },
    { keys: ['fod', 'food', 'din', 'meal', 'groc'], name: 'Food & Dining', flow: 'Outgoing' },
    { keys: ['gym', 'workout', 'fit'], name: 'Gym', flow: 'Outgoing' },
    { keys: ['prot', 'protein', 'whey', 'supp'], name: 'Protein & Supplements', flow: 'Outgoing' },
    { keys: ['fuel', 'petrol', 'bike', 'gas'], name: 'Fuel Expense', flow: 'Outgoing' },
    { keys: ['give gift', 'giving gift', 'gift'], name: 'Giving Gifts', flow: 'Outgoing' },
    { keys: ['bill', 'util', 'elec', 'net'], name: 'Bills & Utilities', flow: 'Outgoing' },
    { keys: ['shop', 'cloth', 'pers'], name: 'Shopping & Personal', flow: 'Outgoing' },
    { keys: ['fam', 'home', 'house'], name: 'Family & Home', flow: 'Outgoing' },
    { keys: ['repay', 'loan repay', 'return loan'], name: 'Loan Repayment', flow: 'Outgoing' },
    { keys: ['give loan', 'giving loan', 'lend'], name: 'Giving Loan', flow: 'Outgoing' },
    { keys: ['misc', 'other'], name: 'Miscellaneous', flow: 'Outgoing' },
  ];

  for (const item of map) {
    for (const k of item.keys) {
      if (s === k || s.indexOf(k) === 0) {
        return { name: item.name, flow: item.flow };
      }
    }
  }

  // 3a. Partial substring match on custom income sources
  for (const inc of incomeSources) {
    const incName = inc.trim();
    if (incName && incName.toLowerCase().indexOf(s) !== -1) {
      return { name: incName, flow: 'Incoming' };
    }
  }

  // 3b. Partial substring match on custom dashboard expense categories
  for (const slot of categorySlots) {
    const cName = slot.name.trim();
    if (cName && cName.toLowerCase().indexOf(s) !== -1) {
      return { name: cName, flow: 'Outgoing' };
    }
  }

  return null;
}

/**
 * Matches Col F Payment Method shorthand completion from the Apps Script.
 */
export function parseSmartMethodInPlace(input: string): PaymentMethod {
  if (!input) return 'Cash';
  const cleanM = input.toString().toLowerCase().trim();
  if (cleanM.indexOf('dig') === 0 || cleanM === 'd' || cleanM === 'online' || cleanM === 'bank') {
    return 'Digital';
  }
  if (cleanM.indexOf('cr') === 0 || cleanM === 'card') {
    return 'Credit';
  }
  if (cleanM.indexOf('c') === 0) {
    return 'Cash';
  }
  return 'Cash';
}

/**
 * Helper to clamp day into valid range for given year and monthIndex (0-11)
 * and format as YYYY-MM-DD.
 */
function buildDateStr(year: number, monthIndex: number, day: number): string {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(daysInMonth, day));
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(safeDay).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Matches `parseSmartDateInPlace` from the Apps Script:
 * Supports relative keywords ("today", "yesterday", "-1", "-3"),
 * single day numbers ("5", "18"), text with month name ("10 oct", "5//oct//2026"),
 * numeric separators ("10/10", "2026-10-15"), and enforces the 1-Month rule.
 */
export function parseSmartDateInPlace(
  displayStr: string,
  allowedYear: number,
  allowedMonth: number, // 0-11
  referenceNow: Date = new Date(2026, 9, 23)
): ParsedDateResult {
  const s = (displayStr || '').toString().trim().toLowerCase();

  // 1. Blank or "today" / "now"
  if (s === '' || s === 'today' || s === 'now') {
    const defaultDay =
      referenceNow.getFullYear() === allowedYear && referenceNow.getMonth() === allowedMonth
        ? referenceNow.getDate()
        : 1;
    const dateStr = buildDateStr(allowedYear, allowedMonth, defaultDay);
    return { dateStr, monthChanged: false, displayLabel: formatDateDisplay(dateStr) };
  }

  // 2. "yesterday"
  if (s === 'yesterday') {
    const yest = new Date(
      referenceNow.getFullYear(),
      referenceNow.getMonth(),
      referenceNow.getDate() - 1
    );
    const mDiffY = yest.getFullYear() !== allowedYear || yest.getMonth() !== allowedMonth;
    const dateStr = buildDateStr(allowedYear, allowedMonth, yest.getDate());
    return { dateStr, monthChanged: mDiffY, displayLabel: formatDateDisplay(dateStr) };
  }

  // 3. Relative offset "-1", "-3", etc.
  if (/^-\d{1,2}$/.test(s)) {
    const offset = parseInt(s, 10);
    const rel = new Date(
      referenceNow.getFullYear(),
      referenceNow.getMonth(),
      referenceNow.getDate() + offset
    );
    const mDiffR = rel.getFullYear() !== allowedYear || rel.getMonth() !== allowedMonth;
    const dateStr = buildDateStr(allowedYear, allowedMonth, rel.getDate());
    return { dateStr, monthChanged: mDiffR, displayLabel: formatDateDisplay(dateStr) };
  }

  // 4. Single day number ("5", "12", "28")
  if (/^\d{1,2}$/.test(s)) {
    const dayOnly = parseInt(s, 10);
    const dateStr = buildDateStr(allowedYear, allowedMonth, dayOnly);
    return { dateStr, monthChanged: false, displayLabel: formatDateDisplay(dateStr) };
  }

  // 5. Text with month name ("10 oct", "oct 10", "5//oct//2026")
  const shortM = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = 0; i < 12; i++) {
    if (s.indexOf(shortM[i]) !== -1) {
      const nums = s.match(/\d+/g);
      let dayM = 1;
      let yrM = allowedYear;
      if (nums && nums.length > 0) {
        const firstNum = parseInt(nums[0], 10);
        if (firstNum > 1900 && nums.length > 1) {
          yrM = firstNum;
          dayM = parseInt(nums[1], 10);
        } else {
          dayM = firstNum;
          if (nums.length > 1) {
            yrM = parseInt(nums[1], 10);
            if (yrM < 100) yrM += 2000;
          }
        }
      }
      const changedM = i !== allowedMonth || yrM !== allowedYear;
      const dateStr = buildDateStr(allowedYear, allowedMonth, dayM);
      return { dateStr, monthChanged: changedM, displayLabel: formatDateDisplay(dateStr) };
    }
  }

  // 6. Numeric separators ("10/10", "05/10/2026", "2026-10-05", "5.10.26")
  const parts = s.split(/[^0-9]+/).filter(Boolean);
  if (parts.length >= 2) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    let p2 = parts.length >= 3 ? parseInt(parts[2], 10) : allowedYear;
    if (p2 < 100) p2 += 2000;

    let dayN = p0;
    let monN = p1 - 1;
    let yrN = p2;

    if (p0 > 1900) {
      yrN = p0;
      monN = p1 - 1;
      dayN = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
    } else if (monN !== allowedMonth && p0 - 1 === allowedMonth && p1 <= 31) {
      // Handle MM/DD vs DD/MM automatically
      monN = p0 - 1;
      dayN = p1;
    }
    const changedN = monN !== allowedMonth || yrN !== allowedYear;
    const dateStr = buildDateStr(allowedYear, allowedMonth, dayN);
    return { dateStr, monthChanged: changedN, displayLabel: formatDateDisplay(dateStr) };
  }

  const fallbackDateStr = buildDateStr(allowedYear, allowedMonth, referenceNow.getDate());
  return {
    dateStr: fallbackDateStr,
    monthChanged: false,
    displayLabel: formatDateDisplay(fallbackDateStr),
  };
}

/**
 * Sorts transactions in increasing Date order, then Entry Time order (`sortMainLogByIncreasingDate`).
 */
export function sortTransactionsIncreasing(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.entryTime.localeCompare(b.entryTime);
  });
}

/**
 * Builds the combined dropdown list of Expense Categories + Incoming Sources (`syncCategoryDropdown`).
 */
export function buildSyncedCategoryDropdown(
  slots: CategoryAllocationSlot[],
  incomeSources: readonly string[] = INCOMING_SOURCES
): string[] {
  const list: string[] = [];
  for (const slot of slots) {
    const c = slot.name.trim();
    if (c !== '' && !list.includes(c)) {
      list.push(c);
    }
  }
  for (const inc of incomeSources) {
    const trimmed = inc.trim();
    if (trimmed !== '' && !list.includes(trimmed)) {
      list.push(trimmed);
    }
  }
  return list;
}

/**
 * Filters transactions falling within a given year and monthIndex (0-11).
 */
export function filterTransactionsByMonth(
  transactions: Transaction[],
  year: number,
  monthIndex: number
): Transaction[] {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
  return transactions.filter((t) => t.date.startsWith(prefix));
}

/**
 * Computes all Dashboard metrics (`2_Monthly_Dashboard`) with 100% fidelity to the Apps Script formulas.
 */
export function computeDashboardSummary(
  allTransactions: Transaction[],
  categorySlots: CategoryAllocationSlot[],
  activeMonthRaw: string,
  referenceToday: Date = new Date(2026, 9, 23),
  incomeSources: readonly string[] = INCOMING_SOURCES
): DashboardSummary {
  const resolved = resolveActiveMonth(activeMonthRaw, referenceToday);
  const { year: activeYear, monthIndex: activeMonthIndex, label: activeMonthLabel } = resolved;

  const todayMonthLabel = `${MONTH_NAMES_FULL[referenceToday.getMonth()]} ${referenceToday.getFullYear()}`;
  const isCurrentMonthView = activeMonthLabel === todayMonthLabel;

  const monthTxs = filterTransactionsByMonth(allTransactions, activeYear, activeMonthIndex);

  // Incoming Pool (Row 6)
  const sumInByCat = (cat: string) =>
    monthTxs
      .filter((t) => t.category === cat)
      .reduce((acc, t) => acc + t.inAmount, 0);

  const salary = sumInByCat('Salary');
  const bonus = sumInByCat('Bonus');
  const giftsIn = sumInByCat('Gifts');
  const loansTaken = sumInByCat('Loans');

  // Ensure any custom incoming sources beyond the classic 4 are included in loanRecAndOther & totalIncoming
  const normalizedIncomeSources = Array.from(
    new Set(incomeSources.map((s) => s.trim()).filter(Boolean))
  );

  const totalIncomingFromTxs = monthTxs
    .filter((t) => t.flowType === 'Incoming' || normalizedIncomeSources.includes(t.category))
    .reduce((acc, t) => acc + t.inAmount, 0);

  const loanRecAndOther = Math.max(
    0,
    totalIncomingFromTxs - (salary + bonus + giftsIn + loansTaken)
  );
  const totalIncoming = totalIncomingFromTxs;

  const incomingSourceBreakdown = normalizedIncomeSources.map((name) => {
    const amount = sumInByCat(name);
    return {
      name,
      amount,
      share: totalIncoming === 0 ? 0 : amount / totalIncoming,
    };
  });

  const totalSpent = monthTxs
    .filter((t) => t.flowType === 'Outgoing')
    .reduce((acc, t) => acc + t.outAmount, 0);

  const netSavings = totalIncoming - totalSpent;

  // Daily Safe Spend (Cell H2:I2)
  const daysInSelectedMonth = new Date(activeYear, activeMonthIndex + 1, 0).getDate();
  const remainingDaysInMonth = Math.max(
    1,
    isCurrentMonthView
      ? daysInSelectedMonth - referenceToday.getDate() + 1
      : daysInSelectedMonth
  );

  const dailySafeSpendAmount =
    netSavings <= 0 ? 0 : Math.round(netSavings / remainingDaysInMonth);
  const dailySafeSpendText =
    netSavings <= 0
      ? 'Rs. 0 / day'
      : `Rs. ${dailySafeSpendAmount.toLocaleString('en-US')} / day`;

  // Category Allocation Rows (Rows 15 to 30)
  const categoryRows: CategoryComputedRow[] = categorySlots
    .filter((slot) => slot.name.trim() !== '')
    .map((slot) => {
      const catName = slot.name.trim();
      const allocatedLimit = Math.round(totalIncoming * slot.defaultPct);
      const catTxs = monthTxs.filter((t) => t.category === catName);
      const actualSpent = catTxs.reduce((acc, t) => acc + t.outAmount, 0);
      const remainingOrOver = allocatedLimit - actualSpent;
      const actualPctOfIncome = totalIncoming === 0 ? 0 : actualSpent / totalIncoming;
      const txCount = catTxs.length;
      const usageRatio =
        allocatedLimit <= 0
          ? actualSpent > 0
            ? 1
            : 0
          : Math.min(1, actualSpent / allocatedLimit);
      const isSafe = actualSpent <= allocatedLimit;
      const statusText = isSafe
        ? `SAFE (Rs. ${Math.round(allocatedLimit - actualSpent).toLocaleString('en-US')} Left)`
        : `EXCEEDED (+Rs. ${Math.round(actualSpent - allocatedLimit).toLocaleString('en-US')})`;

      return {
        slotIndex: slot.slotIndex,
        name: catName,
        defaultPct: slot.defaultPct,
        allocatedLimit,
        actualSpent,
        remainingOrOver,
        actualPctOfIncome,
        txCount,
        usageRatio,
        isSafe,
        statusText,
      };
    });

  // Row 31: TOTAL ALLOCATED TO CATEGORIES
  const totalAllocatedPct = categoryRows.reduce((acc, r) => acc + r.defaultPct, 0);
  const totalAllocatedLimit = categoryRows.reduce((acc, r) => acc + r.allocatedLimit, 0);
  const totalCategorySpent = categoryRows.reduce((acc, r) => acc + r.actualSpent, 0);
  const totalCategoryRemaining = categoryRows.reduce((acc, r) => acc + r.remainingOrOver, 0);
  const totalCategoryPctOfIncome = categoryRows.reduce((acc, r) => acc + r.actualPctOfIncome, 0);
  const totalCategoryTxCount = categoryRows.reduce((acc, r) => acc + r.txCount, 0);

  const isOverAllocatedPct = totalAllocatedPct > 1.0001;
  const isTotalWithinAllocation = totalCategorySpent <= totalAllocatedLimit;
  const totalAllocationStatusText = isOverAllocatedPct
    ? 'OVER-ALLOCATED (>100%)'
    : isTotalWithinAllocation
    ? 'WITHIN TOTAL ALLOCATION'
    : 'TOTAL BUDGET EXCEEDED';

  // Row 32: UNALLOCATED PLANNED TARGET SAVINGS
  const unallocatedPlannedPct = Math.max(0, 1 - totalAllocatedPct);
  const unallocatedPlannedRs = Math.round(totalIncoming * unallocatedPlannedPct);
  const actualNetSavingsRs = netSavings;
  const savingsDiffRs = actualNetSavingsRs - unallocatedPlannedRs;
  const actualNetSavingsPctOfIncome = totalIncoming === 0 ? 0 : actualNetSavingsRs / totalIncoming;
  const savingsTargetMet = actualNetSavingsRs >= unallocatedPlannedRs;
  const savingsTargetStatusText = savingsTargetMet
    ? `SAVINGS TARGET MET (+Rs. ${Math.round(actualNetSavingsRs - unallocatedPlannedRs).toLocaleString('en-US')})`
    : `BELOW TARGET (-Rs. ${Math.round(unallocatedPlannedRs - actualNetSavingsRs).toLocaleString('en-US')})`;

  // Shares (Row 7)
  const safeShare = (val: number) => (totalIncoming === 0 ? 0 : val / totalIncoming);

  // Sadaqah Goal, Dual Loan Tracker & Net Retained Savings Vault (Rows 10-11)
  const sadaqahRow = categoryRows.find((r) => r.name.toLowerCase() === 'sadaqah');
  const sadaqahLimit = sadaqahRow ? sadaqahRow.allocatedLimit : 0;
  const sadaqahSpent = sadaqahRow ? sadaqahRow.actualSpent : 0;
  const sadaqahLeftAmount = Math.max(0, sadaqahLimit - sadaqahSpent);
  const sadaqahGoalText =
    sadaqahLimit - sadaqahSpent > 0
      ? `Rs. ${Math.round(sadaqahLimit - sadaqahSpent).toLocaleString('en-US')} Left to Give`
      : `Rs. ${Math.round(sadaqahSpent).toLocaleString('en-US')} Given`;

  // All-time / Master Log totals for Vault & Loans (matching SUMIF without mCond in Row 11)
  const allLoansIn = allTransactions
    .filter((t) => t.category === 'Loans')
    .reduce((acc, t) => acc + t.inAmount, 0);
  const allLoanRepayOut = allTransactions
    .filter((t) => t.category === 'Loan Repayment')
    .reduce((acc, t) => acc + t.outAmount, 0);
  const netPayableLoans = allLoansIn - allLoanRepayOut;

  const allGivingLoanOut = allTransactions
    .filter((t) => t.category === 'Giving Loan')
    .reduce((acc, t) => acc + t.outAmount, 0);
  const allLoanRecoveryIn = allTransactions
    .filter((t) => t.category === 'Loan Recovery')
    .reduce((acc, t) => acc + t.inAmount, 0);
  const netReceivableLoans = allGivingLoanOut - allLoanRecoveryIn;

  const netRetainedSavingsVault =
    allTransactions.reduce((acc, t) => acc + t.inAmount, 0) -
    allTransactions.reduce((acc, t) => acc + t.outAmount, 0);

  return {
    activeMonthLabel,
    activeYear,
    activeMonthIndex,
    isCurrentMonthView,
    dailySafeSpendText,
    dailySafeSpendAmount,
    remainingDaysInMonth,
    incomingSourceBreakdown,
    salary,
    bonus,
    giftsIn,
    loansTaken,
    loanRecAndOther,
    totalIncoming,
    totalSpent,
    netSavings,
    unallocatedTargetRs: unallocatedPlannedRs,
    salaryShare: safeShare(salary),
    bonusShare: safeShare(bonus),
    giftsInShare: safeShare(giftsIn),
    loansTakenShare: safeShare(loansTaken),
    loanRecAndOtherShare: safeShare(loanRecAndOther),
    totalIncomingShare: totalIncoming === 0 ? 0 : 1,
    totalSpentShare: safeShare(totalSpent),
    netSavingsShare: safeShare(netSavings),
    unallocatedTargetPct: unallocatedPlannedPct,
    sadaqahGoalText,
    sadaqahLeftAmount,
    netPayableLoans,
    netReceivableLoans,
    netRetainedSavingsVault,
    categoryRows,
    totalAllocatedPct,
    totalAllocatedLimit,
    totalCategorySpent,
    totalCategoryRemaining,
    totalCategoryPctOfIncome,
    totalCategoryTxCount,
    totalAllocationStatusText,
    isTotalWithinAllocation,
    isOverAllocatedPct,
    unallocatedPlannedPct,
    unallocatedPlannedRs,
    actualNetSavingsRs,
    savingsDiffRs,
    actualNetSavingsPctOfIncome,
    savingsTargetMet,
    savingsTargetStatusText,
  };
}

/**
 * Computes Sheet 3 (`3_Income_Savings_Loans`) data.
 */
export function computeIncomeSavingsLoans(
  allTransactions: Transaction[],
  dashboard: DashboardSummary,
  incomeSources: readonly string[] = INCOMING_SOURCES
) {
  const monthTxs = filterTransactionsByMonth(
    allTransactions,
    dashboard.activeYear,
    dashboard.activeMonthIndex
  );

  const activeSources = Array.from(
    new Set(incomeSources.map((s) => s.trim()).filter(Boolean))
  );

  // Section A: Incoming Sources Breakdown
  const sourceRows = activeSources.map((source) => {
    const mTxs = monthTxs.filter((t) => t.category === source);
    const aTxs = allTransactions.filter((t) => t.category === source);
    const txCount = mTxs.length;
    const monthlyAmount = mTxs.reduce((acc, t) => acc + t.inAmount, 0);
    const totalLogged = aTxs.reduce((acc, t) => acc + t.inAmount, 0);
    return {
      source,
      txCount,
      monthlyAmount,
      sharePct: dashboard.totalIncoming === 0 ? 0 : monthlyAmount / dashboard.totalIncoming,
      totalLogged,
    };
  });

  const totalIncomingTxCount = sourceRows.reduce((acc, r) => acc + r.txCount, 0);
  const totalIncomingMonthly = sourceRows.reduce((acc, r) => acc + r.monthlyAmount, 0);
  const totalIncomingAllTime = sourceRows.reduce((acc, r) => acc + r.totalLogged, 0);

  const incomingEntries = sortTransactionsIncreasing(
    monthTxs.filter((t) => t.flowType === 'Incoming')
  );

  // Section B: 3-Tier Connected Net Savings Mechanics
  const greenUnspentBuffer = dashboard.categoryRows
    .filter((r) => r.remainingOrOver > 0)
    .reduce((acc, r) => acc + r.remainingOrOver, 0);

  const redOverspendDrain = dashboard.categoryRows
    .filter((r) => r.remainingOrOver < 0)
    .reduce((acc, r) => acc + r.remainingOrOver, 0); // negative value

  const netByMethod = (method: PaymentMethod) =>
    allTransactions
      .filter((t) => t.method === method)
      .reduce((acc, t) => acc + t.inAmount - t.outAmount, 0);

  const tier2OnTrack = dashboard.actualNetSavingsRs >= dashboard.unallocatedPlannedRs;

  const savingsMechanics = [
    {
      metric: 'Tier 1: Unallocated Target Savings %',
      valueFormatted: formatPct(dashboard.unallocatedPlannedPct),
      rawValue: dashboard.unallocatedPlannedPct,
      status: 'Planned Pool %',
      highlight: 'normal' as const,
    },
    {
      metric: 'Tier 1: Planned Target Savings (Rs.)',
      valueFormatted: formatRs(dashboard.unallocatedPlannedRs),
      rawValue: dashboard.unallocatedPlannedRs,
      status: 'From Unallocated %',
      highlight: 'normal' as const,
    },
    {
      metric: 'Green Categories Unspent Buffer',
      valueFormatted: formatRs(greenUnspentBuffer),
      rawValue: greenUnspentBuffer,
      status: 'Boosts Net Savings',
      highlight: 'green-soft' as const,
    },
    {
      metric: 'Red Categories Overspend Drain',
      valueFormatted: formatRs(redOverspendDrain),
      rawValue: redOverspendDrain,
      status: 'Eats Into Savings',
      highlight: 'red-soft' as const,
    },
    {
      metric: 'Tier 2: Active Month Actual Net Savings',
      valueFormatted: formatRs(dashboard.actualNetSavingsRs),
      rawValue: dashboard.actualNetSavingsRs,
      status: tier2OnTrack ? 'ON TRACK' : 'BELOW TARGET',
      highlight: 'gold' as const,
    },
    {
      metric: 'Active Month Actual Savings Rate %',
      valueFormatted: formatPct(dashboard.actualNetSavingsPctOfIncome),
      rawValue: dashboard.actualNetSavingsPctOfIncome,
      status: 'Actual % Retained',
      highlight: 'normal' as const,
    },
    {
      metric: 'Tier 3: Net Savings Vault (Total Retained)',
      valueFormatted: formatRs(dashboard.netRetainedSavingsVault),
      rawValue: dashboard.netRetainedSavingsVault,
      status: 'Total Retained Surplus',
      highlight: 'green' as const,
    },
    {
      metric: 'Vault Held in Digital (Net Digital)',
      valueFormatted: formatRs(netByMethod('Digital')),
      rawValue: netByMethod('Digital'),
      status: 'Digital Liquidity',
      highlight: 'normal' as const,
    },
    {
      metric: 'Vault Held in Cash (Net Cash in Hand)',
      valueFormatted: formatRs(netByMethod('Cash')),
      rawValue: netByMethod('Cash'),
      status: 'Physical Cash Liquidity',
      highlight: 'normal' as const,
    },
    {
      metric: 'Net Credit Card / Deferred Position',
      valueFormatted: formatRs(netByMethod('Credit')),
      rawValue: netByMethod('Credit'),
      status: 'Credit Used',
      highlight: 'normal' as const,
    },
  ];

  // Section C: Dual Loan & Gift Tracker
  const sumAllIn = (cat: string) =>
    allTransactions.filter((t) => t.category === cat).reduce((a, t) => a + t.inAmount, 0);
  const sumAllOut = (cat: string) =>
    allTransactions.filter((t) => t.category === cat).reduce((a, t) => a + t.outAmount, 0);
  const sumMonthIn = (cat: string) =>
    monthTxs.filter((t) => t.category === cat).reduce((a, t) => a + t.inAmount, 0);
  const sumMonthOut = (cat: string) =>
    monthTxs.filter((t) => t.category === cat).reduce((a, t) => a + t.outAmount, 0);

  const payableIn = sumAllIn('Loans');
  const payableOut = sumAllOut('Loan Repayment');
  const receivableIn = sumAllIn('Loan Recovery');
  const receivableOut = sumAllOut('Giving Loan');
  const giftsRecIn = sumAllIn('Gifts');
  const giftsGivenOut = sumAllOut('Giving Gifts');

  const dualLoanDimensions = [
    {
      dimension: 'Payable Loans (Taken vs Repaid)',
      totalInflow: payableIn,
      totalOutflow: payableOut,
      netPosition: payableIn - payableOut,
      activeMonthNet: sumMonthIn('Loans') - sumMonthOut('Loan Repayment'),
      tone: 'red' as const,
    },
    {
      dimension: 'Receivable Loans (Given vs Recovered)',
      totalInflow: receivableIn,
      totalOutflow: receivableOut,
      netPosition: receivableOut - receivableIn,
      activeMonthNet: sumMonthOut('Giving Loan') - sumMonthIn('Loan Recovery'),
      tone: 'gold' as const,
    },
    {
      dimension: 'Gifts Exchange (Received vs Given)',
      totalInflow: giftsRecIn,
      totalOutflow: giftsGivenOut,
      netPosition: giftsRecIn - giftsGivenOut,
      activeMonthNet: sumMonthIn('Gifts') - sumMonthOut('Giving Gifts'),
      tone: 'green' as const,
    },
  ];

  const loanGiftCategories = new Set([
    'Loans',
    'Loan Repayment',
    'Giving Loan',
    'Loan Recovery',
    'Gifts',
    'Giving Gifts',
  ]);
  const loanGiftLedger = sortTransactionsIncreasing(
    allTransactions.filter((t) => loanGiftCategories.has(t.category))
  );

  return {
    sourceRows,
    totalIncomingTxCount,
    totalIncomingMonthly,
    totalIncomingAllTime,
    incomingEntries,
    savingsMechanics,
    dualLoanDimensions,
    loanGiftLedger,
  };
}

/**
 * Computes Sheet 5 (`5_Weekly_Breakdown`) Weeks 1 to 5 Matrix.
 * Week 1: Days 1-7
 * Week 2: Days 8-14
 * Week 3: Days 15-21
 * Week 4: Days 22-28
 * Week 5: Days 29-31
 */
export function computeWeeklyBreakdown(
  allTransactions: Transaction[],
  dashboard: DashboardSummary
) {
  const monthTxs = filterTransactionsByMonth(
    allTransactions,
    dashboard.activeYear,
    dashboard.activeMonthIndex
  );

  const getWeekIndex = (dateStr: string): number => {
    const day = parseInt(dateStr.split('-')[2], 10);
    if (day <= 7) return 0;
    if (day <= 14) return 1;
    if (day <= 21) return 2;
    if (day <= 28) return 3;
    return 4;
  };

  const rows = dashboard.categoryRows.map((catRow) => {
    const weeks = [0, 0, 0, 0, 0];
    monthTxs
      .filter((t) => t.category === catRow.name)
      .forEach((t) => {
        const wIdx = getWeekIndex(t.date);
        weeks[wIdx] += t.outAmount;
      });
    const monthlyTotal = weeks.reduce((a, b) => a + b, 0);
    const weeklyAverage = Math.round(monthlyTotal / 4.33);
    return {
      category: catRow.name,
      monthlyLimit: catRow.allocatedLimit,
      weeks,
      monthlyTotal,
      weeklyAverage,
      statusText: catRow.statusText,
      isSafe: catRow.isSafe,
    };
  });

  const totalWeeklyOutgoing = [0, 1, 2, 3, 4].map((wIdx) =>
    rows.reduce((acc, r) => acc + r.weeks[wIdx], 0)
  );
  const totalOutgoingSum = totalWeeklyOutgoing.reduce((a, b) => a + b, 0);
  const totalOutgoingAvg = Math.round(totalOutgoingSum / 4.33);

  const totalWeeklyIncoming = [0, 0, 0, 0, 0];
  monthTxs.forEach((t) => {
    if (t.inAmount > 0) {
      const wIdx = getWeekIndex(t.date);
      totalWeeklyIncoming[wIdx] += t.inAmount;
    }
  });
  const totalIncomingSum = totalWeeklyIncoming.reduce((a, b) => a + b, 0);
  const totalIncomingAvg = Math.round(totalIncomingSum / 4.33);

  const weeklyNetSavings = [0, 1, 2, 3, 4].map(
    (wIdx) => totalWeeklyIncoming[wIdx] - totalWeeklyOutgoing[wIdx]
  );
  const netSavingsSum = totalIncomingSum - totalOutgoingSum;
  const netSavingsAvg = totalIncomingAvg - totalOutgoingAvg;

  return {
    rows,
    totalWeeklyOutgoing,
    totalOutgoingSum,
    totalOutgoingAvg,
    totalWeeklyIncoming,
    totalIncomingSum,
    totalIncomingAvg,
    weeklyNetSavings,
    netSavingsSum,
    netSavingsAvg,
  };
}

/**
 * Computes Sheet 6 (`6_Purpose_&_Methods`) analytics.
 */
export function computePurposeAndMethods(
  allTransactions: Transaction[],
  dashboard: DashboardSummary
) {
  const monthTxs = filterTransactionsByMonth(
    allTransactions,
    dashboard.activeYear,
    dashboard.activeMonthIndex
  );

  // A. Grouped Recurring Purposes (Outgoing, where outAmount > 0, grouped by Specific Purpose)
  const purposeMap = new Map<
    string,
    { purpose: string; category: string; frequency: number; totalSpent: number }
  >();

  monthTxs
    .filter((t) => t.flowType === 'Outgoing' && t.outAmount > 0)
    .forEach((t) => {
      const key = (t.purpose || 'Unspecified').trim();
      const existing = purposeMap.get(key);
      if (!existing) {
        purposeMap.set(key, {
          purpose: key,
          category: t.category,
          frequency: 1,
          totalSpent: t.outAmount,
        });
      } else {
        existing.frequency += 1;
        existing.totalSpent += t.outAmount;
        if (t.category > existing.category) {
          existing.category = t.category; // MAX(Col2) equivalent
        }
      }
    });

  const groupedPurposes = Array.from(purposeMap.values())
    .map((item) => ({
      ...item,
      avgPerTx: Math.round(item.totalSpent / item.frequency),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // B. Top 20 Largest Single Expenses in Selected Month
  const top20Expenses = [...monthTxs]
    .filter((t) => t.flowType === 'Outgoing' && t.outAmount > 0)
    .sort((a, b) => b.outAmount - a.outAmount)
    .slice(0, 20);

  // C. Payment Method Analytics (Digital, Cash, Credit)
  const methods: PaymentMethod[] = ['Digital', 'Cash', 'Credit'];
  const methodRows = methods.map((method) => {
    const txCountOut = monthTxs.filter(
      (t) => t.method === method && t.flowType === 'Outgoing'
    ).length;
    const monthlyIncoming = monthTxs
      .filter((t) => t.method === method)
      .reduce((acc, t) => acc + t.inAmount, 0);
    const monthlyOutgoing = monthTxs
      .filter((t) => t.method === method)
      .reduce((acc, t) => acc + t.outAmount, 0);
    return {
      method,
      txCountOut,
      monthlyIncoming,
      monthlyOutgoing,
      monthlyNetFlow: monthlyIncoming - monthlyOutgoing,
    };
  });

  const totalMethodStats = {
    txCountOut: methodRows.reduce((a, r) => a + r.txCountOut, 0),
    monthlyIncoming: methodRows.reduce((a, r) => a + r.monthlyIncoming, 0),
    monthlyOutgoing: methodRows.reduce((a, r) => a + r.monthlyOutgoing, 0),
    monthlyNetFlow: methodRows.reduce((a, r) => a + r.monthlyNetFlow, 0),
  };

  return {
    groupedPurposes,
    top20Expenses,
    methodRows,
    totalMethodStats,
  };
}

/**
 * Computes Sheet 7 (`7_Yearly_12M_Matrix`) for the active year.
 */
export function computeYearly12MMatrix(
  allTransactions: Transaction[],
  categorySlots: CategoryAllocationSlot[],
  activeYear: number,
  incomeSources: readonly string[] = INCOMING_SOURCES
) {
  const sumByMonth = (
    cat: string,
    isIncoming: boolean
  ): { months: number[]; annualTotal: number; monthlyAvg: number } => {
    const months = Array(12).fill(0);
    allTransactions.forEach((t) => {
      if (t.category !== cat) return;
      const parts = t.date.split('-');
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      if (yr === activeYear && mo >= 0 && mo < 12) {
        months[mo] += isIncoming ? t.inAmount : t.outAmount;
      }
    });
    const annualTotal = months.reduce((a, b) => a + b, 0);
    const monthlyAvg = Math.round(annualTotal / 12);
    return { months, annualTotal, monthlyAvg };
  };

  const activeSources = Array.from(
    new Set(incomeSources.map((s) => s.trim()).filter(Boolean))
  );

  const incomingMatrixRows = activeSources.map((source) => ({
    label: source,
    ...sumByMonth(source, true),
  }));

  const totalIncomingMonths = Array(12)
    .fill(0)
    .map((_, mIdx) => incomingMatrixRows.reduce((acc, r) => acc + r.months[mIdx], 0));
  const totalIncomingAnnual = totalIncomingMonths.reduce((a, b) => a + b, 0);
  const totalIncomingAvg = Math.round(totalIncomingAnnual / 12);

  const activeCategories = categorySlots.filter((s) => s.name.trim() !== '');
  const categoryMatrixRows = activeCategories.map((slot) => ({
    label: slot.name.trim(),
    ...sumByMonth(slot.name.trim(), false),
  }));

  const totalOutgoingMonths = Array(12)
    .fill(0)
    .map((_, mIdx) => categoryMatrixRows.reduce((acc, r) => acc + r.months[mIdx], 0));
  const totalOutgoingAnnual = totalOutgoingMonths.reduce((a, b) => a + b, 0);
  const totalOutgoingAvg = Math.round(totalOutgoingAnnual / 12);

  const netSavingsMonths = Array(12)
    .fill(0)
    .map((_, mIdx) => totalIncomingMonths[mIdx] - totalOutgoingMonths[mIdx]);
  const netSavingsAnnual = totalIncomingAnnual - totalOutgoingAnnual;
  const netSavingsAvg = Math.round(netSavingsAnnual / 12);

  return {
    activeYear,
    incomingMatrixRows,
    totalIncomingRow: {
      months: totalIncomingMonths,
      annualTotal: totalIncomingAnnual,
      monthlyAvg: totalIncomingAvg,
    },
    categoryMatrixRows,
    totalOutgoingRow: {
      months: totalOutgoingMonths,
      annualTotal: totalOutgoingAnnual,
      monthlyAvg: totalOutgoingAvg,
    },
    netSavingsRow: {
      months: netSavingsMonths,
      annualTotal: netSavingsAnnual,
      monthlyAvg: netSavingsAvg,
    },
  };
}
