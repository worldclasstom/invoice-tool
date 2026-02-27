'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { formatThaiDate } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  Loader2,
  BarChart3,
  DollarSign,
  Users,
  ShoppingBag,
  Clock,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Minus,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

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

type ViewMode = 'weekly' | 'monthly' | 'quarterly' | 'custom'

function getDateRange(mode: ViewMode, customFrom: string, customTo: string): { from: string; to: string } {
  const today = getThaiToday()
  const d = new Date(today + 'T12:00:00')

  switch (mode) {
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
    case 'quarterly': {
      const qMonth = Math.floor(d.getMonth() / 3) * 3
      const start = new Date(d.getFullYear(), qMonth, 1)
      const end = new Date(d.getFullYear(), qMonth + 3, 0)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
    case 'custom':
      return { from: customFrom || today, to: customTo || today }
  }
}

function getDateLabel(mode: ViewMode, from: string, to: string): string {
  const full: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'long', day: 'numeric' }
  const short: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' }
  const monthYear: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Bangkok', month: 'long', year: 'numeric' }

  switch (mode) {
    case 'weekly':
      return `${new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', short)} - ${new Date(to + 'T12:00:00Z').toLocaleDateString('th-TH', full)}`
    case 'monthly':
      return new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', monthYear)
    case 'quarterly': {
      const fromLabel = new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'short' })
      const toLabel = new Date(to + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'short', year: 'numeric' })
      return `${fromLabel} - ${toLabel}`
    }
    case 'custom':
      if (from === to) return new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', full)
      return `${new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', short)} - ${new Date(to + 'T12:00:00Z').toLocaleDateString('th-TH', full)}`
  }
}

