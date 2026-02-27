'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { TrendingUp, TrendingDown, Wallet, Loader2, BarChart3, DollarSign, ChevronLeft, ChevronRight, Zap, Leaf, Cloud, Sun, CloudRain, Users, ShoppingBag, Clock, Receipt, CreditCard, CheckCircle2, XCircle } from 'lucide-react'
import { Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, PieChart, Pie, Cell } from 'recharts'

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

type ViewMode = 'monthly' | 'quarterly' | 'yearly'

function getDateRange(mode: ViewMode, ref: string): { from: string; to: string } {
  const d = new Date(ref + 'T12:00:00')
  switch (mode) {
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
    case 'yearly': {
      const start = new Date(d.getFullYear(), 0, 1)
      const end = new Date(d.getFullYear(), 11, 31)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
  }
}

function getDateLabel(mode: ViewMode, from: string, to: string): string {
  switch (mode) {
    case 'monthly':
      return new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'long', year: 'numeric' })
    case 'quarterly': {
      const fromL = new Date(from + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'short' })
      const toL = new Date(to + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'short', year: 'numeric' })
      return `${fromL} - ${toL}`
    }
    case 'yearly': {
      const year = new Date(from + 'T12:00:00Z').getFullYear()
      // Thai Buddhist year
      return `${year + 543}`
    }
  }
}

function navigateRange(mode: ViewMode, from: string, direction: number): string {
  const d = new Date(from + 'T12:00:00')
  if (mode === 'monthly') d.setMonth(d.getMonth() + direction)
  else if (mode === 'quarterly') d.setMonth(d.getMonth() + direction * 3)
  else d.setFullYear(d.getFullYear() + direction)
  return toDateStr(d)
}

