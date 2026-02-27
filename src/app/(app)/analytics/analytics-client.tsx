'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  BarChart3,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Minus,
  CalendarDays,
  Zap,
  Leaf,
  Cloud,
  Sun,
  CloudRain,
  Users,
  ShoppingBag,
  Clock,
  Receipt,
  CreditCard,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
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

type ViewMode = 'monthly' | 'quarterly'

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
  }
}

function navigateRange(mode: ViewMode, from: string, direction: number): string {
  const d = new Date(from + 'T12:00:00')
  if (mode === 'monthly') d.setMonth(d.getMonth() + direction)
  else d.setMonth(d.getMonth() + direction * 3)
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

// Professional color palette built on the app's warm-neutral + green theme
const COLORS = {
  sales: 'hsl(152, 45%, 42%)',       // primary green - revenue
  expenses: 'hsl(354, 52%, 56%)',     // soft coral - expenses
  ingredients: 'hsl(24, 65%, 52%)',   // warm terracotta - ingredients
  fixedCosts: 'hsl(220, 42%, 56%)',   // slate blue - fixed costs
  electricity: 'hsl(38, 72%, 52%)',   // warm amber - electricity
  sunny: 'hsl(42, 68%, 52%)',         // golden - sunny
  rainy: 'hsl(210, 48%, 54%)',        // steel blue - rainy
  cloudy: 'hsl(200, 12%, 64%)',       // warm grey - cloudy
}

const CATEGORY_COLORS = [
  'hsl(24, 65%, 52%)',    // terracotta
  'hsl(152, 45%, 42%)',   // forest green
  'hsl(38, 72%, 52%)',    // amber
  'hsl(174, 42%, 44%)',   // teal
  'hsl(220, 42%, 56%)',   // slate blue
  'hsl(354, 42%, 58%)',   // dusty rose
  'hsl(270, 30%, 56%)',   // muted lavender
  'hsl(82, 38%, 46%)',    // olive
]

const PAYMENT_COLORS = ['hsl(152, 45%, 42%)', 'hsl(220, 42%, 56%)', 'hsl(38, 72%, 52%)']

const GRID_STROKE = 'hsl(40, 12%, 90%)'
const AXIS_STROKE = 'hsl(160, 8%, 52%)'

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

  if (!mounted) return null

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
            {(['monthly', 'quarterly'] as ViewMode[]).map((m) => (
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

            {/* ══════════ MONTHLY VIEW ══════════ */}
            {viewMode === 'monthly' && (
              <>
                {/* 1) Daily Sales vs All Expenses */}
                <ChartCard title="Daily Sales vs All Expenses" subtitle="Compare daily revenue against receipt-based expenses">
                  {salesVsExpenses.some((d: { sales: number; expenses: number }) => d.sales > 0 || d.expenses > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={salesVsExpenses}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={50} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Line type="monotone" dataKey="sales" name="Sales" stroke={COLORS.sales} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="expenses" name="Expenses" stroke={COLORS.expenses} strokeWidth={2} dot={false} strokeDasharray="6 3" activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* 2) Daily Sales vs Ingredient Costs */}
                <ChartCard title="Daily Sales vs Ingredient Costs" subtitle="Track ingredient spending relative to daily revenue">
                  {salesVsIngredients.some((d: { sales: number; ingredients: number }) => d.sales > 0 || d.ingredients > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salesVsIngredients}>
                        <defs>
                          <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.sales} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={COLORS.sales} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradIngredients" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.ingredients} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={COLORS.ingredients} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={50} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Area type="monotone" dataKey="sales" name="Sales" stroke={COLORS.sales} strokeWidth={2.5} fill="url(#gradSales)" activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="ingredients" name="Ingredients" stroke={COLORS.ingredients} strokeWidth={2} fill="url(#gradIngredients)" activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* 3) Sales vs Fixed Costs */}
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
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                          formatter={(v: string) => <span className="text-xs capitalize text-muted-foreground">{v}</span>}
                        />
                        {expenseCategories.map((cat: string, i: number) => (
                          <Bar
                            key={cat}
                            dataKey={cat}
                            name={cat.charAt(0).toUpperCase() + cat.slice(1)}
                            fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                            radius={[2, 2, 0, 0]}
                            stackId="expenses"
                          />
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
                                  <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
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
                                return <rect key={i} fill={color} />
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
                {/* Quarterly Sales Overview */}
                <ChartCard title="Quarterly Sales Overview" subtitle="Monthly revenue, expenses, and fixed costs">
                  {monthlySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke={AXIS_STROKE} />
                        <YAxis tickFormatter={formatShortBaht} tick={{ fontSize: 11 }} stroke={AXIS_STROKE} width={55} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="sales" name="Sales" fill={COLORS.sales} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Receipt Expenses" fill={COLORS.expenses} radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Bar dataKey="fixedCosts" name="Fixed Costs" fill={COLORS.fixedCosts} radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Line type="monotone" dataKey="profit" name="Net Profit" stroke={COLORS.sales} strokeWidth={2.5} dot={{ r: 5, fill: COLORS.sales }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </ChartCard>

                {/* Electricity Costs vs Weather Patterns */}
                <ChartCard title="Electricity Costs vs Weather Patterns" subtitle="Monthly electricity bill compared with weather distribution">
                  {electricityVsWeather.length > 0 ? (
                    <div className="grid gap-6 lg:grid-cols-5">
                      <div className="lg:col-span-3">
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
                                  <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
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
                      </div>
                      <div className="flex flex-col gap-3 lg:col-span-2">
                        {electricityVsWeather.map((m: { monthLabel: string; electricity: number; sunnyDays: number; rainyDays: number; cloudyDays: number; totalDays: number }) => (
                          <div key={m.monthLabel} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">{m.monthLabel}</span>
                              <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                                <Zap className="h-3.5 w-3.5" />
                                {formatBaht(m.electricity)}
                              </span>
                            </div>
                            <div className="flex gap-3">
                              <WeatherBadge icon={<Sun className="h-3.5 w-3.5 text-amber-500" />} label="Sunny" count={m.sunnyDays} />
                              <WeatherBadge icon={<CloudRain className="h-3.5 w-3.5 text-sky-500" />} label="Rainy" count={m.rainyDays} />
                              <WeatherBadge icon={<Cloud className="h-3.5 w-3.5 text-muted-foreground" />} label="Cloudy" count={m.cloudyDays} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <EmptyChart />}
                </ChartCard>
              </>
            )}

            {/* ══════════ GENERAL INSIGHTS (shown in both views) ══════════ */}
            <div className="mb-4 mt-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">General Insights</span>
              <div className="h-px flex-1 bg-border" />
            </div>

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
                        <Pie
                          data={paymentMethods}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {paymentMethods.map((_: { name: string; value: number }, i: number) => (
                            <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            return (
                              <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
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
                        <Pie
                          data={serviceBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill={COLORS.sales} />
                          <Cell fill={CATEGORY_COLORS[3]} />
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            return (
                              <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
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
                        <Pie
                          data={categoryTotals}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryTotals.map((_: { name: string; value: number }, i: number) => (
                            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            return (
                              <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
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
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              {/* Top Vendors */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                    <h3 className="text-sm font-bold text-foreground">Top Vendors</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Highest spending vendors</p>
                </div>
                {topVendors.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {topVendors.map((v: { vendor: string; total: number }, i: number) => {
                      const maxVal = topVendors[0]?.total || 1
                      return (
                        <div key={v.vendor} className="flex items-center gap-3">
                          <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="truncate text-sm font-medium text-foreground">{v.vendor}</span>
                              <span className="shrink-0 text-xs font-bold text-foreground">{formatBaht(v.total)}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(v.total / maxVal) * 100}%`, backgroundColor: COLORS.ingredients }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyChart />}
              </div>

              {/* Busiest Times */}
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
                    {busiestTimes.map((t: { time: string; count: number }) => {
                      const maxCount = busiestTimes[0]?.count || 1
                      return (
                        <div key={t.time} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">{t.time}</span>
                              <span className="text-xs font-bold text-muted-foreground">{t.count}x</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(t.count / maxCount) * 100}%`, backgroundColor: COLORS.fixedCosts }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyChart />}
              </div>

              {/* Fixed Costs Status */}
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
                    {fixedCostsDetail.map((f: { name: string; category: string; amount: number; isPaid: boolean; month: number; year: number }, i: number) => (
                      <div key={`${f.name}-${f.month}-${f.year}-${i}`} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2.5">
                        {f.isPaid ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{f.category} &middot; {f.month}/{f.year}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-foreground">{formatBaht(f.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyChart />}
              </div>
            </div>
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

function KPICard({ icon, iconBg, label, value, trend }: { icon: React.ReactNode; iconBg: string; label: string; value: string; trend?: 'up' | 'down' }) {
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
    <div className="flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1.5">
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground">{count}</span>
    </div>
  )
}