function navigateRange(mode: ViewMode, from: string, direction: number): { from: string; to: string } {
  const d = new Date(from + 'T12:00:00')
  switch (mode) {
    case 'weekly': {
      d.setDate(d.getDate() + direction * 7)
      const dow = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dow + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: toDateStr(monday), to: toDateStr(sunday) }
    }
    case 'monthly': {
      d.setMonth(d.getMonth() + direction)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
    case 'quarterly': {
      d.setMonth(d.getMonth() + direction * 3)
      const qMonth = Math.floor(d.getMonth() / 3) * 3
      const start = new Date(d.getFullYear(), qMonth, 1)
      const end = new Date(d.getFullYear(), qMonth + 3, 0)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
    case 'custom':
      return { from, to: from }
  }
}

function formatBaht(v: number): string {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function formatShortBaht(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

const CHART_COLORS = [
  'hsl(152, 55%, 38%)',   // primary green
  'hsl(16, 85%, 58%)',    // accent orange
  'hsl(42, 92%, 56%)',    // gold
  'hsl(174, 60%, 46%)',   // tropical teal
  'hsl(210, 60%, 52%)',   // sky blue
  'hsl(280, 50%, 56%)',   // violet
  'hsl(340, 65%, 55%)',   // rose
  'hsl(90, 50%, 45%)',    // lime
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{formatBaht(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsClient() {
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [manualRange, setManualRange] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    const today = getThaiToday()
    setCustomFrom(today)
    setCustomTo(today)
    setMounted(true)
  }, [])

  const { from, to } = useMemo(() => {
    if (!mounted) return { from: '', to: '' }
    if (manualRange) return manualRange
    return getDateRange(viewMode, customFrom, customTo)
  }, [mounted, viewMode, customFrom, customTo, manualRange])

  const dateLabel = useMemo(() => {
    if (!from || !to) return ''
    return getDateLabel(viewMode, from, to)
  }, [viewMode, from, to])

  const { data, isLoading } = useSWR(
    from && to ? `/api/analytics?from=${from}&to=${to}` : null,
    fetcher
  )

  const handleNavigate = useCallback((direction: number) => {
    const currentFrom = manualRange?.from ?? from
    if (!currentFrom) return
    const newRange = navigateRange(viewMode, currentFrom, direction)
    setManualRange(newRange)
  }, [viewMode, from, manualRange])

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setManualRange(null)
  }

  const summary = data?.summary
  const dailyRevenue = data?.dailyRevenue ?? []
  const paymentMethods = data?.paymentMethods
  const expenseByCategory = data?.expenseByCategory ?? []
  const topVendors = data?.topVendors ?? []
  const revenueVsExpense = data?.revenueVsExpense ?? []
  const weatherImpact = data?.weatherImpact ?? []
  const busiestTimes = data?.busiestTimes ?? []
  const fixedCostsData = data?.fixedCosts ?? []

  // Payment methods pie data
  const pieData = paymentMethods
    ? [
        { name: 'Cash', value: paymentMethods.cash },
        { name: 'PromptPay', value: paymentMethods.promptpay },
        { name: 'Credit Card', value: paymentMethods.creditCard },
      ].filter((d) => d.value > 0)
    : []

  // Format date for chart x-axis
  const formatChartDate = (date: string) => {
    const d = new Date(date + 'T12:00:00Z')
    return d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' })
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground text-balance">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel || 'Loading...'}</p>
        </div>

        {/* Date Controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl bg-card p-1 shadow-sm border border-border">
            {(['weekly', 'monthly', 'quarterly', 'custom'] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  viewMode === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {viewMode !== 'custom' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleNavigate(-1)}
                  className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleNavigate(1)}
                  className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Next period"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {viewMode === 'custom' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => { setCustomFrom(e.target.value); setManualRange(null) }}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground"
                  />
                </div>
                <Minus className="h-3 w-3 text-muted-foreground" />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => { setCustomTo(e.target.value); setManualRange(null) }}
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground"
                />
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KPICard
                icon={<DollarSign className="h-4 w-4" />}
                iconBg="bg-emerald-100 text-emerald-600"
                label="Total Revenue"
                value={formatBaht(summary?.totalRevenue ?? 0)}
                trend={summary?.totalRevenue > summary?.totalExpenses ? 'up' : 'down'}
              />
              <KPICard
                icon={<Wallet className="h-4 w-4" />}
                iconBg="bg-rose-100 text-rose-600"
                label="Total Expenses"
                value={formatBaht(summary?.totalExpenses ?? 0)}
              />
              <KPICard
                icon={<TrendingUp className="h-4 w-4" />}
                iconBg={(summary?.netProfit ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}
                label="Net Profit"
                value={formatBaht(summary?.netProfit ?? 0)}
                trend={(summary?.netProfit ?? 0) >= 0 ? 'up' : 'down'}
              />
              <KPICard
                icon={<BarChart3 className="h-4 w-4" />}
                iconBg="bg-amber-100 text-amber-600"
                label="Avg Daily Sales"
                value={formatBaht(summary?.avgDailySales ?? 0)}
              />
              <KPICard
                icon={<Users className="h-4 w-4" />}
                iconBg="bg-sky-100 text-sky-600"
                label="Tables Served"
                value={String(summary?.totalTables ?? 0)}
              />
              <KPICard
                icon={<ShoppingBag className="h-4 w-4" />}
                iconBg="bg-violet-100 text-violet-600"
                label="To-Go Orders"
                value={String(summary?.totalTogo ?? 0)}
              />
            </div>

            {/* Revenue Trend + Payment Breakdown */}
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-foreground">Revenue Trend</h3>
                {dailyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyRevenue}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(152, 55%, 38%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(152, 55%, 38%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(48, 20%, 88%)" />
                      <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" />
                      <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" width={50} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Revenue"
                        stroke="hsl(152, 55%, 38%)"
                        strokeWidth={2}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No sales data for this period" />
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-foreground">Payment Methods</h3>
                {pieData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatBaht(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap justify-center gap-3">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-semibold text-foreground">{formatBaht(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyChart message="No payment data" />
                )}
              </div>
            </div>

            {/* Revenue vs Expenses */}
            <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-foreground">Revenue vs Expenses</h3>
              {revenueVsExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueVsExpense} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(48, 20%, 88%)" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" />
                    <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(152, 55%, 38%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="hsl(16, 85%, 58%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No ledger data for this period" />
              )}
            </div>

            {/* Expenses by Category + Top Vendors */}
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-foreground">Expenses by Category</h3>
                {expenseByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={expenseByCategory} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(48, 20%, 88%)" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" width={90} />
                      <Tooltip formatter={(v: number) => formatBaht(v)} />
                      <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                        {expenseByCategory.map((_: unknown, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No expense data" />
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-foreground">Top Vendors</h3>
                {topVendors.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {topVendors.map((v: { name: string; amount: number }, i: number) => {
                      const maxAmount = topVendors[0]?.amount || 1
                      const pct = (v.amount / maxAmount) * 100
                      return (
                        <div key={v.name} className="flex items-center gap-3">
                          <span className="w-5 text-right text-xs font-semibold text-muted-foreground">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium text-foreground">{v.name}</span>
                              <span className="shrink-0 text-xs font-semibold text-foreground">{formatBaht(v.amount)}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyChart message="No vendor data" />
                )}
              </div>
            </div>

            {/* Fixed Costs + Weather + Busiest Times */}
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              {/* Fixed Costs */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-foreground">Fixed Costs</h3>
                {fixedCostsData.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {fixedCostsData.map((f: { name: string; total: number; paid: number; unpaid: number }, i: number) => (
                      <div key={f.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="truncate text-sm text-foreground capitalize">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-foreground">{formatBaht(f.total)}</span>
                          {f.unpaid > 0 && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Unpaid</span>
                          )}
                          {f.unpaid === 0 && f.total > 0 && (
                            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Paid</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyChart message="No fixed costs" />
                )}
              </div>

              {/* Weather Impact */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-sky-500" />
                  <h3 className="text-sm font-bold text-foreground">Weather Impact</h3>
                </div>
                {weatherImpact.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {weatherImpact.map((w: { weather: string; avgSales: number; days: number }, i: number) => (
                      <div key={w.weather} className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{w.weather === 'sunny' ? '\u2600\uFE0F' : w.weather === 'rainy' ? '\uD83C\uDF27\uFE0F' : w.weather === 'cloudy' ? '\u2601\uFE0F' : '\uD83C\uDF24\uFE0F'}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground capitalize">{w.weather}</p>
                            <p className="text-[11px] text-muted-foreground">{w.days} day{w.days > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatBaht(w.avgSales)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyChart message="No weather data" />
                )}
              </div>

              {/* Busiest Times */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-foreground">Busiest Times</h3>
                </div>
                {busiestTimes.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {busiestTimes.slice(0, 6).map((t: { time: string; count: number }, i: number) => {
                      const maxCount = busiestTimes[0]?.count || 1
                      const pct = (t.count / maxCount) * 100
                      return (
                        <div key={t.time} className="flex items-center gap-3">
                          <span className="w-16 shrink-0 text-xs font-medium text-foreground">{t.time}</span>
                          <div className="flex-1">
                            <div className="h-5 w-full overflow-hidden rounded-md bg-secondary">
                              <div
                                className="flex h-full items-center rounded-md pl-2 transition-all"
                                style={{ width: `${Math.max(pct, 15)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              >
                                <span className="text-[10px] font-bold text-card">{t.count}x</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyChart message="No time data" />
                )}
              </div>
            </div>

            {/* Service Breakdown (Tables & Togo Trend) */}
            {dailyRevenue.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-foreground">Service Breakdown</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyRevenue} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(48, 20%, 88%)" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 46%)" width={30} />
                    <Tooltip />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                    <Bar dataKey="tables" name="Tables" fill="hsl(174, 60%, 46%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="togo" name="To-Go" fill="hsl(42, 92%, 56%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function KPICard({
  icon,
  iconBg,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  trend?: 'up' | 'down'
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-rose-500" />}
      </div>
      <div>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
