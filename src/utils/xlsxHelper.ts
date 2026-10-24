import * as XLSX from 'xlsx';
import {
  CategoryAllocationSlot,
  FlowType,
  PaymentMethod,
  Transaction,
} from '../types/finance';
import {
  DEFAULT_CATEGORY_SLOTS,
  DEFAULT_INCOMING_SOURCES,
  INCOMING_SOURCES,
  MONTH_NAMES_SHORT,
  computeDashboardSummary,
  computeIncomeSavingsLoans,
  computePurposeAndMethods,
  computeWeeklyBreakdown,
  computeYearly12MMatrix,
  formatDateDisplay,
  formatEntryTimestamp,
  matchCategoryInPlace,
  parseSmartDateInPlace,
  parseSmartMethodInPlace,
  sortTransactionsIncreasing,
} from './financialEngine';

export interface XlsxImportResult {
  transactions: Transaction[];
  categorySlots: CategoryAllocationSlot[] | null;
  importedTxCount: number;
  importedCatCount: number;
  sheetNamesRead: string[];
}

function parseExcelNumber(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.round(Math.abs(val));
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? Math.round(Math.abs(num)) : 0;
  }
  return 0;
}

function parseExcelPct(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) {
    // In Excel, 5% is stored as 0.05; if user typed 5, normalize > 1 to /100
    return val > 1 ? Math.min(1, val / 100) : Math.max(0, val);
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.]+/g, '');
    const num = parseFloat(cleaned);
    if (!Number.isFinite(num)) return null;
    return num > 1 ? Math.min(1, num / 100) : Math.max(0, num);
  }
  return null;
}

