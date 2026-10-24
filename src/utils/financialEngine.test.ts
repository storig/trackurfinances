import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CATEGORY_SLOTS,
  computeDashboardSummary,
  computeIncomeSavingsLoans,
  computePurposeAndMethods,
  computeWeeklyBreakdown,
  computeYearly12MMatrix,
  matchCategoryInPlace,
  parseSmartDateInPlace,
  parseSmartMethodInPlace,
  resolveActiveMonth,
} from './financialEngine';
import { INITIAL_SEED_TRANSACTIONS } from './seedData';

test('matchCategoryInPlace resolves shorthand codes and routes FlowType accurately', () => {
  const sal = matchCategoryInPlace('sal', DEFAULT_CATEGORY_SLOTS);
  assert.deepEqual(sal, { name: 'Salary', flow: 'Incoming' });

  const fod = matchCategoryInPlace('fod', DEFAULT_CATEGORY_SLOTS);
  assert.deepEqual(fod, { name: 'Food & Dining', flow: 'Outgoing' });

  const prot = matchCategoryInPlace('whey', DEFAULT_CATEGORY_SLOTS);
  assert.deepEqual(prot, { name: 'Protein & Supplements', flow: 'Outgoing' });

  const rec = matchCategoryInPlace('loan rec', DEFAULT_CATEGORY_SLOTS);
  assert.deepEqual(rec, { name: 'Loan Recovery', flow: 'Incoming' });
});

test('parseSmartMethodInPlace resolves payment method shorthand', () => {
  assert.equal(parseSmartMethodInPlace('dig'), 'Digital');
  assert.equal(parseSmartMethodInPlace('d'), 'Digital');
  assert.equal(parseSmartMethodInPlace('online'), 'Digital');
  assert.equal(parseSmartMethodInPlace('c'), 'Cash');
  assert.equal(parseSmartMethodInPlace('cash'), 'Cash');
  assert.equal(parseSmartMethodInPlace('cr'), 'Credit');
  assert.equal(parseSmartMethodInPlace('card'), 'Credit');
});

test('parseSmartDateInPlace parses day numbers, relative dates, and enforces 1-month rule', () => {
  const refNow = new Date(2026, 9, 23); // Oct 23, 2026 (month 9)

  const singleDay = parseSmartDateInPlace('12', 2026, 9, refNow);
  assert.equal(singleDay.dateStr, '2026-10-12');
  assert.equal(singleDay.monthChanged, false);

  const yesterday = parseSmartDateInPlace('yesterday', 2026, 9, refNow);
  assert.equal(yesterday.dateStr, '2026-10-22');
  assert.equal(yesterday.monthChanged, false);

  // Different month ("15 sep 2026") should keep day 15 in October 2026 and flag monthChanged = true
  const diffMonth = parseSmartDateInPlace('15 sep 2026', 2026, 9, refNow);
  assert.equal(diffMonth.dateStr, '2026-10-15');
  assert.equal(diffMonth.monthChanged, true);
});

test('resolveActiveMonth parses month strings and keywords', () => {
  const refNow = new Date(2026, 9, 23);
  assert.equal(resolveActiveMonth('', refNow).label, 'October 2026');
  assert.equal(resolveActiveMonth('current', refNow).label, 'October 2026');
  assert.equal(resolveActiveMonth('nov 26', refNow).label, 'November 2026');
});

test('computeDashboardSummary calculates exact incoming, outgoing, savings, and category allocations', () => {
  const refNow = new Date(2026, 9, 23);
  const summary = computeDashboardSummary(
    INITIAL_SEED_TRANSACTIONS,
    DEFAULT_CATEGORY_SLOTS,
    '',
    refNow
  );

  // Incoming: Salary 185000 + Bonus 25000 + Loans 20000 + Loan Recovery 5000 + Gifts 5000 = 240,000
  assert.equal(summary.totalIncoming, 240000);

  // Shopping & Personal has 7% of 240,000 = 16,800 limit, spent 18,500 -> EXCEEDED (+Rs. 1,700)
  const shoppingRow = summary.categoryRows.find((r) => r.name === 'Shopping & Personal');
  assert.ok(shoppingRow);
  assert.equal(shoppingRow.allocatedLimit, 16800);
  assert.equal(shoppingRow.actualSpent, 18500);
  assert.equal(shoppingRow.isSafe, false);
  assert.equal(shoppingRow.statusText, 'EXCEEDED (+Rs. 1,700)');

  // Sadaqah has 5% of 240,000 = 12,000 limit, spent 6,500 -> Rs. 5,500 Left to Give
  assert.equal(summary.sadaqahGoalText, 'Rs. 5,500 Left to Give');

  // Dual Loans: Payable = 20,000 (Loans) - 8,000 (Loan Repayment) = 12,000
  assert.equal(summary.netPayableLoans, 12000);
  // Receivable = 12,000 (Giving Loan) - 5,000 (Loan Recovery) = 7,000
  assert.equal(summary.netReceivableLoans, 7000);

  // Default allocated % sum = 85%, so Unallocated Target % = 15% (Rs. 36,000)
  assert.equal(Math.round(summary.totalAllocatedPct * 100), 85);
  assert.equal(Math.round(summary.unallocatedPlannedPct * 100), 15);
  assert.equal(summary.unallocatedPlannedRs, 36000);
});