function formatBaht(v: number): string {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function formatShortBaht(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

// Professional color palette
const COLORS = {
  sales: 'hsl(152, 45%, 42%)',
  expenses: 'hsl(354, 52%, 56%)',
  ingredients: 'hsl(24, 65%, 52%)',
  fixedCosts: 'hsl(220, 42%, 56%)',
  electricity: 'hsl(38, 72%, 52%)',
  sunny: 'hsl(42, 68%, 52%)',
  rainy: 'hsl(210, 48%, 54%)',
  cloudy: 'hsl(200, 12%, 64%)',
}

const CATEGORY_COLORS = [
  'hsl(24, 65%, 52%)',
  'hsl(152, 45%, 42%)',
  'hsl(38, 72%, 52%)',
  'hsl(174, 42%, 44%)',
  'hsl(220, 42%, 56%)',
  'hsl(354, 42%, 58%)',
  'hsl(270, 30%, 56%)',
  'hsl(82, 38%, 46%)',
]

const PAYMENT_COLORS = ['hsl(152, 45%, 42%)', 'hsl(220, 42%, 56%)', 'hsl(38, 72%, 52%)']

const GRID_STROKE = 'hsl(40, 12%, 90%)'
const AXIS_STROKE = 'hsl(160, 8%, 52%)'

// Category-specific color map for fixed costs & vendors
const FIXED_CATEGORY_COLORS: Record<string, string> = {
  utilities: 'hsl(38, 72%, 52%)',
  rent: 'hsl(220, 42%, 56%)',
  salary: 'hsl(152, 45%, 42%)',
  insurance: 'hsl(270, 30%, 56%)',
  subscription: 'hsl(174, 42%, 44%)',
  maintenance: 'hsl(354, 42%, 58%)',
  ingredients: 'hsl(24, 65%, 52%)',
  packaging: 'hsl(82, 38%, 46%)',
  cleaning: 'hsl(200, 32%, 52%)',
  equipment: 'hsl(320, 32%, 52%)',
  other: 'hsl(200, 12%, 58%)',
}

function getCategoryColor(category: string): string {
  return FIXED_CATEGORY_COLORS[category?.toLowerCase()] ?? CATEGORY_COLORS[Math.abs(hashStr(category)) % CATEGORY_COLORS.length]
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < (s?.length ?? 0); i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-2.5 shadow-xl shadow-black/5">
      <p className="mb-1.5 text-xs font-bold text-foreground">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{formatBaht(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsClient() {
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [refDate, setRefDate] = useState('')

  useEffect(() => {
    setRefDate(getThaiToday())
    setMounted(true)
  }, [])

  const { from, to } = useMemo(() => {
    if (!mounted || !refDate) return { from: '', to: '' }
    return getDateRange(viewMode, refDate)
  }, [mounted, viewMode, refDate])

  const dateLabel = useMemo(() => {
    if (!from || !to) return ''
    return getDateLabel(viewMode, from, to)
  }, [viewMode, from, to])

  const { data, isLoading } = useSWR(
    from && to ? `/api/analytics?from=${from}&to=${to}&view=${viewMode}` : null,
    fetcher
  )

  const handleNavigate = useCallback((direction: number) => {
    setRefDate((prev) => navigateRange(viewMode, prev, direction))
  }, [viewMode])

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setRefDate(getThaiToday())
  }

  const summary = data?.summary
  const salesVsExpenses = data?.salesVsExpenses ?? []
  const salesVsIngredients = data?.salesVsIngredients ?? []
  const salesVsFixed = data?.salesVsFixed ?? []
  const expenseCategoryDaily = data?.expenseCategoryDaily ?? []
  const expenseCategories: string[] = data?.expenseCategories ?? []
  const weatherVsSales = data?.weatherVsSales ?? []
  const electricityVsWeather = data?.electricityVsWeather ?? []
  const monthlySales = data?.monthlySales ?? []

  const paymentMethods = data?.paymentMethods ?? []
  const topVendors = data?.topVendors ?? []
  const busiestTimes = data?.busiestTimes ?? []
  const serviceBreakdown = data?.serviceBreakdown ?? []
  const fixedCostsDetail = data?.fixedCostsDetail ?? []
  const categoryTotals = data?.categoryTotals ?? []

  const formatChartDate = (date: string) => {
    if (!date) return ''
    const d = new Date(date + 'T12:00:00Z')
    return d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' })
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground text-balance">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel || 'Loading...'}</p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl bg-card p-1 shadow-sm border border-border">
            {(['monthly', 'quarterly', 'yearly'] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all ${
                  viewMode === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNavigate(-1)}
              className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[180px] text-center text-sm font-semibold text-foreground">{dateLabel}</span>
            <button
              onClick={() => handleNavigate(1)}
              className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
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
                iconBg="bg-emerald-50 text-emerald-700"
                label="Total Revenue"
                value={formatBaht(summary?.totalRevenue ?? 0)}
                trend={(summary?.totalRevenue ?? 0) > (summary?.totalExpenses ?? 0) ? 'up' : 'down'}
                subtitle={`${summary?.daysReported ?? 0} day${(summary?.daysReported ?? 0) === 1 ? '' : 's'} reported`}
              />
              <KPICard
                icon={<Wallet className="h-4 w-4" />}
                iconBg="bg-red-50 text-red-600"
                label="Total Expenses"
                value={formatBaht(summary?.totalExpenses ?? 0)}
              />
              <KPICard
                icon={<TrendingUp className="h-4 w-4" />}
                iconBg={(summary?.netProfit ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}
                label="Net Profit"
                value={formatBaht(summary?.netProfit ?? 0)}
                trend={(summary?.netProfit ?? 0) >= 0 ? 'up' : 'down'}
              />
              <KPICard
                icon={<Leaf className="h-4 w-4" />}
                iconBg="bg-orange-50 text-orange-600"
                label="Ingredients"
                value={formatBaht(summary?.totalIngredients ?? 0)}
              />
              <KPICard
                icon={<Users className="h-4 w-4" />}
                iconBg="bg-slate-100 text-slate-600"
                label="Tables Served"
                value={String(summary?.totalTables ?? 0)}
              />
              <KPICard
                icon={<ShoppingBag className="h-4 w-4" />}
                iconBg="bg-teal-50 text-teal-600"
                label="To-Go Orders"
                value={String(summary?.totalTogo ?? 0)}
              />
            </div>

            {/* ══════════ GENERAL INSIGHTS (shown first, in both views) ══════════ */}

            {/* Row: Payment Methods + Service Breakdown + Expense Categories */}
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              {/* Payment Methods Donut */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-700" />
                    <h3 className="text-sm font-bold text-foreground">Payment Methods</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Revenue split by payment type</p>
                </div>
                {paymentMethods.length > 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {paymentMethods.map((_: { name: string; value: number }, i: number) => (
                            <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            return (
                              <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-xl shadow-black/5">
                                <p className="text-xs font-semibold text-foreground">{d.name}: {formatBaht(Number(d.value))}</p>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3">
                      {paymentMethods.map((p: { name: string; value: number }, i: number) => (
                        <div key={p.name} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                          <span className="text-muted-foreground">{p.name}</span>
                          <span className="font-semibold text-foreground">{formatBaht(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptyChart />}
              </div>

              {/* Service Breakdown Donut */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-600" />
                    <h3 className="text-sm font-bold text-foreground">Service Breakdown</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Dine-in tables vs to-go orders</p>
                </div>
                {serviceBreakdown.length > 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          <Cell fill={COLORS.sales} />
                          <Cell fill={CATEGORY_COLORS[3]} />
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            return (
                              <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-xl shadow-black/5">
                                <p className="text-xs font-semibold text-foreground">{d.name}: {d.value}</p>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3">
                      {serviceBreakdown.map((s: { name: string; value: number }, i: number) => (
                        <div key={s.name} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i === 0 ? COLORS.sales : CATEGORY_COLORS[3] }} />
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="font-semibold text-foreground">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptyChart />}
              </div>

              {/* Expense Category Totals Donut */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-orange-600" />
                    <h3 className="text-sm font-bold text-foreground">Expense Categories</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Total spending by category</p>
                </div>
                {categoryTotals.length > 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={categoryTotals} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                          {categoryTotals.map((_: { name: string; value: number }, i: number) => (
                            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            return (
                              <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-xl shadow-black/5">
                                <p className="text-xs font-semibold text-foreground">{d.name}: {formatBaht(Number(d.value))}</p>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3">
                      {categoryTotals.map((c: { name: string; value: number }, i: number) => (
                        <div key={c.name} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                          <span className="text-muted-foreground">{c.name}</span>
                          <span className="font-semibold text-foreground">{formatBaht(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptyChart />}
              </div>
            </div>

            {/* Row: Top Vendors + Busiest Times + Fixed Costs */}
            <div className="mb-8 grid gap-4 lg:grid-cols-3">
              {/* Top Vendors - colored by category */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                    <h3 className="text-sm font-bold text-foreground">Top Vendors</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Highest spending vendors by category</p>
                </div>
                {topVendors.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {topVendors.map((v: { vendor: string; total: number; category: string }, i: number) => {
                      const maxVal = topVendors[0]?.total || 1
                      const barColor = getCategoryColor(v.category)
                      return (
                        <div key={v.vendor} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: barColor }}>
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate text-sm font-medium text-foreground">{v.vendor}</span>
                                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize" style={{ backgroundColor: barColor + '20', color: barColor }}>
                                  {v.category}
                                </span>
                              </div>
                              <span className="shrink-0 ml-2 text-xs font-bold text-foreground">{formatBaht(v.total)}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(v.total / maxVal) * 100}%`, backgroundColor: barColor }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyChart />}
              </div>

              {/* Busiest Times - colored by index */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-foreground">Busiest Times</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Most frequently reported peak periods</p>
                </div>
                {busiestTimes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {busiestTimes.map((t: { time: string; count: number }, i: number) => {
                      const maxCount = busiestTimes[0]?.count || 1
                      const barColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                      return (
                        <div key={t.time} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: barColor + '18' }}>
                            <Clock className="h-4 w-4" style={{ color: barColor }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">{t.time}</span>
                              <span className="text-xs font-bold text-muted-foreground">{t.count}x</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(t.count / maxCount) * 100}%`, backgroundColor: barColor }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyChart />}
              </div>

              {/* Fixed Costs Status - colored by category */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Fixed Costs</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Payment status for recurring expenses</p>
                </div>
                {fixedCostsDetail.length > 0 ? (
                  <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto">
                    {fixedCostsDetail.map((f: { name: string; category: string; amount: number; isPaid: boolean; month: number; year: number }, i: number) => {
                      const catColor = getCategoryColor(f.category)
                      return (
                        <div key={`${f.name}-${f.month}-${f.year}-${i}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: catColor + '0A' }}>
                          {f.isPaid ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                          )}
                          <div className="flex h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: catColor }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              <span className="capitalize font-medium" style={{ color: catColor }}>{f.category}</span>
                              {' \u00B7 '}{f.month}/{f.year}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-foreground">{formatBaht(f.amount)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyChart />}
              </div>
            </div>

            {/* ══════════ MONTHLY VIEW ══════════ */}
            {viewMode === 'monthly' && (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monthly Trends</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* 1) Daily Sales vs All Expenses - ComposedChart (Bar + Line) */}
                <ChartCard title="Daily Sales vs All Expenses" subtitle="Compare daily revenue against receipt-based expenses">
                  {salesVsExpenses.some((d: { sales: number; expenses: number }) => d.sales > 0 || d.expenses > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={salesVsExpenses}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={50} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="sales" name="Sales" fill={COLORS.sales} radius={[3, 3, 0, 0]} opacity={0.8} />
                        <Line type="monotone" dataKey="expenses" name="Expenses" stroke={COLORS.expenses} strokeWidth={2.5} dot={false} strokeDasharray="8 4" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* 2) Daily Sales vs Ingredient Costs - ComposedChart (Bar + Line) */}
                <ChartCard title="Daily Sales vs Ingredient Costs" subtitle="Track ingredient spending relative to daily revenue">
                  {salesVsIngredients.some((d: { sales: number; ingredients: number }) => d.sales > 0 || d.ingredients > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={salesVsIngredients}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={50} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="sales" name="Sales" fill={COLORS.sales} radius={[3, 3, 0, 0]} opacity={0.8} />
                        <Line type="monotone" dataKey="ingredients" name="Ingredients" stroke={COLORS.ingredients} strokeWidth={2.5} dot={false} strokeDasharray="8 4" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* 3) Sales vs Fixed Costs - ComposedChart (Bar + Line) */}
                <ChartCard title="Daily Sales vs Fixed Costs" subtitle="Fixed costs spread evenly across the month vs daily sales">
                  {salesVsFixed.some((d: { sales: number; fixedCosts: number }) => d.sales > 0 || d.fixedCosts > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={salesVsFixed}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={50} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="sales" name="Sales" fill={COLORS.sales} radius={[3, 3, 0, 0]} opacity={0.8} />
                        <Line type="monotone" dataKey="fixedCosts" name="Fixed Costs" stroke={COLORS.fixedCosts} strokeWidth={2.5} dot={false} strokeDasharray="8 4" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* 4) All Expense Categories Separately */}
                <ChartCard title="Expense Breakdown by Category" subtitle="Every expense category plotted individually over the period">
                  {expenseCategoryDaily.length > 0 && expenseCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={expenseCategoryDaily} barSize={expenseCategories.length > 4 ? 8 : 14}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={50} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
                        {expenseCategories.map((cat: string, i: number) => (
                          <Bar key={cat} dataKey={cat} name={cat.charAt(0).toUpperCase() + cat.slice(1)} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} radius={[2, 2, 0, 0]} stackId="expenses" />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* 5) Weather vs Average Daily Sales */}
                <ChartCard title="Weather vs Average Daily Sales" subtitle="How weather conditions affect average revenue per day">
                  {weatherVsSales.length > 0 ? (
                    <div className="grid gap-6 lg:grid-cols-5">
                      <div className="lg:col-span-3">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={weatherVsSales} barSize={48}>
                            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                            <XAxis dataKey="weather" tick={{ fontSize: 12 }} stroke={AXIS_STROKE} />
                            <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={50} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null
                                const d = payload[0].payload
                                return (
                                  <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl shadow-black/5">
                                    <p className="mb-1 text-sm font-bold text-foreground">{label}</p>
                                    <p className="text-xs text-muted-foreground">Avg Sales: <span className="font-semibold text-foreground">{formatBaht(d.avgSales)}</span></p>
                                    <p className="text-xs text-muted-foreground">Days: <span className="font-semibold text-foreground">{d.days}</span></p>
                                    <p className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatBaht(d.totalSales)}</span></p>
                                  </div>
                                )
                              }}
                            />
                            <Bar dataKey="avgSales" name="Avg Sales" radius={[6, 6, 0, 0]}>
                              {weatherVsSales.map((entry: { weather: string }, i: number) => {
                                const w = entry.weather.toLowerCase()
                                const color = w === 'sunny' ? COLORS.sunny : w === 'rainy' ? COLORS.rainy : w === 'cloudy' ? COLORS.cloudy : CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                                return <Cell key={i} fill={color} />
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-3 lg:col-span-2">
                        {weatherVsSales.map((w: { weather: string; avgSales: number; days: number; totalSales: number }) => {
                          const weatherLower = w.weather.toLowerCase()
                          return (
                            <div key={w.weather} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm">
                                {weatherLower === 'sunny' && <Sun className="h-5 w-5 text-amber-500" />}
                                {weatherLower === 'rainy' && <CloudRain className="h-5 w-5 text-sky-500" />}
                                {weatherLower === 'cloudy' && <Cloud className="h-5 w-5 text-muted-foreground" />}
                                {!['sunny', 'rainy', 'cloudy'].includes(weatherLower) && <Cloud className="h-5 w-5 text-muted-foreground" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{w.weather}</p>
                                <p className="text-xs text-muted-foreground">{w.days} day{w.days > 1 ? 's' : ''} recorded</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-foreground">{formatBaht(w.avgSales)}</p>
                                <p className="text-[11px] text-muted-foreground">avg/day</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : <EmptyChart />}
                </ChartCard>
              </>
            )}

            {/* ══════════ QUARTERLY VIEW ══════════ */}
            {viewMode === 'quarterly' && (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quarterly Trends</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Quarterly Sales Overview */}
                <ChartCard title="Quarterly Sales Overview" subtitle="Monthly revenue, expenses, and fixed costs">
                  {monthlySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={55} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="sales" name="Sales" fill={COLORS.sales} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Receipt Expenses" fill={COLORS.expenses} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fixedCosts" name="Fixed Costs" fill={COLORS.fixedCosts} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* Electricity Costs vs Weather Patterns */}
                <ChartCard title="Electricity Costs vs Weather Patterns" subtitle="Monthly electricity bill compared with weather distribution">
                  {electricityVsWeather.length > 0 ? (
                    <div className="flex flex-col gap-5">
                      <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={electricityVsWeather}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke={AXIS_STROKE} />
                          <YAxis yAxisId="cost" tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={55} />
                          <YAxis yAxisId="days" orientation="right" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={35} label={{ value: 'Days', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: AXIS_STROKE } }} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null
                              const d = payload[0]?.payload
                              return (
                                <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl shadow-black/5">
                                  <p className="mb-2 text-sm font-bold text-foreground">{label}</p>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs">
                                      <Zap className="h-3 w-3 text-amber-500" />
                                      <span className="text-muted-foreground">Electricity:</span>
                                      <span className="font-semibold text-foreground">{formatBaht(d?.electricity ?? 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Sun className="h-3 w-3 text-amber-400" />
                                      <span className="text-muted-foreground">Sunny days:</span>
                                      <span className="font-semibold text-foreground">{d?.sunnyDays ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <CloudRain className="h-3 w-3 text-sky-400" />
                                      <span className="text-muted-foreground">Rainy days:</span>
                                      <span className="font-semibold text-foreground">{d?.rainyDays ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Cloud className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">Cloudy days:</span>
                                      <span className="font-semibold text-foreground">{d?.cloudyDays ?? 0}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                          <Bar yAxisId="cost" dataKey="electricity" name="Electricity" fill={COLORS.electricity} radius={[4, 4, 0, 0]} barSize={36} />
                          <Line yAxisId="days" type="monotone" dataKey="sunnyDays" name="Sunny Days" stroke={COLORS.sunny} strokeWidth={2} dot={{ r: 4, fill: COLORS.sunny }} />
                          <Line yAxisId="days" type="monotone" dataKey="rainyDays" name="Rainy Days" stroke={COLORS.rainy} strokeWidth={2} dot={{ r: 4, fill: COLORS.rainy }} />
                          <Line yAxisId="days" type="monotone" dataKey="cloudyDays" name="Cloudy Days" stroke={COLORS.cloudy} strokeWidth={2} dot={{ r: 4, fill: COLORS.cloudy }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {electricityVsWeather.map((m: { monthLabel: string; electricity: number; sunnyDays: number; rainyDays: number; cloudyDays: number; totalDays: number }) => (
                          <div key={m.monthLabel} className="rounded-xl border border-border bg-secondary/30 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">{m.monthLabel}</span>
                              <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                                <Zap className="h-3 w-3" />
                                {formatBaht(m.electricity)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <WeatherBadge icon={<Sun className="h-3 w-3 text-amber-500" />} label="Sunny" count={m.sunnyDays} />
                              <WeatherBadge icon={<CloudRain className="h-3 w-3 text-sky-500" />} label="Rainy" count={m.rainyDays} />
                              <WeatherBadge icon={<Cloud className="h-3 w-3 text-muted-foreground" />} label="Cloudy" count={m.cloudyDays} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <EmptyChart />}
                </ChartCard>
              </>
            )}

            {/* ══════════ YEARLY VIEW ══════════ */}
            {viewMode === 'yearly' && (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Yearly Overview</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Yearly: Payment Methods by Month - Stacked Bar */}
                <ChartCard title="Payment Methods by Month" subtitle="Monthly revenue split by payment type across the year">
                  {monthlySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={55} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="sales" name="Total Sales" fill={COLORS.sales} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* Yearly: Revenue, Expenses & Fixed Costs */}
                <ChartCard title="Monthly Revenue, Expenses & Fixed Costs" subtitle="Full year comparison of revenue streams and cost centers">
                  {monthlySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={55} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="sales" name="Sales" fill={COLORS.sales} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Receipt Expenses" fill={COLORS.expenses} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fixedCosts" name="Fixed Costs" fill={COLORS.fixedCosts} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* Yearly: Expense Categories by Month - Stacked */}
                <ChartCard title="Expense Categories by Month" subtitle="How each expense category trends across the year">
                  {expenseCategoryDaily.length > 0 && expenseCategories.length > 0 ? (() => {
                    // Aggregate daily category data into monthly buckets
                    const monthlyCategories: Record<string, Record<string, number>> = {}
                    for (const day of expenseCategoryDaily) {
                      const d = day.date as string
                      const monthKey = d.substring(0, 7)
                      if (!monthlyCategories[monthKey]) monthlyCategories[monthKey] = {}
                      for (const cat of expenseCategories) {
                        monthlyCategories[monthKey][cat] = (monthlyCategories[monthKey][cat] || 0) + (Number(day[cat]) || 0)
                      }
                    }
                    const monthlyCategoryData = Object.entries(monthlyCategories).sort(([a], [b]) => a.localeCompare(b)).map(([m, cats]) => {
                      const label = new Date(m + '-15T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'short', year: '2-digit' })
                      return { monthLabel: label, ...cats }
                    })
                    return (
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={monthlyCategoryData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                          <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                          <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={55} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
                          {expenseCategories.map((cat: string, i: number) => (
                            <Bar key={cat} dataKey={cat} name={cat.charAt(0).toUpperCase() + cat.slice(1)} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} radius={[2, 2, 0, 0]} stackId="expenses" />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })() : <EmptyChart />}
                </ChartCard>

                {/* Yearly: Top Vendors */}
                <div className="mb-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-orange-600" />
                        <h3 className="text-sm font-bold text-foreground">Top Vendors (Yearly)</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">Highest spending vendors for the year</p>
                    </div>
                    {topVendors.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {topVendors.map((v: { vendor: string; total: number; category: string }, i: number) => {
                          const maxVal = topVendors[0]?.total || 1
                          const barColor = getCategoryColor(v.category)
                          return (
                            <div key={v.vendor} className="flex items-center gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: barColor }}>
                                {i + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="truncate text-sm font-medium text-foreground">{v.vendor}</span>
                                    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize" style={{ backgroundColor: barColor + '20', color: barColor }}>
                                      {v.category}
                                    </span>
                                  </div>
                                  <span className="shrink-0 ml-2 text-xs font-bold text-foreground">{formatBaht(v.total)}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-secondary">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${(v.total / maxVal) * 100}%`, backgroundColor: barColor }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : <EmptyChart />}
                  </div>

                  {/* Yearly: Busiest Times */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-foreground">Busiest Times (Yearly)</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">Peak periods across the entire year</p>
                    </div>
                    {busiestTimes.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {busiestTimes.map((t: { time: string; count: number }, i: number) => {
                          const maxCount = busiestTimes[0]?.count || 1
                          const barColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                          return (
                            <div key={t.time} className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: barColor + '18' }}>
                                <Clock className="h-4 w-4" style={{ color: barColor }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-foreground">{t.time}</span>
                                  <span className="text-xs font-bold text-muted-foreground">{t.count}x</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-secondary">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${(t.count / maxCount) * 100}%`, backgroundColor: barColor }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : <EmptyChart />}
                  </div>
                </div>

                {/* Yearly: Fixed Costs Overview */}
                <ChartCard title="Fixed Costs Overview" subtitle="All fixed costs for the year by category and payment status">
                  {fixedCostsDetail.length > 0 ? (() => {
                    // Group fixed costs by category for a summary bar
                    const catMap: Record<string, number> = {}
                    for (const f of fixedCostsDetail) {
                      const cat = (f as { category: string }).category || 'other'
                      catMap[cat] = (catMap[cat] || 0) + (f as { amount: number }).amount
                    }
                    const catData = Object.entries(catMap)
                      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: getCategoryColor(name) }))
                      .sort((a, b) => b.value - a.value)

                    const totalFixed = catData.reduce((s, c) => s + c.value, 0)

                    return (
                      <div className="grid gap-6 lg:grid-cols-5">
                        <div className="flex flex-col items-center gap-4 lg:col-span-2">
                          <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                              <Pie
                                data={catData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={95}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {catData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null
                                  const d = payload[0]
                                  return (
                                    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-xl shadow-black/5">
                                      <p className="text-xs font-semibold text-foreground">{d.name}: {formatBaht(Number(d.value))}</p>
                                    </div>
                                  )
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                            {catData.map((c) => (
                              <div key={c.name} className="flex items-center gap-1.5 text-xs">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                                <span className="text-muted-foreground">{c.name}</span>
                                <span className="font-bold text-foreground">{formatBaht(c.value)}</span>
                                <span className="text-muted-foreground/60">({totalFixed > 0 ? Math.round((c.value / totalFixed) * 100) : 0}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto lg:col-span-3">
                          {fixedCostsDetail.map((f: { name: string; category: string; amount: number; isPaid: boolean; month: number; year: number }, i: number) => {
                            const catColor = getCategoryColor(f.category)
                            return (
                              <div key={`${f.name}-${f.month}-${f.year}-${i}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: catColor + '0A' }}>
                                {f.isPaid ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                                )}
                                <div className="flex h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: catColor }} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    <span className="capitalize font-medium" style={{ color: catColor }}>{f.category}</span>
                                    {' \u00B7 '}{f.month}/{f.year}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-bold text-foreground">{formatBaht(f.amount)}</span>
                              </div>
                            )
                          })}
                        </div>
                        </div>
                      </div>
                    )
                  })() : <EmptyChart />}
                </ChartCard>

                {/* Yearly: Electricity vs Weather */}
                <ChartCard title="Electricity Costs vs Weather Patterns" subtitle="Monthly electricity bill compared with weather distribution across the year">
                  {electricityVsWeather.length > 0 ? (
                    <div className="flex flex-col gap-5">
                      <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={electricityVsWeather}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                          <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                          <YAxis yAxisId="cost" tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={55} />
                          <YAxis yAxisId="days" orientation="right" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={35} label={{ value: 'Days', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: AXIS_STROKE } }} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null
                              const d = payload[0]?.payload
                              return (
                                <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl shadow-black/5">
                                  <p className="mb-2 text-sm font-bold text-foreground">{label}</p>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs">
                                      <Zap className="h-3 w-3 text-amber-500" />
                                      <span className="text-muted-foreground">Electricity:</span>
                                      <span className="font-semibold text-foreground">{formatBaht(d?.electricity ?? 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Sun className="h-3 w-3 text-amber-400" />
                                      <span className="text-muted-foreground">Sunny:</span>
                                      <span className="font-semibold text-foreground">{d?.sunnyDays ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <CloudRain className="h-3 w-3 text-sky-400" />
                                      <span className="text-muted-foreground">Rainy:</span>
                                      <span className="font-semibold text-foreground">{d?.rainyDays ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Cloud className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">Cloudy:</span>
                                      <span className="font-semibold text-foreground">{d?.cloudyDays ?? 0}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                          <Bar yAxisId="cost" dataKey="electricity" name="Electricity" fill={COLORS.electricity} radius={[4, 4, 0, 0]} barSize={28} />
                          <Line yAxisId="days" type="monotone" dataKey="sunnyDays" name="Sunny Days" stroke={COLORS.sunny} strokeWidth={2} dot={{ r: 3, fill: COLORS.sunny }} />
                          <Line yAxisId="days" type="monotone" dataKey="rainyDays" name="Rainy Days" stroke={COLORS.rainy} strokeWidth={2} dot={{ r: 3, fill: COLORS.rainy }} />
                          <Line yAxisId="days" type="monotone" dataKey="cloudyDays" name="Cloudy Days" stroke={COLORS.cloudy} strokeWidth={2} dot={{ r: 3, fill: COLORS.cloudy }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {electricityVsWeather.map((m: { monthLabel: string; electricity: number; sunnyDays: number; rainyDays: number; cloudyDays: number; totalDays: number }) => (
                          <div key={m.monthLabel} className="rounded-xl border border-border bg-secondary/30 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">{m.monthLabel}</span>
                              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                <Zap className="h-3 w-3" />
                                {formatBaht(m.electricity)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <WeatherBadge icon={<Sun className="h-3 w-3 text-amber-500" />} label="S" count={m.sunnyDays} />
                              <WeatherBadge icon={<CloudRain className="h-3 w-3 text-sky-500" />} label="R" count={m.rainyDays} />
                              <WeatherBadge icon={<Cloud className="h-3 w-3 text-muted-foreground" />} label="C" count={m.cloudyDays} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <EmptyChart />}
                </ChartCard>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Sub-components ─── */

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function KPICard({ icon, iconBg, label, value, trend, subtitle }: { icon: React.ReactNode; iconBg: string; label: string; value: string; trend?: 'up' | 'down'; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-600" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
      </div>
      <div>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
        {subtitle && <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/70">{subtitle}</p>}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No data available for this period</p>
    </div>
  )
}

function WeatherBadge({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
  <div className="flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-1">
  {icon}
  <span className="text-[11px] text-muted-foreground">{label}</span>
  <span className="text-[11px] font-bold text-foreground">{count}</span>
  </div>
  )
  }
