export type FlowType = 'Incoming' | 'Outgoing';
export type PaymentMethod = 'Digital' | 'Cash' | 'Credit';

export type IncomingSourceName =
  | 'Salary'
  | 'Bonus'
  | 'Gifts'
  | 'Loans'
  | 'Loan Recovery'
  | 'Other Income';

export interface Transaction {
  id: string;
  entryTime: string; // ISO string or formatted timestamp
  date: string; // YYYY-MM-DD
  flowType: FlowType;
  category: string;
  purpose: string;
  method: PaymentMethod;
  inAmount: number;
  outAmount: number;
}

export interface CategoryAllocationSlot {
  id: string;
  slotIndex: number; // 0 to 15 (corresponding to rows 15 to 30 in Dashboard)
  name: string;
  defaultPct: number; // e.g. 0.05 for 5.0%
}

export type SheetTabId =
  | '1_Main_Log'
  | '2_Monthly_Dashboard'
  | '3_Income_Savings_Loans'
  | '4_Category_Organizer'
  | '5_Weekly_Breakdown'
  | '6_Purpose_&_Methods'
  | '7_Yearly_12M_Matrix';

export interface ParsedDateResult {
  dateStr: string; // YYYY-MM-DD
  monthChanged: boolean;
  displayLabel: string; // dd-MMM-yyyy
}

export interface CategoryComputedRow {
  slotIndex: number;
  name: string;
  defaultPct: number;
  allocatedLimit: number;
  actualSpent: number;
  remainingOrOver: number;
  actualPctOfIncome: number;
  txCount: number;
  usageRatio: number; // 0 to 1
  isSafe: boolean;
  statusText: string;
}

export interface IncomingSourceBreakdownItem {
  name: string;
  amount: number;
  share: number;
}

export interface DashboardSummary {
  activeMonthLabel: string; // e.g. "October 2026"
  activeYear: number;
  activeMonthIndex: number; // 0-11
  isCurrentMonthView: boolean;
  dailySafeSpendText: string;
  dailySafeSpendAmount: number;
  remainingDaysInMonth: number;
  // Dynamic Incoming Sources Breakdown
  incomingSourceBreakdown: IncomingSourceBreakdownItem[];
  // Incoming Pool
  salary: number;
  bonus: number;
  giftsIn: number;
  loansTaken: number;
  loanRecAndOther: number;
  totalIncoming: number;
  totalSpent: number;
  netSavings: number;
  unallocatedTargetRs: number;
  // Shares
  salaryShare: number;
  bonusShare: number;
  giftsInShare: number;
  loansTakenShare: number;
  loanRecAndOtherShare: number;
  totalIncomingShare: number;
  totalSpentShare: number;
  netSavingsShare: number;
  unallocatedTargetPct: number;
  // Vault & Goals
  sadaqahGoalText: string;
  sadaqahLeftAmount: number;
  netPayableLoans: number;
  netReceivableLoans: number;
  netRetainedSavingsVault: number;
  // Category Table
  categoryRows: CategoryComputedRow[];
  totalAllocatedPct: number;
  totalAllocatedLimit: number;
  totalCategorySpent: number;
  totalCategoryRemaining: number;
  totalCategoryPctOfIncome: number;
  totalCategoryTxCount: number;
  totalAllocationStatusText: string;
  isTotalWithinAllocation: boolean;
  isOverAllocatedPct: boolean;
  // Row 32: Unallocated Planned Target Savings
  unallocatedPlannedPct: number;
  unallocatedPlannedRs: number;
  actualNetSavingsRs: number;
  savingsDiffRs: number;
  actualNetSavingsPctOfIncome: number;
  savingsTargetMet: boolean;
  savingsTargetStatusText: string;
}
