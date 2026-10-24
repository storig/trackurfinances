import React from 'react';
import { DashboardSummary, Transaction } from '../types/finance';
import { computeWeeklyBreakdown } from '../utils/financialEngine';

interface WeeklyBreakdownViewProps {
  transactions: Transaction[];
  dashboard: DashboardSummary;
}

export const WeeklyBreakdownView: React.FC<WeeklyBreakdownViewProps> = ({
  transactions,
  dashboard,
}) => {
  const wk = computeWeeklyBreakdown(transactions, dashboard);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              5. Week-by-Week Spending & Savings Breakdown
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              See how much you spend and save in each week of the month compared to your category budgets
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-[#fce8b2]">
            Month: {dashboard.activeMonthLabel}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2c4268] text-white font-semibold">
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap sticky left-0 z-10 bg-[#2c4268]">
                  Expense Category
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Monthly Budget
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Week 1 (Days 1–7)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Week 2 (Days 8–14)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Week 3 (Days 15–21)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Week 4 (Days 22–28)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Week 5 (Days 29–31)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Monthly Total
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Weekly Avg
                </th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Budget Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {wk.rows.map((row) => (
                <tr key={row.category} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-sans font-bold text-slate-900 bg-[#f8f9fa] border-r border-slate-200 whitespace-nowrap sticky left-0 z-10">
                    {row.category}
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-700 border-r border-slate-200">
                    {row.monthlyLimit.toLocaleString('en-US')}
                  </td>
                  {row.weeks.map((wAmt, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-2.5 text-right border-r border-slate-200 ${
                        wAmt > 0 ? 'text-slate-900 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {wAmt.toLocaleString('en-US')}
                    </td>
                  ))}
                  <td className="py-2 px-2.5 text-right font-bold text-slate-900 border-r border-slate-200 bg-slate-50/70">
                    {row.monthlyTotal.toLocaleString('en-US')}
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-700 border-r border-slate-200">
                    {row.weeklyAverage.toLocaleString('en-US')}
                  </td>
                  <td
                    className={`py-2 px-3 text-center font-bold whitespace-nowrap ${
                      row.isSafe
                        ? 'bg-[#d9ead3]/80 text-[#137333]'
                        : 'bg-[#f4cccc]/80 text-[#a50e0e]'
                    }`}
                  >
                    {row.statusText}
                  </td>
                </tr>
              ))}

              {/* Row 21: TOTAL WEEKLY SPENDING */}
              <tr className="bg-[#f4cccc] font-bold text-[#a50e0e] border-t-2 border-slate-300">
                <td className="py-2.5 px-3 font-sans border-r border-red-300 whitespace-nowrap sticky left-0 z-10 bg-[#f4cccc]">
                  TOTAL WEEKLY SPENDING
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-red-300">
                  {dashboard.totalAllocatedLimit.toLocaleString('en-US')}
                </td>
                {wk.totalWeeklyOutgoing.map((val, i) => (
                  <td key={i} className="py-2.5 px-2.5 text-right border-r border-red-300">
                    {val.toLocaleString('en-US')}
                  </td>
                ))}
                <td className="py-2.5 px-2.5 text-right border-r border-red-300">
                  {wk.totalOutgoingSum.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-red-300">
                  {wk.totalOutgoingAvg.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  {dashboard.totalAllocationStatusText}
                </td>
              </tr>

              {/* Row 22: TOTAL WEEKLY INCOME */}
              <tr className="bg-[#d9ead3] font-bold text-[#137333]">
                <td className="py-2.5 px-3 font-sans border-r border-emerald-300 whitespace-nowrap sticky left-0 z-10 bg-[#d9ead3]">
                  TOTAL WEEKLY INCOME
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-emerald-300">
                  {dashboard.totalIncoming.toLocaleString('en-US')}
                </td>
                {wk.totalWeeklyIncoming.map((val, i) => (
                  <td key={i} className="py-2.5 px-2.5 text-right border-r border-emerald-300">
                    {val.toLocaleString('en-US')}
                  </td>
                ))}
                <td className="py-2.5 px-2.5 text-right border-r border-emerald-300">
                  {wk.totalIncomingSum.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-emerald-300">
                  {wk.totalIncomingAvg.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">100% INCOME</td>
              </tr>

              {/* Row 23: WEEKLY NET SAVINGS */}
              <tr className="bg-[#fce8b2] font-bold text-slate-900">
                <td className="py-2.5 px-3 font-sans border-r border-amber-300 whitespace-nowrap sticky left-0 z-10 bg-[#fce8b2]">
                  WEEKLY NET SAVINGS (INCOME - SPENT)
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-amber-300">
                  {(dashboard.totalIncoming - dashboard.totalAllocatedLimit).toLocaleString(
                    'en-US'
                  )}
                </td>
                {wk.weeklyNetSavings.map((val, i) => (
                  <td key={i} className="py-2.5 px-2.5 text-right border-r border-amber-300">
                    {val.toLocaleString('en-US')}
                  </td>
                ))}
                <td className="py-2.5 px-2.5 text-right border-r border-amber-300">
                  {wk.netSavingsSum.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-amber-300">
                  {wk.netSavingsAvg.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
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
