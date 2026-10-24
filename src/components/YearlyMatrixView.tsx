import React from 'react';
import { CategoryAllocationSlot, DashboardSummary, Transaction } from '../types/finance';
import { MONTH_NAMES_SHORT, computeYearly12MMatrix } from '../utils/financialEngine';

interface YearlyMatrixViewProps {
  transactions: Transaction[];
  categorySlots: CategoryAllocationSlot[];
  incomeSources: string[];
  dashboard: DashboardSummary;
}

export const YearlyMatrixView: React.FC<YearlyMatrixViewProps> = ({
  transactions,
  categorySlots,
  incomeSources,
  dashboard,
}) => {
  const yr = computeYearly12MMatrix(
    transactions,
    categorySlots,
    dashboard.activeYear,
    incomeSources
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1b2a4a] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              7. Full Year (Jan–Dec) Month-by-Month Summary
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Compare your income, category spending, and net savings across all 12 months of the year
            </p>
          </div>
          <div className="px-3 py-1 bg-[#fce8b2] text-slate-900 font-mono tabular-nums text-xs font-bold rounded">
            Year: {yr.activeYear}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2c4268] text-white font-semibold">
                <th className="py-2.5 px-3 border-r border-slate-600/40 whitespace-nowrap sticky left-0 bg-[#2c4268]">
                  Income Source / Expense Category
                </th>
                {MONTH_NAMES_SHORT.map((m, idx) => (
                  <th
                    key={m}
                    className={`py-2.5 px-2.5 border-r border-slate-600/40 text-right whitespace-nowrap ${
                      idx === dashboard.activeMonthIndex ? 'bg-[#3b5998] text-[#fce8b2]' : ''
                    }`}
                  >
                    {m}
                  </th>
                ))}
                <th className="py-2.5 px-3 border-r border-slate-600/40 text-right whitespace-nowrap">
                  Yearly Total
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Monthly Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {/* Incoming Sources (Rows 5-10) */}
              {yr.incomingMatrixRows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-sans font-bold text-slate-800 bg-[#f8f9fa] border-r border-slate-200 whitespace-nowrap sticky left-0">
                    {row.label}
                  </td>
                  {row.months.map((val, mIdx) => (
                    <td
                      key={mIdx}
                      className={`py-2 px-2.5 text-right border-r border-slate-200 ${
                        val > 0 ? 'text-slate-900 font-medium' : 'text-slate-300'
                      }`}
                    >
                      {val.toLocaleString('en-US')}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-200 bg-slate-50">
                    {row.annualTotal.toLocaleString('en-US')}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {row.monthlyAvg.toLocaleString('en-US')}
                  </td>
                </tr>
              ))}

              {/* Row 11: TOTAL MONTHLY INCOME */}
              <tr className="bg-[#d9ead3] font-bold text-[#137333] border-y-2 border-emerald-300">
                <td className="py-2.5 px-3 font-sans border-r border-emerald-300 sticky left-0 bg-[#d9ead3]">
                  TOTAL MONTHLY INCOME
                </td>
                {yr.totalIncomingRow.months.map((val, mIdx) => (
                  <td key={mIdx} className="py-2.5 px-2.5 text-right border-r border-emerald-300">
                    {val.toLocaleString('en-US')}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right border-r border-emerald-300">
                  {yr.totalIncomingRow.annualTotal.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {yr.totalIncomingRow.monthlyAvg.toLocaleString('en-US')}
                </td>
              </tr>

              {/* Dynamic Expense Categories (Rows 13-28) */}
              {yr.categoryMatrixRows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-sans font-bold text-slate-800 bg-[#f8f9fa] border-r border-slate-200 whitespace-nowrap sticky left-0">
                    {row.label}
                  </td>
                  {row.months.map((val, mIdx) => (
                    <td
                      key={mIdx}
                      className={`py-2 px-2.5 text-right border-r border-slate-200 ${
                        val > 0 ? 'text-slate-900 font-medium' : 'text-slate-300'
                      }`}
                    >
                      {val.toLocaleString('en-US')}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-200 bg-slate-50">
                    {row.annualTotal.toLocaleString('en-US')}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {row.monthlyAvg.toLocaleString('en-US')}
                  </td>
                </tr>
              ))}

              {/* Row 29: TOTAL MONTHLY SPENDING */}
              <tr className="bg-[#f4cccc] font-bold text-[#a50e0e] border-t-2 border-red-300">
                <td className="py-2.5 px-3 font-sans border-r border-red-300 sticky left-0 bg-[#f4cccc]">
                  TOTAL MONTHLY SPENDING
                </td>
                {yr.totalOutgoingRow.months.map((val, mIdx) => (
                  <td key={mIdx} className="py-2.5 px-2.5 text-right border-r border-red-300">
                    {val.toLocaleString('en-US')}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right border-r border-red-300">
                  {yr.totalOutgoingRow.annualTotal.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {yr.totalOutgoingRow.monthlyAvg.toLocaleString('en-US')}
                </td>
              </tr>

              {/* Row 30: NET MONTHLY SAVINGS */}
              <tr className="bg-[#fce8b2] font-bold text-slate-900">
                <td className="py-2.5 px-3 font-sans border-r border-amber-300 sticky left-0 bg-[#fce8b2]">
                  NET MONTHLY SAVINGS (INCOME - SPENT)
                </td>
                {yr.netSavingsRow.months.map((val, mIdx) => (
                  <td key={mIdx} className="py-2.5 px-2.5 text-right border-r border-amber-300">
                    {val.toLocaleString('en-US')}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right border-r border-amber-300">
                  {yr.netSavingsRow.annualTotal.toLocaleString('en-US')}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {yr.netSavingsRow.monthlyAvg.toLocaleString('en-US')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