function excelCellToDateStr(
  cellVal: unknown,
  allowedYear: number,
  allowedMonth: number
): string {
  if (cellVal instanceof Date && !isNaN(cellVal.getTime())) {
    const yyyy = cellVal.getFullYear();
    const mm = String(cellVal.getMonth() + 1).padStart(2, '0');
    const dd = String(cellVal.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof cellVal === 'number' && cellVal > 20000 && cellVal < 80000) {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(cellVal);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  if (typeof cellVal === 'string' && cellVal.trim() !== '') {
    const raw = cellVal.trim();
    // Check ISO YYYY-MM-DD directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }
    const smart = parseSmartDateInPlace(raw, allowedYear, allowedMonth);
    return smart.dateStr;
  }
  const mm = String(allowedMonth + 1).padStart(2, '0');
  return `${allowedYear}-${mm}-01`;
}

/**
 * Parses an uploaded .xlsx / .xls / .csv ArrayBuffer or Uint8Array.
 * Supports both the 7-sheet Ultimate Financial Tracker Google Sheets layout
 * and generic financial spreadsheets.
 */
export function parseWorkbookBuffer(
  data: ArrayBuffer | Uint8Array,
  currentSlots: CategoryAllocationSlot[],
  allowedYear: number,
  allowedMonth: number
): XlsxImportResult {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetNamesRead: string[] = [];

  let updatedSlots: CategoryAllocationSlot[] | null = null;
  let importedCatCount = 0;

  // 1. Check if '2_Monthly_Dashboard' exists to extract custom Category % Allocations (Rows 15-30)
  const dashSheetName = wb.SheetNames.find(
    (n) =>
      n.toLowerCase() === '2_monthly_dashboard' ||
      n.toLowerCase().includes('dashboard')
  );

  if (dashSheetName) {
    const dashSheet = wb.Sheets[dashSheetName];
    const dashRows = XLSX.utils.sheet_to_json<any[]>(dashSheet, {
      header: 1,
      defval: '',
    });

    // Look for header row containing 'Expense Category' or inspect rows 14..29 (0-indexed)
    let startRowIdx = 14;
    for (let r = 0; r < Math.min(dashRows.length, 25); r++) {
      const firstCell = String(dashRows[r]?.[0] || '').toLowerCase();
      if (firstCell.includes('expense category')) {
        startRowIdx = r + 1;
        break;
      }
    }

    const extracted: CategoryAllocationSlot[] = [];
    for (let idx = 0; idx < 16; idx++) {
      const row = dashRows[startRowIdx + idx];
      if (!row) {
        extracted.push({
          id: `slot-${idx}`,
          slotIndex: idx,
          name: '',
          defaultPct: 0,
        });
        continue;
      }
      const rawName = String(row[0] || '').trim();
      // Stop if we hit the TOTAL ALLOCATED row
      if (
        rawName.toUpperCase().includes('TOTAL ALLOCATED') ||
        rawName.toUpperCase().includes('UNALLOCATED PLANNED')
      ) {
        extracted.push({
          id: `slot-${idx}`,
          slotIndex: idx,
          name: '',
          defaultPct: 0,
        });
        continue;
      }
      const pct = parseExcelPct(row[1]);
      if (rawName !== '') {
        importedCatCount++;
      }
      extracted.push({
        id: `slot-${idx}`,
        slotIndex: idx,
        name: rawName,
        defaultPct: rawName !== '' ? (pct ?? 0.05) : 0,
      });
    }

    if (importedCatCount > 0) {
      updatedSlots = extracted;
      sheetNamesRead.push(dashSheetName);
    }
  }

  const activeSlots = updatedSlots || currentSlots || DEFAULT_CATEGORY_SLOTS;

  // 2. Parse transactions from '1_Main_Log' or the first sheet
  const logSheetName =
    wb.SheetNames.find(
      (n) =>
        n.toLowerCase() === '1_main_log' ||
        n.toLowerCase().includes('main_log') ||
        n.toLowerCase().includes('log')
    ) || wb.SheetNames[0];

  const transactions: Transaction[] = [];

  if (logSheetName) {
    const logSheet = wb.Sheets[logSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(logSheet, {
      header: 1,
      defval: '',
    });

    if (!sheetNamesRead.includes(logSheetName)) {
      sheetNamesRead.push(logSheetName);
    }

    // Locate header row or start at row index 3 (Row 4 in 1_Main_Log)
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const rowStr = (rows[r] || []).map((c) => String(c).toLowerCase()).join(' | ');
      if (
        rowStr.includes('flow type') ||
        rowStr.includes('category') ||
        rowStr.includes('input amount') ||
        rowStr.includes('payment method')
      ) {
        headerRowIdx = r;
        break;
      }
    }

    // Default column mapping for 1_Main_Log (Cols A to H -> indices 0 to 7)
    let colTime = 0;
    let colDate = 1;
    let colFlow = 2;
    let colCategory = 3;
    let colPurpose = 4;
    let colMethod = 5;
    let colIn = 6;
    let colOut = 7;
    let colSingleAmount = -1;

    if (headerRowIdx !== -1) {
      const headers = (rows[headerRowIdx] || []).map((h) =>
        String(h || '').toLowerCase().trim()
      );
      headers.forEach((h, idx) => {
        if (h.includes('entry time') || h === 'time' || h === 'timestamp') colTime = idx;
        else if (h.includes('date')) colDate = idx;
        else if (h.includes('flow') || h === 'type') colFlow = idx;
        else if (h.includes('category') || h.includes('source')) colCategory = idx;
        else if (h.includes('purpose') || h.includes('person') || h.includes('description') || h.includes('detail'))
          colPurpose = idx;
        else if (h.includes('method') || h.includes('payment')) colMethod = idx;
        else if (h.includes('input amount') || h.includes('(in)') || h === 'in' || h === 'incoming' || h === 'inflow')
          colIn = idx;
        else if (h.includes('output amount') || h.includes('(out)') || h === 'out' || h === 'outgoing' || h === 'outflow' || h === 'spent')
          colOut = idx;
        else if (h === 'amount' || h.includes('amount (rs')) colSingleAmount = idx;
      });
    }

    const dataStartIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 3;

    for (let r = dataStartIdx; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawCatVal = String(row[colCategory] ?? '').trim();
      const rawPurpVal = String(row[colPurpose] ?? '').trim();
      const inVal = colIn >= 0 ? parseExcelNumber(row[colIn]) : 0;
      const outVal = colOut >= 0 ? parseExcelNumber(row[colOut]) : 0;
      const singleAmt = colSingleAmount >= 0 ? parseExcelNumber(row[colSingleAmount]) : 0;

      if (inVal === 0 && outVal === 0 && singleAmt === 0) {
        continue;
      }

      // Skip summary or header rows if encountered
      if (
        rawCatVal.toUpperCase().includes('TOTAL') ||
        rawCatVal.toLowerCase().includes('category / income source')
      ) {
        continue;
      }

      const dateStr = excelCellToDateStr(row[colDate], allowedYear, allowedMonth);

      const catMatch = matchCategoryInPlace(rawCatVal, activeSlots);
      const resolvedCategory = catMatch
        ? catMatch.name
        : rawCatVal || (inVal > 0 ? 'Other Income' : 'Miscellaneous');

      const rawFlowStr = String(row[colFlow] ?? '').trim().toLowerCase();
      let flowType: FlowType = 'Outgoing';
      if (inVal > 0 && outVal === 0) {
        flowType = 'Incoming';
      } else if (outVal > 0 && inVal === 0) {
        flowType = 'Outgoing';
      } else if (rawFlowStr.startsWith('in')) {
        flowType = 'Incoming';
      } else if (catMatch) {
        flowType = catMatch.flow;
      } else if (INCOMING_SOURCES.includes(resolvedCategory as any)) {
        flowType = 'Incoming';
      }

      const finalIn =
        flowType === 'Incoming' ? (inVal > 0 ? inVal : singleAmt) : 0;
      const finalOut =
        flowType === 'Outgoing' ? (outVal > 0 ? outVal : singleAmt) : 0;

      if (finalIn <= 0 && finalOut <= 0) continue;

      const method: PaymentMethod = parseSmartMethodInPlace(
        String(row[colMethod] ?? 'Cash')
      );

      let entryTimeIso: string;
      const rawTimeCell = row[colTime];
      if (rawTimeCell instanceof Date && !isNaN(rawTimeCell.getTime())) {
        entryTimeIso = rawTimeCell.toISOString();
      } else {
        const [yr, mo, dy] = dateStr.split('-').map(Number);
        entryTimeIso = new Date(yr, (mo || 1) - 1, dy || 1, 12, 0, r % 60).toISOString();
      }

      transactions.push({
        id: `xlsx-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
        entryTime: entryTimeIso,
        date: dateStr,
        flowType,
        category: resolvedCategory,
        purpose: rawPurpVal || `${resolvedCategory} Entry`,
        method,
        inAmount: finalIn,
        outAmount: finalOut,
      });
    }
  }

  return {
    transactions: sortTransactionsIncreasing(transactions),
    categorySlots: updatedSlots,
    importedTxCount: transactions.length,
    importedCatCount,
    sheetNamesRead,
  };
}

/**
 * Generates a complete 7-sheet .xlsx workbook matching the Google Apps Script layout
 * so users can export to Excel / Google Sheets and re-import anytime with 100% fidelity.
 */
export function generateWorkbookBuffer(
  transactions: Transaction[],
  categorySlots: CategoryAllocationSlot[],
  activeMonthInput: string,
  incomeSources: readonly string[] = DEFAULT_INCOMING_SOURCES
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const sortedTxs = sortTransactionsIncreasing(transactions);
  const dash = computeDashboardSummary(
    sortedTxs,
    categorySlots,
    activeMonthInput,
    new Date(),
    incomeSources
  );
  const isl = computeIncomeSavingsLoans(sortedTxs, dash, incomeSources);
  const wk = computeWeeklyBreakdown(sortedTxs, dash);
  const pm = computePurposeAndMethods(sortedTxs, dash);
  const yr = computeYearly12MMatrix(
    sortedTxs,
    categorySlots,
    dash.activeYear,
    incomeSources
  );

  const totalIn = sortedTxs.reduce((a, t) => a + t.inAmount, 0);
  const totalOut = sortedTxs.reduce((a, t) => a + t.outAmount, 0);

  // Sheet 1: 1_Main_Log
  const mainLogAoA: any[][] = [
    ['1. MASTER MONTHLY TRANSACTION LOG (AUTO-SORTED IN INCREASING DATE ORDER | 1 MONTH ALLOWED)'],
    [
      'Logged Transactions:',
      sortedTxs.length,
      'Total Incoming:',
      totalIn,
      'Total Outgoing:',
      totalOut,
      'Net Monthly Savings:',
      totalIn - totalOut,
    ],
    [
      'Entry Time (Auto if Blank)',
      'Date (Old or Today - Auto if Blank)',
      'Flow Type',
      'Category / Income Source',
      'Specific Purpose / Person',
      'Payment Method',
      'Input Amount (IN)',
      'Output Amount (OUT)',
    ],
    ...sortedTxs.map((tx) => [
      formatEntryTimestamp(tx.entryTime),
      formatDateDisplay(tx.date),
      tx.flowType,
      tx.category,
      tx.purpose,
      tx.method,
      tx.inAmount > 0 ? tx.inAmount : '',
      tx.outAmount > 0 ? tx.outAmount : '',
    ]),
  ];
  const wsMainLog = XLSX.utils.aoa_to_sheet(mainLogAoA);
  XLSX.utils.book_append_sheet(wb, wsMainLog, '1_Main_Log');

  // Sheet 2: 2_Monthly_Dashboard
  const dashAoA: any[][] = [
    ['2. MONTHLY FINANCIAL COMMAND CENTER (DYNAMIC % ALLOCATION & GREEN/RED ENGINE)'],
    [
      'Active Month (or Blank):',
      activeMonthInput,
      dash.activeMonthLabel,
      `ACTIVE VIEW: ${dash.activeMonthLabel.toUpperCase()}`,
      '',
      '',
      'Daily Safe Spend:',
      dash.dailySafeSpendText,
    ],
    [],
    ['INCOMING SOURCES POOL & MONTHLY CASHFLOW OVERVIEW'],
    [
      'Salary',
      'Bonus',
      'Gifts (In)',
      'Loans (Taken)',
      'Loan Rec. & Other',
      'TOTAL INCOMING',
      'TOTAL SPENT',
      'NET SAVINGS',
      'UNALLOCATED TARGET',
    ],
    [
      dash.salary,
      dash.bonus,
      dash.giftsIn,
      dash.loansTaken,
      dash.loanRecAndOther,
      dash.totalIncoming,
      dash.totalSpent,
      dash.netSavings,
      dash.unallocatedTargetRs,
    ],
    [
      dash.salaryShare,
      dash.bonusShare,
      dash.giftsInShare,
      dash.loansTakenShare,
      dash.loanRecAndOtherShare,
      dash.totalIncomingShare,
      dash.totalSpentShare,
      dash.netSavingsShare,
      dash.unallocatedTargetPct,
    ],
    [],
    ['SADAQAH GOAL, DUAL LOAN TRACKER (PAYABLE VS RECEIVABLE) & NET SAVINGS VAULT'],
    [
      'Sadaqah Left to Give (This Month)',
      '',
      'Net Payable Loans (Debt You Owe)',
      '',
      'Net Receivable Loans (Owed to You)',
      '',
      'Net Retained Savings Vault',
    ],
    [
      dash.sadaqahGoalText,
      '',
      dash.netPayableLoans,
      '',
      dash.netReceivableLoans,
      '',
      dash.netRetainedSavingsVault,
    ],
    [],
    ['DYNAMIC CATEGORY % ALLOCATION TABLE (ADD, RENAME OR REMOVE CATEGORIES ANYTIME IN COL A)'],
    [
      'Expense Category (Editable)',
      'Default %',
      'Allocated Limit (Rs.)',
      'Actual Spent (Rs.)',
      'Remaining / Over (Rs.)',
      'Actual % of Income',
      'Tx Count',
      'Usage Ratio',
      'Live Status (GREEN / RED)',
    ],
  ];

  // Rows 15 to 30 (exact 16 slots so re-importing preserves all 16 slots)
  for (let i = 0; i < 16; i++) {
    const slot = categorySlots[i] || { name: '', defaultPct: 0 };
    const computed = dash.categoryRows.find((r) => r.slotIndex === i);
    if (slot.name.trim() !== '' && computed) {
      dashAoA.push([
        computed.name,
        computed.defaultPct,
        computed.allocatedLimit,
        computed.actualSpent,
        computed.remainingOrOver,
        computed.actualPctOfIncome,
        computed.txCount,
        computed.usageRatio,
        computed.statusText,
      ]);
    } else {
      dashAoA.push(['', 0, '', '', '', '', '', '', '']);
    }
  }

  dashAoA.push([
    'TOTAL ALLOCATED TO CATEGORIES',
    dash.totalAllocatedPct,
    dash.totalAllocatedLimit,
    dash.totalCategorySpent,
    dash.totalCategoryRemaining,
    dash.totalCategoryPctOfIncome,
    dash.totalCategoryTxCount,
    '',
    dash.totalAllocationStatusText,
  ]);
  dashAoA.push([
    'UNALLOCATED PLANNED TARGET SAVINGS',
    dash.unallocatedPlannedPct,
    dash.unallocatedPlannedRs,
    dash.actualNetSavingsRs,
    dash.savingsDiffRs,
    dash.actualNetSavingsPctOfIncome,
    '-',
    '',
    dash.savingsTargetStatusText,
  ]);

  const wsDash = XLSX.utils.aoa_to_sheet(dashAoA);
  XLSX.utils.book_append_sheet(wb, wsDash, '2_Monthly_Dashboard');

  // Sheet 3: 3_Income_Savings_Loans
  const islAoA: any[][] = [
    ['3. INCOMING SOURCES, 3-TIER CONNECTED NET SAVINGS VAULT & DUAL LOAN LEDGER'],
    ['Active Month:', activeMonthInput, dash.activeMonthLabel],
    [],
    ['A. ACTIVE MONTH INCOMING SOURCES BREAKDOWN'],
    ['Incoming Source', 'Tx Count', 'Monthly Amount (Rs.)', '% Share', 'Total Logged'],
    ...isl.sourceRows.map((r) => [
      r.source,
      r.txCount,
      r.monthlyAmount,
      r.sharePct,
      r.totalLogged,
    ]),
    [
      'TOTAL INCOMING',
      isl.totalIncomingTxCount,
      isl.totalIncomingMonthly,
      1,
      isl.totalIncomingAllTime,
    ],
    [],
    ['B. 3-TIER CONNECTED NET SAVINGS MECHANICS'],
    ['Savings Metric / Tier', 'Value / Amount', 'Connected Status'],
    ...isl.savingsMechanics.map((m) => [m.metric, m.valueFormatted, m.status]),
    [],
    ['C. DUAL LOAN & GIFT TRACKER'],
    ['Loan / Gift Dimension', 'Total Inflow', 'Total Outflow', 'Net Position', 'Active Month Net'],
    ...isl.dualLoanDimensions.map((d) => [
      d.dimension,
      d.totalInflow,
      d.totalOutflow,
      d.netPosition,
      d.activeMonthNet,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(islAoA), '3_Income_Savings_Loans');

  // Sheet 5: 5_Weekly_Breakdown
  const wkAoA: any[][] = [
    ['5. WEEKLY BREAKDOWN MATRIX (WEEKS 1 TO 5 SPENDING, INCOMING & NET SAVINGS)'],
    [
      'Category (Linked to Dashboard)',
      'Monthly Limit (Rs.)',
      'Week 1 (Days 1-7)',
      'Week 2 (Days 8-14)',
      'Week 3 (Days 15-21)',
      'Week 4 (Days 22-28)',
      'Week 5 (Days 29-31)',
      'Monthly Total',
      'Weekly Average',
      'Status vs Limit',
    ],
    ...wk.rows.map((r) => [
      r.category,
      r.monthlyLimit,
      ...r.weeks,
      r.monthlyTotal,
      r.weeklyAverage,
      r.statusText,
    ]),
    [
      'TOTAL WEEKLY OUTGOING',
      dash.totalAllocatedLimit,
      ...wk.totalWeeklyOutgoing,
      wk.totalOutgoingSum,
      wk.totalOutgoingAvg,
      dash.totalAllocationStatusText,
    ],
    [
      'TOTAL WEEKLY INCOMING',
      dash.totalIncoming,
      ...wk.totalWeeklyIncoming,
      wk.totalIncomingSum,
      wk.totalIncomingAvg,
      '100% INFLOW',
    ],
    [
      'WEEKLY NET SAVINGS (IN - OUT)',
      dash.totalIncoming - dash.totalAllocatedLimit,
      ...wk.weeklyNetSavings,
      wk.netSavingsSum,
      wk.netSavingsAvg,
      dash.savingsTargetStatusText,
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wkAoA), '5_Weekly_Breakdown');

  // Sheet 6: 6_Purpose_&_Methods
  const pmAoA: any[][] = [
    ['6. PURPOSE INTELLIGENCE & PAYMENT METHOD ANALYTICS'],
    ['Payment Method', 'Tx Count (Out)', 'Monthly Incoming', 'Monthly Outgoing', 'Monthly Net Flow'],
    ...pm.methodRows.map((m) => [
      m.method,
      m.txCountOut,
      m.monthlyIncoming,
      m.monthlyOutgoing,
      m.monthlyNetFlow,
    ]),
    [
      'TOTAL ALL METHODS',
      pm.totalMethodStats.txCountOut,
      pm.totalMethodStats.monthlyIncoming,
      pm.totalMethodStats.monthlyOutgoing,
      pm.totalMethodStats.monthlyNetFlow,
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pmAoA), '6_Purpose_&_Methods');

  // Sheet 7: 7_Yearly_12M_Matrix
  const yrAoA: any[][] = [
    [`7. ANNUAL 12-MONTH INTERCONNECTED MATRIX (${yr.activeYear})`],
    ['Income Source / Expense Category', ...MONTH_NAMES_SHORT, 'Annual Total', 'Monthly Avg'],
    ...yr.incomingMatrixRows.map((r) => [r.label, ...r.months, r.annualTotal, r.monthlyAvg]),
    [
      'TOTAL MONTHLY INCOMING',
      ...yr.totalIncomingRow.months,
      yr.totalIncomingRow.annualTotal,
      yr.totalIncomingRow.monthlyAvg,
    ],
    ...yr.categoryMatrixRows.map((r) => [r.label, ...r.months, r.annualTotal, r.monthlyAvg]),
    [
      'TOTAL MONTHLY OUTGOING',
      ...yr.totalOutgoingRow.months,
      yr.totalOutgoingRow.annualTotal,
      yr.totalOutgoingRow.monthlyAvg,
    ],
    [
      'NET MONTHLY SAVINGS (IN - OUT)',
      ...yr.netSavingsRow.months,
      yr.netSavingsRow.annualTotal,
      yr.netSavingsRow.monthlyAvg,
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(yrAoA), '7_Yearly_12M_Matrix');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(out);
}
