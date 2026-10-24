import React, { useEffect, useRef, useState } from 'react';
import {
  CategoryAllocationSlot,
  FlowType,
  SheetTabId,
  Transaction,
} from './types/finance';
import {
  DEFAULT_CATEGORY_SLOTS,
  DEFAULT_INCOMING_SOURCES,
  computeDashboardSummary,
  matchCategoryInPlace,
  parseSmartDateInPlace,
  parseSmartMethodInPlace,
  sortTransactionsIncreasing,
} from './utils/financialEngine';
import { INITIAL_SEED_TRANSACTIONS } from './utils/seedData';
import {
  UserAccount,
  UserVaultData,
  evaluateSubscriptionState,
  getActiveSessionUser,
  loadUserVault,
  saveUserVault,
  setActiveSessionUser,
  syncUserAccountWithCloud,
} from './utils/authVault';
import {
  generateWorkbookBuffer,
  parseWorkbookBuffer,
} from './utils/xlsxHelper';
import { AuthGate } from './components/AuthGate';
import { MainLogView } from './components/MainLogView';
import { MonthlyDashboardView } from './components/MonthlyDashboardView';
import { IncomeSavingsLoansView } from './components/IncomeSavingsLoansView';
import { CategoryOrganizerView } from './components/CategoryOrganizerView';
import { WeeklyBreakdownView } from './components/WeeklyBreakdownView';
import { PurposeMethodsView } from './components/PurposeMethodsView';
import { YearlyMatrixView } from './components/YearlyMatrixView';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { PaywallGate } from './components/PaywallGate';
import { AdminMasterPanel } from './components/AdminMasterPanel';
import {
  DropdownOption,
  FLOW_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  SmoothCombobox,
  SmoothSelect,
  buildCategoryDropdownOptions,
  buildMonthDropdownOptions,
} from './components/SmoothDropdown';
import {
  Cloud,
  CloudOff,
  Download,
  FileSpreadsheet,
  LogOut,
  Plus,
  RotateCcw,
  Shield,
  Upload,
  UserCircle2,
  X,
} from 'lucide-react';

const SHEET_TABS: Array<{
  id: SheetTabId;
  shortNum: string;
  label: string;
  sublabel: string;
  sheetCode: string;
}> = [
  {
    id: '1_Main_Log',
    shortNum: '01',
    label: 'Transactions',
    sublabel: 'Add & view all income and expenses',
    sheetCode: '1_Main_Log',
  },
  {
    id: '2_Monthly_Dashboard',
    shortNum: '02',
    label: 'Monthly Overview',
    sublabel: 'Category budgets, charity goal & safe spend',
    sheetCode: '2_Monthly_Dashboard',
  },
  {
    id: '3_Income_Savings_Loans',
    shortNum: '03',
    label: 'Income, Savings & Loans',
    sublabel: 'Income sources, savings & loan balances',
    sheetCode: '3_Income_Savings_Loans',
  },
  {
    id: '4_Category_Organizer',
    shortNum: '04',
    label: 'Category Explorer',
    sublabel: 'Inspect each category & top 6 everyday areas',
    sheetCode: '4_Category_Organizer',
  },
  {
    id: '5_Weekly_Breakdown',
    shortNum: '05',
    label: 'Weekly Spending',
    sublabel: 'Week 1 to Week 5 spending & savings',
    sheetCode: '5_Weekly_Breakdown',
  },
  {
    id: '6_Purpose_&_Methods',
    shortNum: '06',
    label: 'Payment Methods',
    sublabel: 'Digital, Cash, Credit & biggest expenses',
    sheetCode: '6_Purpose_&_Methods',
  },
  {
    id: '7_Yearly_12M_Matrix',
    shortNum: '07',
    label: 'Yearly Summary (12M)',
    sublabel: 'Full Jan–Dec month-by-month overview',
    sheetCode: '7_Yearly_12M_Matrix',
  },
];

function checkIsMasterRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return path === '/master' || path.startsWith('/master/') || hash === '#master';
}

export default function App() {
  const [isMasterRoute, setIsMasterRoute] = useState<boolean>(() => checkIsMasterRoute());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() =>
    getActiveSessionUser()
  );
  const [activeTab, setActiveTab] = useState<SheetTabId>('2_Monthly_Dashboard');

  const initialVault = currentUser
    ? loadUserVault(currentUser.username)
    : {
        transactions: INITIAL_SEED_TRANSACTIONS,
        categorySlots: DEFAULT_CATEGORY_SLOTS,
        incomeSources: [...DEFAULT_INCOMING_SOURCES],
        activeMonthInput: '',
      };

  const [transactions, setTransactions] = useState<Transaction[]>(
    initialVault.transactions
  );
  const [categorySlots, setCategorySlots] = useState<CategoryAllocationSlot[]>(
    initialVault.categorySlots
  );
  const [incomeSources, setIncomeSources] = useState<string[]>(
    initialVault.incomeSources && initialVault.incomeSources.length > 0
      ? initialVault.incomeSources
      : [...DEFAULT_INCOMING_SOURCES]
  );
  const [activeMonthInput, setActiveMonthInput] = useState<string>(
    initialVault.activeMonthInput
  );

  const [inspectedCategory, setInspectedCategory] = useState<string>('Food & Dining');
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Offline / Online + Cloud Sync status
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCloudSync, setPendingCloudSync] = useState<boolean>(
    Boolean(initialVault.pendingSync)
  );
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>(
    'Saved locally on device & cloud-ready'
  );
  const [tableMissing, setTableMissing] = useState<boolean>(false);

  const [xlsxFeedback, setXlsxFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Modal form state — NO pre-filled default dropdown values
  const [modalDate, setModalDate] = useState('');
  const [modalCategory, setModalCategory] = useState('');
  const [modalFlow, setModalFlow] = useState<FlowType | ''>('');
  const [modalPurpose, setModalPurpose] = useState('');
  const [modalMethod, setModalMethod] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Listen to browser navigation for /master
  useEffect(() => {
    const onPopState = () => {
      setIsMasterRoute(checkIsMasterRoute());
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  const openMasterAdminPanel = () => {
    try {
      window.history.pushState({}, '', '/master');
    } catch {
      window.location.hash = 'master';
    }
    setIsMasterRoute(true);
  };

  const closeMasterAdminPanel = () => {
    try {
      window.history.pushState({}, '', '/');
    } catch {
      window.location.hash = '';
    }
    setIsMasterRoute(false);
    // Refresh currentUser in case admin verified their subscription in /master
    const refreshed = getActiveSessionUser();
    if (refreshed) {
      setCurrentUser(refreshed);
    }
  };

  // Save active user's vault locally + queue cloud sync whenever data changes
  useEffect(() => {
    if (!currentUser) return;
    saveUserVault(currentUser.username, {
      transactions,
      categorySlots,
      incomeSources,
      activeMonthInput,
    });
    setPendingCloudSync(!navigator.onLine);
  }, [currentUser, transactions, categorySlots, incomeSources, activeMonthInput]);

  // Listen for online / offline events to automatically sync offline edits when internet returns
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (currentUser) {
        setIsSyncingCloud(true);
        try {
          const res = await syncUserAccountWithCloud(currentUser.username);
          if (res.synced) {
            setCurrentUser(res.account);
            setTransactions(res.vault.transactions);
            setCategorySlots(res.vault.categorySlots);
            setIncomeSources(res.vault.incomeSources);
            setActiveMonthInput(res.vault.activeMonthInput);
            setPendingCloudSync(false);
          }
        } finally {
          setIsSyncingCloud(false);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // Initial background cloud sync when user logs in or opens app while online
  useEffect(() => {
    if (!currentUser || !isOnline) return;
    let cancelled = false;
    setIsSyncingCloud(true);
    syncUserAccountWithCloud(currentUser.username)
      .then((res) => {
        if (cancelled) return;
        setSyncStatusMessage(res.message);
        setTableMissing(Boolean(res.tableMissing));
        if (res.synced) {
          setCurrentUser(res.account);
          setTransactions(res.vault.transactions);
          setCategorySlots(res.vault.categorySlots);
          setIncomeSources(res.vault.incomeSources);
          setActiveMonthInput(res.vault.activeMonthInput);
          setPendingCloudSync(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsSyncingCloud(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.username]);

  const handleUserAuthenticated = (
    account: UserAccount,
    cloudVault?: UserVaultData
  ) => {
    const userVault = cloudVault || loadUserVault(account.username);
    setTransactions(userVault.transactions);
    setCategorySlots(userVault.categorySlots);
    setIncomeSources(
      userVault.incomeSources && userVault.incomeSources.length > 0
        ? userVault.incomeSources
        : [...DEFAULT_INCOMING_SOURCES]
    );
    setActiveMonthInput(userVault.activeMonthInput);
    setCurrentUser(account);
    setXlsxFeedback(null);
  };

  const handleSignOut = () => {
    setActiveSessionUser(null);
    setCurrentUser(null);
    setIsAccountModalOpen(false);
    setIsResetModalOpen(false);
    setXlsxFeedback(null);
  };

  const dashboard = computeDashboardSummary(
    transactions,
    categorySlots,
    activeMonthInput,
    new Date(),
    incomeSources
  );

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const created: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setTransactions((prev) => sortTransactionsIncreasing([...prev, created]));
  };

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      sortTransactionsIncreasing(
        prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
      )
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleUpdateCategorySlot = (
    slotIndex: number,
    updates: Partial<CategoryAllocationSlot>
  ) => {
    setCategorySlots((prev) =>
      prev.map((slot) => {
        if (slot.slotIndex !== slotIndex) return slot;
        const oldName = slot.name.trim();
        const updatedSlot = { ...slot, ...updates };
        const newName = updatedSlot.name.trim();
        if (
          updates.name !== undefined &&
          oldName !== '' &&
          newName !== '' &&
          oldName !== newName
        ) {
          setTransactions((txList) =>
            txList.map((t) =>
              t.category === oldName ? { ...t, category: newName } : t
            )
          );
        }
        return updatedSlot;
      })
    );
  };

  const handleAddIncomeSource = (newSource: string) => {
    const cleaned = newSource.trim();
    if (!cleaned) return;
    setIncomeSources((prev) => {
      if (prev.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
        return prev;
      }
      return [...prev, cleaned];
    });
  };

  const handleRemoveIncomeSource = (sourceToRemove: string) => {
    setIncomeSources((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s !== sourceToRemove);
    });
  };

  const handleInspectCategoryFromDashboard = (categoryName: string) => {
    setInspectedCategory(categoryName);
    setActiveTab('4_Category_Organizer');
  };

  const handleExportXlsx = () => {
    try {
      const buffer = generateWorkbookBuffer(
        transactions,
        categorySlots,
        activeMonthInput,
        incomeSources
      );
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const userTag = currentUser ? `${currentUser.username}_` : '';
      link.setAttribute(
        'download',
        `Financial_Tracker_${userTag}${dashboard.activeMonthLabel.replace(/\s+/g, '_')}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setXlsxFeedback({
        type: 'success',
        message: `Exported 7-sheet .xlsx workbook (${transactions.length} transactions).`,
      });
    } catch {
      setXlsxFeedback({
        type: 'error',
        message: 'Failed to export .xlsx workbook.',
      });
    }
  };

  const handleImportXlsxFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuf = await file.arrayBuffer();
      const result = parseWorkbookBuffer(
        arrayBuf,
        categorySlots,
        dashboard.activeYear,
        dashboard.activeMonthIndex
      );

      if (result.importedTxCount === 0 && !result.categorySlots) {
        setXlsxFeedback({
          type: 'error',
          message: `No valid transactions or category allocations found in "${file.name}".`,
        });
        e.target.value = '';
        return;
      }

      if (result.categorySlots) {
        setCategorySlots(result.categorySlots);
      }
      if (result.importedTxCount > 0) {
        setTransactions(result.transactions);
      }

      const catNotice =
        result.importedCatCount > 0
          ? ` + ${result.importedCatCount} category allocations`
          : '';
      setXlsxFeedback({
        type: 'success',
        message: `Imported ${result.importedTxCount} transactions${catNotice} from "${file.name}".`,
      });
    } catch {
      setXlsxFeedback({
        type: 'error',
        message: `Could not parse "${file.name}". Ensure it is a valid .xlsx, .xls, or .csv file.`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Entry Time',
      'Date',
      'Flow Type',
      'Category / Income Source',
      'Specific Purpose / Person',
      'Payment Method',
      'Input Amount (IN)',
      'Output Amount (OUT)',
    ];
    const rows = transactions.map((t) => [
      `"${t.entryTime}"`,
      `"${t.date}"`,
      `"${t.flowType}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${t.purpose.replace(/"/g, '""')}"`,
      `"${t.method}"`,
      t.inAmount,
      t.outAmount,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Financial_Tracker_${dashboard.activeMonthLabel.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleManualSyncNow = async () => {
    if (!currentUser) return;
    setIsSyncingCloud(true);
    try {
      const res = await syncUserAccountWithCloud(currentUser.username);
      setSyncStatusMessage(res.message);
      setTableMissing(Boolean(res.tableMissing));
      if (res.synced) {
        setCurrentUser(res.account);
        setTransactions(res.vault.transactions);
        setCategorySlots(res.vault.categorySlots);
        setIncomeSources(res.vault.incomeSources);
        setActiveMonthInput(res.vault.activeMonthInput);
        setPendingCloudSync(false);
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleConfirmedAccountReset = (mode: 'empty' | 'sample') => {
    if (mode === 'empty') {
      setTransactions([]);
      setCategorySlots(DEFAULT_CATEGORY_SLOTS);
      setIncomeSources([...DEFAULT_INCOMING_SOURCES]);
      setActiveMonthInput('');
      setXlsxFeedback({
        type: 'success',
        message: `Account @${currentUser?.username} database has been wiped clean (0 transactions).`,
      });
    } else {
      setTransactions(INITIAL_SEED_TRANSACTIONS);
      setCategorySlots(DEFAULT_CATEGORY_SLOTS);
      setIncomeSources([...DEFAULT_INCOMING_SOURCES]);
      setActiveMonthInput('');
      setXlsxFeedback({
        type: 'success',
        message: `Account @${currentUser?.username} restored to sample transactions and default categories.`,
      });
    }
    setIsResetModalOpen(false);
  };

  const handleQuickModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const numAmt = parseFloat(modalAmount.replace(/,/g, ''));
    if (isNaN(numAmt) || numAmt <= 0) {
      setModalError('Enter a valid amount in Rs.');
      return;
    }

    const matchedCat = matchCategoryInPlace(
      modalCategory,
      categorySlots,
      incomeSources
    );
    const finalCat = matchedCat ? matchedCat.name : modalCategory.trim();
    if (!finalCat) {
      setModalError('Please choose or type a category or income source.');
      return;
    }
    const finalFlow: FlowType = matchedCat
      ? matchedCat.flow
      : incomeSources.some((s) => s.toLowerCase() === finalCat.toLowerCase())
      ? 'Incoming'
      : modalFlow || 'Outgoing';

    const parsedDate = parseSmartDateInPlace(
      modalDate,
      dashboard.activeYear,
      dashboard.activeMonthIndex
    );
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

    handleAddTransaction({
      entryTime: stampedTime,
      date: parsedDate.dateStr,
      flowType: finalFlow,
      category: finalCat,
      purpose: modalPurpose.trim() || `${finalCat} Entry`,
      method: parseSmartMethodInPlace(modalMethod || 'Digital'),
      inAmount: finalFlow === 'Incoming' ? Math.round(numAmt) : 0,
      outAmount: finalFlow === 'Outgoing' ? Math.round(numAmt) : 0,
    });

    setModalAmount('');
    setModalPurpose('');
    setModalDate('');
    setModalCategory('');
    setModalMethod('');
    setModalFlow('');
    setIsQuickModalOpen(false);
  };

  // 1. If URL is /master, render the Master Admin Panel
  if (isMasterRoute) {
    return <AdminMasterPanel onExitMasterPanel={closeMasterAdminPanel} />;
  }

  // 2. If not signed in, render AuthGate
  if (!currentUser) {
    return (
      <AuthGate
        onAuthenticated={handleUserAuthenticated}
        onOpenAdminPanel={openMasterAdminPanel}
      />
    );
  }

  // 3. Evaluate 7-Day Free Trial / Rs. 1,000 Subscription Paywall
  const subscriptionState = evaluateSubscriptionState(currentUser);
  if (subscriptionState.isPaywallLocked) {
    return (
      <>
        <PaywallGate
          account={currentUser}
          subscription={subscriptionState}
          onRefreshStatus={handleManualSyncNow}
          onAccountUpdated={setCurrentUser}
          onOpenAccountSettings={() => setIsAccountModalOpen(true)}
          onSignOut={handleSignOut}
        />
        <AccountSettingsModal
          isOpen={isAccountModalOpen}
          account={currentUser}
          subscription={subscriptionState}
          isOnline={isOnline}
          pendingSync={pendingCloudSync}
          syncStatusMessage={syncStatusMessage}
          tableMissing={tableMissing}
          onClose={() => setIsAccountModalOpen(false)}
          onSyncNow={handleManualSyncNow}
          onAccountUpdated={setCurrentUser}
          onOpenResetWarning={() => {
            setIsAccountModalOpen(false);
            setIsResetModalOpen(true);
          }}
        />
      </>
    );
  }

  const activeExpenseNames = categorySlots
    .map((s) => s.name.trim())
    .filter((n) => n !== '');

  const categoryDropdownOptions = buildCategoryDropdownOptions(
    activeExpenseNames,
    incomeSources
  );

  const monthOptions = buildMonthDropdownOptions(dashboard.activeYear);

  const sheetSelectOptions: DropdownOption[] = SHEET_TABS.map((t) => ({
    value: t.id,
    label: `${t.shortNum}. ${t.label}`,
    sublabel: t.sublabel,
  }));

  const modalCatMatch = matchCategoryInPlace(
    modalCategory,
    categorySlots,
    incomeSources
  );
  const modalShortcutHint =
    modalCatMatch &&
    modalCatMatch.name.toLowerCase() !== modalCategory.trim().toLowerCase()
      ? {
          matchedLabel: modalCatMatch.name,
          badgeText: modalCatMatch.flow === 'Incoming' ? 'Money In' : 'Expense',
          badgeTone:
            modalCatMatch.flow === 'Incoming'
              ? ('green' as const)
              : ('red' as const),
        }
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 lg:gap-8 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('2_Monthly_Dashboard');
          }}
          className="text-sm sm:text-base font-bold tracking-tight text-[#1b2a4a] whitespace-nowrap shrink-0"
        >
          Ultimate Financial Tracker
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Workspace Views"
          className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600"
        >
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('2_Monthly_Dashboard');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === '2_Monthly_Dashboard'
                ? 'text-[#1b2a4a] font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Overview
          </a>
          <a
            href="#main-log"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('1_Main_Log');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === '1_Main_Log'
                ? 'text-[#1b2a4a] font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Transactions
          </a>
          <a
            href="#savings-loans"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('3_Income_Savings_Loans');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === '3_Income_Savings_Loans'
                ? 'text-[#1b2a4a] font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Savings & Loans
          </a>
          <a
            href="#categories"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('4_Category_Organizer');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === '4_Category_Organizer'
                ? 'text-[#1b2a4a] font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Categories
          </a>
          <a
            href="#annual-matrix"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('7_Yearly_12M_Matrix');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === '7_Yearly_12M_Matrix'
                ? 'text-[#1b2a4a] font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Yearly Summary
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsQuickModalOpen(true)}
            className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-[#1b2a4a] hover:bg-[#2c4268] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Add Transaction
          </button>
        </div>
      </header>

      {/* Workspace Command Toolbar: All 7 Connected Workbook Tabs + Global Month Sync + Account Details Logo */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Mobile Quick Sheet Jump SmoothSelect + 7-Sheet Selector Tabs */}
          <div className="w-full sm:w-auto flex items-center gap-2 min-w-0">
            <div className="sm:hidden w-full">
              <SmoothSelect
                id="mobile-sheet-select"
                ariaLabel="Choose section to view"
                value={activeTab}
                options={sheetSelectOptions}
                onChange={(val) => setActiveTab(val as SheetTabId)}
                variant="navy"
                menuMinWidth={280}
              />
            </div>

            <div
              role="tablist"
              aria-label="Financial Workbook Sheets"
              className="hidden sm:flex flex-wrap items-center gap-1 py-0.5"
            >
              {SHEET_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#1b2a4a] text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-mono text-[11px] opacity-75">
                      {tab.shortNum}.
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Workspace Controls: Global Month SmoothCombobox + Excel Import/Export + Reset + Account Details Logo */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 text-xs shrink-0 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="global-month-selector"
                className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0"
              >
                Month:
              </label>
              <div className="w-40 sm:w-44">
                <SmoothCombobox
                  id="global-month-selector"
                  ariaLabel="Choose or type month"
                  value={activeMonthInput}
                  options={monthOptions}
                  onChange={setActiveMonthInput}
                  placeholder={dashboard.activeMonthLabel}
                  menuMinWidth={230}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={fileInputRef}
                id="xlsx-upload-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportXlsxFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#1b2a4a] bg-[#fce8b2]/80 hover:bg-[#fce8b2] border border-amber-300/80 rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Upload an Excel (.xlsx, .xls) or CSV file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportXlsx}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#0b8043] bg-[#d9ead3]/70 hover:bg-[#d9ead3] border border-[#0b8043]/25 rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Download full 7-sheet Excel (.xlsx) file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Download CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">CSV</span>
              </button>

              {/* Strict 2-Step Reset Button */}
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-2 py-1.5 text-xs font-medium text-[#a50e0e] hover:text-white bg-[#f4cccc]/40 hover:bg-[#a50e0e] border border-[#a50e0e]/25 rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Reset account database (requires username verification)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

              {/* Offline / Cloud Sync Indicator Pill */}
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className={`px-2 py-1.5 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  isOnline
                    ? 'bg-[#d9ead3]/60 text-[#0b8043] hover:bg-[#d9ead3]'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
                title={
                  isOnline
                    ? isSyncingCloud
                      ? 'Syncing with Cloud...'
                      : 'Online & Cloud-Ready'
                    : 'Offline Mode: Saving locally, will upload when online'
                }
              >
                {isOnline ? (
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="hidden xl:inline">
                  {isOnline ? (isSyncingCloud ? 'Syncing...' : 'Cloud Synced') : 'Offline Mode'}
                </span>
              </button>

              {/* Account Details Logo / Button */}
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                aria-label="Account Details & Subscription Plan"
                className="flex items-center gap-1.5 bg-[#eef2f7] hover:bg-slate-200 border border-slate-300/80 px-2.5 py-1.5 rounded text-[#1b2a4a] transition-colors cursor-pointer"
                title="View Account Details & Live Subscription Plan"
              >
                <UserCircle2 className="w-4 h-4 text-[#1b2a4a] shrink-0" />
                <span className="font-mono font-semibold text-[11px] truncate max-w-[100px]">
                  @{currentUser.username}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    subscriptionState.effectiveStatus === 'active'
                      ? 'bg-[#d9ead3] text-[#0b8043]'
                      : 'bg-[#fce8b2] text-amber-900'
                  }`}
                >
                  {subscriptionState.effectiveStatus === 'active'
                    ? `${subscriptionState.daysRemaining}d Pro`
                    : `${subscriptionState.daysRemaining}d Trial`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="px-2 py-1.5 text-xs font-medium text-[#a50e0e] bg-[#f4cccc]/50 hover:bg-[#f4cccc] rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Sign out or switch user account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner for XLSX Import / Export / Reset */}
      {xlsxFeedback && (
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-3">
          <div
            role="status"
            className={`px-3.5 py-2 rounded border text-xs font-medium flex items-center justify-between gap-3 ${
              xlsxFeedback.type === 'success'
                ? 'bg-[#d9ead3]/80 border-[#0b8043]/30 text-[#0b8043]'
                : 'bg-[#f4cccc]/80 border-[#a50e0e]/30 text-[#a50e0e]'
            }`}
          >
            <span>{xlsxFeedback.message}</span>
            <button
              type="button"
              onClick={() => setXlsxFeedback(null)}
              className="text-current opacity-75 hover:opacity-100 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {activeTab === '1_Main_Log' && (
          <MainLogView
            transactions={transactions}
            categorySlots={categorySlots}
            incomeSources={incomeSources}
            dashboard={dashboard}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === '2_Monthly_Dashboard' && (
          <MonthlyDashboardView
            dashboard={dashboard}
            categorySlots={categorySlots}
            incomeSources={incomeSources}
            activeMonthInput={activeMonthInput}
            onActiveMonthChange={setActiveMonthInput}
            onUpdateCategorySlot={handleUpdateCategorySlot}
            onAddIncomeSource={handleAddIncomeSource}
            onRemoveIncomeSource={handleRemoveIncomeSource}
            onInspectCategory={handleInspectCategoryFromDashboard}
          />
        )}

        {activeTab === '3_Income_Savings_Loans' && (
          <IncomeSavingsLoansView
            transactions={transactions}
            dashboard={dashboard}
            incomeSources={incomeSources}
            onAddIncomeSource={handleAddIncomeSource}
            onRemoveIncomeSource={handleRemoveIncomeSource}
          />
        )}

        {activeTab === '4_Category_Organizer' && (
          <CategoryOrganizerView
            transactions={transactions}
            dashboard={dashboard}
            inspectedCategory={inspectedCategory}
            onSelectCategory={setInspectedCategory}
          />
        )}

        {activeTab === '5_Weekly_Breakdown' && (
          <WeeklyBreakdownView transactions={transactions} dashboard={dashboard} />
        )}

        {activeTab === '6_Purpose_&_Methods' && (
          <PurposeMethodsView transactions={transactions} dashboard={dashboard} />
        )}

        {activeTab === '7_Yearly_12M_Matrix' && (
          <YearlyMatrixView
            transactions={transactions}
            categorySlots={categorySlots}
            incomeSources={incomeSources}
            dashboard={dashboard}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Ultimate Financial Tracker · Personal Budget, Savings & Expense Planner
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={openMasterAdminPanel}
              className="text-slate-500 hover:text-[#1b2a4a] underline cursor-pointer inline-flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              <span>Admin (/master)</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span>Month: {dashboard.activeMonthLabel}</span>
            <span>·</span>
            <span>Safe to Spend / Day: {dashboard.dailySafeSpendText}</span>
          </div>
        </div>
      </footer>

      {/* Strict 2-Step Reset Confirmation Modal */}
      <ResetConfirmModal
        username={currentUser.username}
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleConfirmedAccountReset}
      />

      {/* Account Settings & Subscription Plan Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        account={currentUser}
        subscription={subscriptionState}
        isOnline={isOnline}
        pendingSync={pendingCloudSync}
        syncStatusMessage={syncStatusMessage}
        tableMissing={tableMissing}
        onClose={() => setIsAccountModalOpen(false)}
        onSyncNow={handleManualSyncNow}
        onAccountUpdated={setCurrentUser}
        onOpenResetWarning={() => {
          setIsAccountModalOpen(false);
          setIsResetModalOpen(true);
        }}
      />

      {/* Add Transaction Modal Dialog (No default pre-filled dropdown values) */}
      {isQuickModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-log-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full overflow-hidden shadow-lg">
            <div className="bg-[#1b2a4a] text-white px-5 py-3.5 flex items-center justify-between">
              <h2 id="quick-log-modal-title" className="text-sm font-semibold">
                Add New Transaction ({dashboard.activeMonthLabel})
              </h2>
              <button
                type="button"
                aria-label="Close Add Transaction Modal"
                onClick={() => setIsQuickModalOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickModalSubmit} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div
                  role="alert"
                  className="p-2.5 bg-[#f4cccc] text-[#a50e0e] rounded font-medium"
                >
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="modal-date-input"
                    className="block font-medium text-slate-700 mb-1"
                  >
                    Date (Blank = Today)
                  </label>
                  <input
                    id="modal-date-input"
                    type="text"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    placeholder="e.g. 18, yesterday, today"
                    className="w-full px-3 py-2 font-mono bg-[#fff8dc]/80 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-method-input"
                    className="block font-medium text-slate-700 mb-1"
                  >
                    Paid Via (Method)
                  </label>
                  <SmoothCombobox
                    id="modal-method-input"
                    ariaLabel="Payment Method"
                    value={modalMethod}
                    options={PAYMENT_METHOD_OPTIONS}
                    onChange={setModalMethod}
                    onBlur={() => {
                      if (modalMethod.trim() !== '') {
                        setModalMethod(parseSmartMethodInPlace(modalMethod));
                      }
                    }}
                    placeholder="Select payment method..."
                    menuMinWidth={240}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="modal-cat-input"
                    className="block font-medium text-slate-700 mb-1"
                  >
                    Category or Income Source
                  </label>
                  <SmoothCombobox
                    id="modal-cat-input"
                    ariaLabel="Category or Income Source"
                    value={modalCategory}
                    options={categoryDropdownOptions}
                    onChange={(val) => {
                      setModalCategory(val);
                      const m = matchCategoryInPlace(
                        val,
                        categorySlots,
                        incomeSources
                      );
                      if (m) setModalFlow(m.flow);
                    }}
                    onBlur={() => {
                      const m = matchCategoryInPlace(
                        modalCategory,
                        categorySlots,
                        incomeSources
                      );
                      if (m) {
                        setModalCategory(m.name);
                        setModalFlow(m.flow);
                      }
                    }}
                    resolvedShortcutHint={modalShortcutHint}
                    placeholder="Choose category or income source..."
                    menuMinWidth={260}
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-flow-select"
                    className="block font-medium text-slate-700 mb-1"
                  >
                    Type
                  </label>
                  <SmoothSelect
                    id="modal-flow-select"
                    ariaLabel="Transaction Type"
                    value={modalFlow}
                    options={FLOW_TYPE_OPTIONS}
                    onChange={(val) => setModalFlow(val as FlowType)}
                    placeholder="Select type..."
                    variant="default"
                    menuMinWidth={220}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="modal-purpose-input"
                    className="block font-medium text-slate-700 mb-1"
                  >
                    Description / Person
                  </label>
                  <input
                    id="modal-purpose-input"
                    type="text"
                    value={modalPurpose}
                    onChange={(e) => setModalPurpose(e.target.value)}
                    placeholder="e.g. Dinner with family"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-amount-input"
                    className="block font-medium text-slate-700 mb-1"
                  >
                    Amount (Rs.)
                  </label>
                  <input
                    id="modal-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 font-mono tabular-nums bg-[#fff8dc]/80 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsQuickModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1b2a4a] hover:bg-[#2c4268] rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
