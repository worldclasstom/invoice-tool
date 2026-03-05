'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { formatBaht, formatThaiDate } from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, CalendarDays, Loader2, Activity, Receipt, FileText, DollarSign, CheckCircle2, LogIn, ChevronDown, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const INCOME_COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#a78bfa']
const EXPENSE_COLORS = ['#f43f5e', '#fb923c', '#a78bfa', '#22c55e', '#06b6d4']
const DESTINATION_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'custom'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getThaiToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDateRange(mode: ViewMode, customFrom: string, customTo: string): { from: string; to: string } {
  const today = getThaiToday()
  const d = new Date(today + 'T00:00:00+07:00')

  switch (mode) {
    case 'daily':
      return { from: today, to: today }
    case 'weekly': {
      const dow = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dow + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: toDateStr(monday), to: toDateStr(sunday) }
    }
    case 'monthly': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
    case 'custom':
      return { from: customFrom || today, to: customTo || today }
  }
}

function getDateLabel(mode: ViewMode, from: string, to: string): string {
  const full: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  const short: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
  }
  const monthYear: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bangkok',
    month: 'long',
    year: 'numeric',
  }
  switch (mode) {
    case 'daily':
      return new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', full)
    case 'weekly':
      return `${new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', short)} - ${new Date(to + 'T12:00:00Z').toLocaleDateString('th-TH', full)}`
    case 'monthly':
      return new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', monthYear)
    case 'custom':
      if (from === to) return new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', full)
      return `${new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', short)} - ${new Date(to + 'T12:00:00Z').toLocaleDateString('th-TH', full)}`
  }
}

interface TransferDetail {
  destination: string
  nickname: string
  amount: number
}

interface DailySale {
  total_amount: number
  cash_amount: number
  promptpay_amount: number
  credit_card_amount: number
  transfer_details: TransferDetail[] | null
}

interface ReceiptRow {
  total: number
  category: string
}

interface FixedCost {
  amount: number
  category: string
  is_paid: boolean
  period_month: number
  period_year: number
}

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

const COST_TYPE_LABELS: Record<string, string> = {
  WATER: 'Water',
  ELECTRICITY: 'Electricity',
  CREDIT_CARD_UOB: 'Credit Card UOB',
  INTERNET: 'Internet',
  EMPLOYEE_FIRST_HALF: 'Employee (1st Half)',
  EMPLOYEE_SECOND_HALF: 'Employee (2nd Half)',
}

interface ReminderRow {
  id: string
  cost_type: string
  period_month: number
  period_year: number
  due_date: string
  amount: number
  paid: boolean
}

