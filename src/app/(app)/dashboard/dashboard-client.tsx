'use client'

import { formatBaht, formatThaiDate } from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

const INCOME_COLORS = ['#3A5A40', '#588157', '#A3B18A', '#DAD7CD']
const EXPENSE_COLORS = ['#D4613E', '#E07A5F', '#F2CC8F', '#81B29A', '#3D405B']

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
  // Calculate income breakdown from sales
  const totalCash = monthlySales.reduce((s, r) => s + Number(r.cash_amount), 0)
  const totalPromptPay = monthlySales.reduce((s, r) => s + Number(r.promptpay_amount), 0)
  const totalCard = monthlySales.reduce((s, r) => s + Number(r.credit_card_amount), 0)
  const totalIncome = totalCash + totalPromptPay + totalCard

  const incomeData = [
    { name: 'Cash', value: totalCash },
    { name: 'PromptPay', value: totalPromptPay },
    { name: 'Credit Card', value: totalCard },
  ].filter((d) => d.value > 0)

  // Calculate expense breakdown
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

  const hasIncome = incomeData.length > 0
  const hasExpenses = expenseData.length > 0

  const thaiMonth = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{thaiMonth}</p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue (Month)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatBaht(totalIncome)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses (Month)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatBaht(totalExpenses)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net Profit</p>
          <p className={`mt-1 text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatBaht(totalIncome - totalExpenses)}
          </p>
        </div>
      </div>

      {/* Pie Charts */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Income Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Revenue by Method</h2>
          {hasIncome ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {incomeData.map((_, i) => (
                    <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatBaht(val)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No revenue data this month</p>
            </div>
          )}
        </div>

        {/* Expense Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Expenses by Category</h2>
          {hasExpenses ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {expenseData.map((_, i) => (
                    <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatBaht(val)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No expense data this month</p>
            </div>
          )}
        </div>
      </div>

      {/* Ledger / Journal */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Ledger / Journal</h2>
          <p className="text-xs text-muted-foreground">Recent transactions</p>
        </div>

        {ledgerEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-foreground">
                      {formatThaiDate(entry.entry_date)}
                    </td>
                    <td className="px-5 py-3 text-foreground">{entry.description}</td>
                    <td className="px-5 py-3 text-muted-foreground">{entry.category}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.entry_type === 'income'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {entry.entry_type === 'income' ? 'Revenue' : 'Expense'}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-medium ${
                        entry.entry_type === 'income' ? 'text-success' : 'text-destructive'
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
        ) : (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No journal entries yet. Entries are automatically created when you submit sales reports, receipts, and fixed costs.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
