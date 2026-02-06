'use client'

import { formatBaht, formatThaiDate } from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const INCOME_COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#a78bfa']
const EXPENSE_COLORS = ['#f43f5e', '#fb923c', '#a78bfa', '#22c55e', '#06b6d4']

interface LedgerEntry {
  id: string
  entry_date: string
  description: string
  entry_type: 'income' | 'expense'
  category: string
  amount: number
  payment_method: string | null
  reference_type: string | null
}

interface DailySale {
  total_amount: number
  cash_amount: number
  promptpay_amount: number
  credit_card_amount: number
}

interface ReceiptRow {
  total: number
  category: string
}

interface FixedCost {
  amount: number
  category: string
  is_paid: boolean
}

interface DashboardClientProps {
  ledgerEntries: LedgerEntry[]
  monthlySales: DailySale[]
  monthlyReceipts: ReceiptRow[]
  monthlyFixed: FixedCost[]
}

export function DashboardClient({
  ledgerEntries,
  monthlySales,
  monthlyReceipts,
  monthlyFixed,
}: DashboardClientProps) {
  const totalCash = monthlySales.reduce((s, r) => s + Number(r.cash_amount), 0)
  const totalPromptPay = monthlySales.reduce((s, r) => s + Number(r.promptpay_amount), 0)
  const totalCard = monthlySales.reduce((s, r) => s + Number(r.credit_card_amount), 0)
  const totalIncome = totalCash + totalPromptPay + totalCard

  const incomeData = [
    { name: 'Cash', value: totalCash },
    { name: 'PromptPay', value: totalPromptPay },
    { name: 'Credit Card', value: totalCard },
  ].filter((d) => d.value > 0)

  const receiptsByCategory: Record<string, number> = {}
  monthlyReceipts.forEach((r) => {
    receiptsByCategory[r.category] = (receiptsByCategory[r.category] || 0) + Number(r.total)
  })
  const fixedByCategory: Record<string, number> = {}
  monthlyFixed.forEach((f) => {
    fixedByCategory[f.category] = (fixedByCategory[f.category] || 0) + Number(f.amount)
  })

  const allExpenseCategories = { ...receiptsByCategory }
  Object.entries(fixedByCategory).forEach(([k, v]) => {
    allExpenseCategories[k] = (allExpenseCategories[k] || 0) + v
  })

  const expenseData = Object.entries(allExpenseCategories)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  const totalExpenses = expenseData.reduce((s, d) => s + d.value, 0)
  const netProfit = totalIncome - totalExpenses

  const hasIncome = incomeData.length > 0
  const hasExpenses = expenseData.length > 0

  const thaiMonth = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{thaiMonth}</p>
      </div>

      {/* Summary Cards - colorful! */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-500 p-4 shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50/20">
              <TrendingUp className="h-5 w-5 text-emerald-50" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-50/80 uppercase tracking-wide">Revenue</p>
              <p className="text-xl font-bold text-white">{formatBaht(totalIncome)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1.5 border-t border-emerald-400/30 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-50/80">Cash</span>
              <span className="text-xs font-semibold text-white">{formatBaht(totalCash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-50/80">PromptPay</span>
              <span className="text-xs font-semibold text-white">{formatBaht(totalPromptPay)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-50/80">Credit Card</span>
              <span className="text-xs font-semibold text-white">{formatBaht(totalCard)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-rose-500 p-4 shadow-lg shadow-rose-500/20">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50/20">
            <TrendingDown className="h-5 w-5 text-rose-50" />
          </div>
          <div>
            <p className="text-xs font-medium text-rose-50/80 uppercase tracking-wide">Expenses</p>
            <p className="text-xl font-bold text-white">{formatBaht(totalExpenses)}</p>
          </div>
        </div>
        <div className={`flex items-center gap-4 rounded-2xl p-4 shadow-lg ${netProfit >= 0 ? 'bg-sky-500 shadow-sky-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${netProfit >= 0 ? 'bg-sky-50/20' : 'bg-amber-50/20'}`}>
            <Wallet className={`h-5 w-5 ${netProfit >= 0 ? 'text-sky-50' : 'text-amber-50'}`} />
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${netProfit >= 0 ? 'text-sky-50/80' : 'text-amber-50/80'}`}>Net Profit</p>
            <p className="text-xl font-bold text-white">{formatBaht(netProfit)}</p>
          </div>
        </div>
      </div>

      {/* Pie Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-foreground">Revenue by Method</h2>
          <p className="mb-3 text-xs text-muted-foreground">This month</p>
          {hasIncome ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  fontSize={11}
                >
                  {incomeData.map((_, i) => (
                    <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatBaht(val)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No revenue data yet</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-foreground">Expenses by Category</h2>
          <p className="mb-3 text-xs text-muted-foreground">This month</p>
          {hasExpenses ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  fontSize={11}
                >
                  {expenseData.map((_, i) => (
                    <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatBaht(val)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No expense data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Ledger / Journal */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">Ledger / Journal</h2>
          <p className="text-xs text-muted-foreground">Recent transactions</p>
        </div>

        {ledgerEntries.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/50"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-foreground">
                        {formatThaiDate(entry.entry_date)}
                      </td>
                      <td className="px-5 py-3 text-foreground">{entry.description}</td>
                      <td className="px-5 py-3 capitalize text-muted-foreground">{entry.category}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            entry.entry_type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {entry.entry_type === 'income' ? 'Revenue' : 'Expense'}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${
                          entry.entry_type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {entry.entry_type === 'income' ? '+' : '-'}
                        {formatBaht(Number(entry.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col divide-y divide-border/50 md:hidden">
              {ledgerEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatThaiDate(entry.entry_date)}</span>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-px text-[10px] font-semibold ${
                          entry.entry_type === 'income'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {entry.entry_type === 'income' ? 'Revenue' : 'Expense'}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      entry.entry_type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {entry.entry_type === 'income' ? '+' : '-'}
                    {formatBaht(Number(entry.amount))}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No journal entries yet. Entries are created when you submit sales reports, receipts, and fixed costs.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