test('computeIncomeSavingsLoans, computeWeeklyBreakdown, computePurposeAndMethods, and computeYearly12MMatrix stay consistent', () => {
  const refNow = new Date(2026, 9, 23);
  const summary = computeDashboardSummary(
    INITIAL_SEED_TRANSACTIONS,
    DEFAULT_CATEGORY_SLOTS,
    '',
    refNow
  );
  const isl = computeIncomeSavingsLoans(INITIAL_SEED_TRANSACTIONS, summary);
  assert.equal(isl.totalIncomingMonthly, summary.totalIncoming);
  assert.equal(isl.savingsMechanics.length, 10);

  const weekly = computeWeeklyBreakdown(INITIAL_SEED_TRANSACTIONS, summary);
  assert.equal(weekly.totalOutgoingSum, summary.totalSpent);
  assert.equal(weekly.totalIncomingSum, summary.totalIncoming);

  const pm = computePurposeAndMethods(INITIAL_SEED_TRANSACTIONS, summary);
  assert.equal(pm.totalMethodStats.monthlyIncoming, summary.totalIncoming);
  assert.equal(pm.totalMethodStats.monthlyOutgoing, summary.totalSpent);

  const yr = computeYearly12MMatrix(INITIAL_SEED_TRANSACTIONS, DEFAULT_CATEGORY_SLOTS, 2026);
  // October is index 9
  assert.equal(yr.totalIncomingRow.months[9], summary.totalIncoming);
  assert.equal(yr.totalOutgoingRow.months[9], summary.totalSpent);
});

test('XLSX workbook export and import round-trip preserves transactions and 16 category allocation slots', async () => {
  const { generateWorkbookBuffer, parseWorkbookBuffer } = await import('./xlsxHelper');
  const buf = generateWorkbookBuffer(INITIAL_SEED_TRANSACTIONS, DEFAULT_CATEGORY_SLOTS, 'Oct 2026');
  assert.ok(buf.byteLength > 1000);

  const parsed = parseWorkbookBuffer(buf, DEFAULT_CATEGORY_SLOTS, 2026, 9);
  assert.equal(parsed.importedTxCount, INITIAL_SEED_TRANSACTIONS.length);
  assert.equal(parsed.importedCatCount, 12);
  assert.ok(parsed.categorySlots);
  assert.equal(parsed.categorySlots.length, 16);

  const origIn = INITIAL_SEED_TRANSACTIONS.reduce((a, t) => a + t.inAmount, 0);
  const origOut = INITIAL_SEED_TRANSACTIONS.reduce((a, t) => a + t.outAmount, 0);
  const importedIn = parsed.transactions.reduce((a, t) => a + t.inAmount, 0);
  const importedOut = parsed.transactions.reduce((a, t) => a + t.outAmount, 0);

  assert.equal(importedIn, origIn);
  assert.equal(importedOut, origOut);
});

test('hashCredential produces deterministic non-trivial hashes per username and password', async () => {
  const { hashCredential } = await import('./authVault');
  const h1 = hashCredential('Ahmad', 'secret123');
  const h2 = hashCredential('ahmad', 'secret123');
  const h3 = hashCredential('ahmad', 'wrongpass');

  assert.equal(h1, h2); // case-insensitive username normalization
  assert.notEqual(h1, h3);
  assert.equal(h1.length, 14);
});