export function DashboardClient() {
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    const today = getThaiToday()
    setCustomFrom(today)
    setCustomTo(today)
    setMounted(true)
  }, [])

  const { from, to } = useMemo(() => {
    if (!mounted) return { from: '', to: '' }
    return getDateRange(viewMode, customFrom, customTo)
  }, [mounted, viewMode, customFrom, customTo])
  const dateLabel = useMemo(() => {
    if (!from || !to) return ''
    return getDateLabel(viewMode, from, to)
  }, [viewMode, from, to])

  const { data, isLoading } = useSWR(from && to ? `/api/dashboard?from=${from}&to=${to}` : null, fetcher)

  const ACTIVITY_PAGE_SIZE = 5
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityHasMore, setActivityHasMore] = useState(false)
  const [activityLoadingMore, setActivityLoadingMore] = useState(false)

  interface ActivityLogEntry {
    id: string
    user_email: string
    action: string
    entity_type: string
    details: Record<string, unknown>
    created_at: string
  }

  // Initial load of first 6 activities
  const { data: activityData } = useSWR(`/api/activity-log?limit=${ACTIVITY_PAGE_SIZE}&offset=0`, fetcher)

  useEffect(() => {
    if (activityData) {
      setActivityLogs(activityData.logs ?? [])
      setActivityTotal(activityData.total ?? 0)
      setActivityHasMore(activityData.hasMore ?? false)
    }
  }, [activityData])

  async function loadMoreActivity() {
    setActivityLoadingMore(true)
    try {
      const res = await fetch(`/api/activity-log?limit=${ACTIVITY_PAGE_SIZE}&offset=${activityLogs.length}`)
      const json = await res.json()
      if (json.logs) {
        setActivityLogs((prev) => [...prev, ...json.logs])
        setActivityHasMore(json.hasMore ?? false)
        setActivityTotal(json.total ?? 0)
      }
    } finally {
      setActivityLoadingMore(false)
    }
  }

  // ── Overdue / Almost-Due Fixed Cost Reminders ──
  const { data: reminderData } = useSWR('/api/fixed-cost-reminders', fetcher)
  const allReminders: ReminderRow[] = reminderData?.reminders ?? []

  const urgentReminders = useMemo(() => {
    const todayStr = getThaiToday()
    const todayMs = new Date(todayStr + 'T00:00:00+07:00').getTime()
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000

    return allReminders
      .map((r) => {
        const dueMs = new Date(r.due_date + 'T00:00:00+07:00').getTime()
        const daysUntilDue = (dueMs - todayMs) / (24 * 60 * 60 * 1000)
        const isOverdue = daysUntilDue < 0
        const isAlmostDue = !isOverdue && daysUntilDue <= 5
        const dueDay = new Date(r.due_date + 'T12:00:00Z').getDate()
        const periodLabel = new Date(r.period_year, r.period_month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        return {
          ...r,
          label: COST_TYPE_LABELS[r.cost_type] || r.cost_type,
          dueDay,
          isOverdue,
          isAlmostDue,
          daysUntilDue: Math.ceil(daysUntilDue),
          periodLabel,
        }
      })
      .filter((r) => r.isOverdue || r.isAlmostDue)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }, [allReminders])

  const sales: DailySale[] = data?.sales ?? []
  const receipts: ReceiptRow[] = data?.receipts ?? []
  const fixedCosts: FixedCost[] = data?.fixedCosts ?? []
  const ledgerEntries: LedgerEntry[] = data?.ledgerEntries ?? []
  const [ledgerVisible, setLedgerVisible] = useState(5)

  const totalCash = sales.reduce((s, r) => s + Number(r.cash_amount), 0)
  const totalPromptPay = sales.reduce((s, r) => s + Number(r.promptpay_amount), 0)
  const totalCard = sales.reduce((s, r) => s + Number(r.credit_card_amount), 0)
  const totalIncome = totalCash + totalPromptPay + totalCard

  const incomeData = [
    { name: 'Cash', value: totalCash },
    { name: 'PromptPay', value: totalPromptPay },
    { name: 'Credit Card', value: totalCard },
  ].filter((d) => d.value > 0)

  const receiptsByCategory: Record<string, number> = {}
  receipts.forEach((r) => {
    receiptsByCategory[r.category] = (receiptsByCategory[r.category] || 0) + Number(r.total)
  })
  const fixedByCategory: Record<string, number> = {}
  fixedCosts.forEach((f) => {
    fixedByCategory[f.category] = (fixedByCategory[f.category] || 0) + Number(f.amount)
  })
  const allExpenseCategories = { ...receiptsByCategory }
  Object.entries(fixedByCategory).forEach(([k, v]) => {
    allExpenseCategories[k] = (allExpenseCategories[k] || 0) + v
  })
  const expenseData = Object.entries(allExpenseCategories)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  // Cash destination data (from transfer_details in daily sales)
  const destinationTotals: Record<string, number> = {}
  sales.forEach((s) => {
    const transfers = s.transfer_details
    if (transfers && Array.isArray(transfers)) {
      transfers.forEach((t: TransferDetail) => {
        const dest = t.destination || 'Unknown'
        destinationTotals[dest] = (destinationTotals[dest] || 0) + Number(t.amount || 0)
      })
    }
  })
  const destinationData = Object.entries(destinationTotals)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const hasDestinations = destinationData.length > 0

  const totalExpenses = expenseData.reduce((s, d) => s + d.value, 0)
  const totalReceiptExpenses = Object.values(receiptsByCategory).reduce((s, v) => s + v, 0)
  const totalFixedCostExpenses = Object.values(fixedByCategory).reduce((s, v) => s + v, 0)
  const netProfit = totalIncome - totalExpenses

  const hasIncome = incomeData.length > 0
  const hasExpenses = expenseData.length > 0

  const VIEW_MODES: { value: ViewMode; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      {/* View Mode Tabs */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === m.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Custom date range picker */}
        {viewMode === 'custom' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-8 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading data...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Summary Cards */}
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
            <div className="rounded-2xl bg-rose-500 p-4 shadow-lg shadow-rose-500/20">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50/20">
                  <TrendingDown className="h-5 w-5 text-rose-50" />
                </div>
                <div>
                  <p className="text-xs font-medium text-rose-50/80 uppercase tracking-wide">Expenses</p>
                  <p className="text-xl font-bold text-white">{formatBaht(totalExpenses)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 border-t border-rose-50/20 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-50/80">Receipts</span>
                  <span className="text-xs font-semibold text-white">{formatBaht(totalReceiptExpenses)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-50/80">Fixed Costs</span>
                  <span className="text-xs font-semibold text-white">{formatBaht(totalFixedCostExpenses)}</span>
                </div>
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

          {/* Overdue & Almost-Due Fixed Cost Reminders */}
          {urgentReminders.length > 0 && (
            <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50/50 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-red-700">Upcoming & Overdue Bills</h2>
                    <p className="text-[11px] text-red-500">
                      {urgentReminders.filter(r => r.isOverdue).length} overdue, {urgentReminders.filter(r => r.isAlmostDue).length} due soon
                    </p>
                  </div>
                </div>
                <Link
                  href="/fixed-costs"
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-200"
                >
                  Go to Fixed Costs
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {urgentReminders.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      item.isOverdue
                        ? 'border-red-300 bg-red-50/80'
                        : 'border-amber-300 bg-amber-50/60'
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      item.isOverdue ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <AlertTriangle className={`h-3.5 w-3.5 ${item.isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-semibold ${item.isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                        {item.label}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {item.periodLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">|</span>
                        {item.isOverdue ? (
                          <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-red-100 text-red-600">
                            Overdue
                          </span>
                        ) : (
                          <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-600">
                            Due in {item.daysUntilDue}d
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pie Charts */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold text-foreground">Revenue by Method</h2>
              <p className="mb-3 text-xs text-muted-foreground">{dateLabel}</p>
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
                      label={({ name, value }) => `${name} ${formatBaht(value)}`}
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
                  <p className="text-sm text-muted-foreground">No revenue data for this period</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold text-foreground">Expenses by Category</h2>
              <p className="mb-3 text-xs text-muted-foreground">{dateLabel}</p>
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                  <p className="text-sm text-muted-foreground">No expense data for this period</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold text-foreground">Cash Destinations</h2>
              <p className="mb-3 text-xs text-muted-foreground">Where transfers are stored</p>
              {hasDestinations ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={destinationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={11}
                    >
                      {destinationData.map((_, i) => (
                        <Cell key={i} fill={DESTINATION_COLORS[i % DESTINATION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number, name: string) => [formatBaht(val), name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                        padding: '8px 12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">No transfer data for this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Ledger / Journal */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Ledger / Journal</h2>
                <p className="text-xs text-muted-foreground">{dateLabel}</p>
              </div>
              {ledgerEntries.length > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {Math.min(ledgerVisible, ledgerEntries.length)} of {ledgerEntries.length}
                </span>
              )}
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
                      {ledgerEntries.slice(0, ledgerVisible).map((entry) => (
                        <tr key={entry.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/50">
                          <td className="whitespace-nowrap px-5 py-3 text-foreground">{formatThaiDate(entry.entry_date)}</td>
                          <td className="px-5 py-3 text-foreground">{entry.description}</td>
                          <td className="px-5 py-3 capitalize text-muted-foreground">{entry.category}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              entry.entry_type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {entry.entry_type === 'income' ? 'Revenue' : 'Expense'}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${
                            entry.entry_type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                          }`}>
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
                  {ledgerEntries.slice(0, ledgerVisible).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{entry.description}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatThaiDate(entry.entry_date)}</span>
                          <span className={`inline-flex rounded-full px-1.5 py-px text-[10px] font-semibold ${
                            entry.entry_type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {entry.entry_type === 'income' ? 'Revenue' : 'Expense'}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${
                        entry.entry_type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        {entry.entry_type === 'income' ? '+' : '-'}
                        {formatBaht(Number(entry.amount))}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Load More / Show Less buttons */}
                {ledgerEntries.length > 5 && (
                  <div className="flex items-center justify-center gap-3 border-t border-border px-5 py-3">
                    {ledgerVisible < ledgerEntries.length && (
                      <button
                        onClick={() => setLedgerVisible((v) => Math.min(v + 5, ledgerEntries.length))}
                        className="rounded-lg bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                      >
                        Load 5 more
                      </button>
                    )}
                    {ledgerVisible > 5 && (
                      <button
                        onClick={() => setLedgerVisible(5)}
                        className="rounded-lg px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
                <Wallet className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No journal entries for this period. Entries are created when you submit sales reports, receipts, and fixed costs.
                </p>
              </div>
            )}
          </div>

          {/* Team Activity Log */}
          <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Team Activity</h2>
                {activityTotal > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {activityLogs.length} of {activityTotal}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Recent actions by team members</p>
            </div>

            {activityLogs.length > 0 ? (
              <>
                <div className="flex flex-col divide-y divide-border/50">
                  {activityLogs.map((log) => {
                    const userName = log.user_email?.split('@')[0] || 'Unknown'
                    const time = new Date(log.created_at).toLocaleString('en-US', {
                      timeZone: 'Asia/Bangkok',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    let icon = <FileText className="h-4 w-4" />
                    let iconBg = 'bg-secondary'
                    let actionLabel = log.action
                    let entityLabel = log.entity_type.replace(/_/g, ' ')

                    switch (log.entity_type) {
                      case 'sales_report':
                        icon = <DollarSign className="h-4 w-4 text-emerald-600" />
                        iconBg = 'bg-emerald-100'
                        entityLabel = 'sales report'
                        break
                      case 'receipt':
                        icon = <Receipt className="h-4 w-4 text-amber-600" />
                        iconBg = 'bg-amber-100'
                        break
                      case 'fixed_cost':
                        icon = <FileText className="h-4 w-4 text-sky-600" />
                        iconBg = 'bg-sky-100'
                        entityLabel = 'fixed cost'
                        break
                      case 'invoice':
                        icon = <FileText className="h-4 w-4 text-violet-600" />
                        iconBg = 'bg-violet-100'
                        break
                      case 'auth':
                        icon = <LogIn className="h-4 w-4 text-primary" />
                        iconBg = 'bg-primary/10'
                        entityLabel = ''
                        actionLabel = 'signed in'
                        break
                    }

                    if (log.action === 'marked_paid') {
                      icon = <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      iconBg = 'bg-emerald-100'
                      actionLabel = 'marked paid'
                    } else if (log.action === 'marked_unpaid') {
                      actionLabel = 'marked unpaid'
                    }

                    const detail = log.details || {}
                    let extraInfo = ''
                    if (detail.vendor) extraInfo = String(detail.vendor)
                    else if (detail.name) extraInfo = String(detail.name)
                    else if (detail.customerName) extraInfo = String(detail.customerName)
                    else if (detail.date) extraInfo = String(detail.date)

                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">
                            <span className="font-semibold capitalize">{userName}</span>
                            {' '}{actionLabel}{entityLabel ? ` ${entityLabel}` : ''}
                            {extraInfo && (
                              <span className="text-muted-foreground">{' - '}{extraInfo}</span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
                        </div>
                        {detail.total != null && (
                          <span className="shrink-0 text-xs font-semibold text-foreground">
                            {formatBaht(Number(detail.total))}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {activityHasMore && (
                  <div className="border-t border-border px-5 py-3">
                    <button
                      onClick={loadMoreActivity}
                      disabled={activityLoadingMore}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {activityLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Load More ({activityTotal - activityLogs.length} remaining)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center">
                <Activity className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No activity yet. Actions will appear here as the team uses Madre Tools.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