test('custom income categories dynamically update matchCategoryInPlace, computeDashboardSummary, and computeIncomeSavingsLoans', () => {
  const customIncomeSources = [
    'Salary',
    'Freelancing',
    'Rental Yield',
    'Bonus',
    'Loans',
    'Loan Recovery',
    'Gifts',
  ];

  // Matching custom income category routes to Incoming flow
  const matchFreelance = matchCategoryInPlace(
    'Freelancing',
    DEFAULT_CATEGORY_SLOTS,
    customIncomeSources
  );
  assert.deepEqual(matchFreelance, { name: 'Freelancing', flow: 'Incoming' });

  const refNow = new Date(2026, 9, 23);
  const txsWithFreelance = [
    ...INITIAL_SEED_TRANSACTIONS,
    {
      id: 'tx-freelance-1',
      entryTime: '2026-10-20T10:00:00.000Z',
      date: '2026-10-20',
      flowType: 'Incoming' as const,
      category: 'Freelancing',
      purpose: 'Web App Project',
      method: 'Digital' as const,
      inAmount: 60000,
      outAmount: 0,
    },
  ];

  const summary = computeDashboardSummary(
    txsWithFreelance,
    DEFAULT_CATEGORY_SLOTS,
    '',
    refNow,
    customIncomeSources
  );

  assert.equal(summary.totalIncoming, 300000); // 240,000 + 60,000
  const freelanceItem = summary.incomingSourceBreakdown.find(
    (item) => item.name === 'Freelancing'
  );
  assert.ok(freelanceItem);
  assert.equal(freelanceItem.amount, 60000);
  assert.equal(freelanceItem.share, 60000 / 300000);

  const isl = computeIncomeSavingsLoans(
    txsWithFreelance,
    summary,
    customIncomeSources
  );
  const islFreelance = isl.sourceRows.find((r) => r.source === 'Freelancing');
  assert.ok(islFreelance);
  assert.equal(islFreelance.monthlyAmount, 60000);
});

test('evaluateSubscriptionState enforces 7-day free trial and Rs. 1,000/month paywall lock after expiry', async () => {
  const { evaluateSubscriptionState, authenticateAdminCredentials } = await import(
    './authVault'
  );

  // Verify default admin credentials (masterdingdong / dong1234)
  assert.equal(authenticateAdminCredentials('masterdingdong', 'dong1234'), true);
  assert.equal(authenticateAdminCredentials('masterdingdong', 'wrong'), false);

  const createdMs = new Date('2026-10-01T00:00:00.000Z').getTime();
  const trialEndsMs = createdMs + 7 * 24 * 60 * 60 * 1000;

  const newAccount = {
    username: 'khan',
    displayName: 'Khan',
    passwordHash: '1234567890abcd',
    createdAt: new Date(createdMs).toISOString(),
    trialEndsAt: new Date(trialEndsMs).toISOString(),
    subscriptionStatus: 'trial' as const,
    subscriptionPlan: 'free_trial' as const,
    subscriptionEndsAt: null,
    lastPaymentVerifiedAt: null,
  };

  // Day 3 of trial -> unlocked, 4 days remaining
  const day3 = new Date(createdMs + 3 * 24 * 60 * 60 * 1000);
  const stateDay3 = evaluateSubscriptionState(newAccount, day3);
  assert.equal(stateDay3.isPaywallLocked, false);
  assert.equal(stateDay3.effectiveStatus, 'trial');
  assert.equal(stateDay3.daysRemaining, 4);

  // Day 8 after signup -> trial expired, paywall locked
  const day8 = new Date(createdMs + 8 * 24 * 60 * 60 * 1000);
  const stateDay8 = evaluateSubscriptionState(newAccount, day8);
  assert.equal(stateDay8.isPaywallLocked, true);
  assert.equal(stateDay8.effectiveStatus, 'expired');
  assert.equal(stateDay8.daysRemaining, 0);

  // Admin activates 30-day Pro Monthly subscription
  const subEndsMs = day8.getTime() + 30 * 24 * 60 * 60 * 1000;
  const verifiedAccount = {
    ...newAccount,
    subscriptionStatus: 'active' as const,
    subscriptionPlan: 'monthly_1000' as const,
    subscriptionEndsAt: new Date(subEndsMs).toISOString(),
  };
  const stateActive = evaluateSubscriptionState(verifiedAccount, day8);
  assert.equal(stateActive.isPaywallLocked, false);
  assert.equal(stateActive.effectiveStatus, 'active');
  assert.equal(stateActive.daysRemaining, 30);
});

test('resolveSupabaseProjectUrl extracts project ref from JWT anon key when generic supabase.co URL is given', async () => {
  const { resolveSupabaseProjectUrl } = await import('./supabaseSync');
  const resolved = resolveSupabaseProjectUrl(
    'https://supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyZW9oaWZ4a3dub3NjeHpnZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTkzMTUsImV4cCI6MjEwODM5NTMxNX0.MtRdTKCtGY9erSEsQcgPiKivHkQEWKOYV-npBmcALTU'
  );
  assert.equal(resolved, 'https://sreohifxkwnoscxzgfdt.supabase.co');
});


