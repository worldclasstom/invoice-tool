'use client'

import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { formatBaht, getBangkokNow } from '@/lib/utils'
import {
  Loader2,
  ChevronDown,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Megaphone,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const METHOD_CONFIG = {
  cash: { label: 'Cash', icon: Banknote, color: 'border-l-emerald-500', iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', darkBg: 'bg-emerald-500/15' },
  promptpay: { label: 'PromptPay', icon: Smartphone, color: 'border-l-sky-500', iconColor: 'text-sky-600', bgColor: 'bg-sky-50', darkBg: 'bg-sky-500/15' },
  credit_card: { label: 'Credit Card', icon: CreditCard, color: 'border-l-amber-500', iconColor: 'text-amber-600', bgColor: 'bg-amber-50', darkBg: 'bg-amber-500/15' },
} as const

const RECEIPT_CATEGORY_LABELS: Record<string, string> = {
  ingredients: 'Ingredients', beverages: 'Beverages', packaging: 'Packaging',
  cleaning: 'Cleaning', 'kitchen supplies': 'Kitchen Supplies', other: 'Other',
}
const FIXED_CATEGORY_LABELS: Record<string, string> = {
  utilities: 'Utilities', employees: 'Employees', credit_card: 'Credit Card',
  internet: 'Internet', advertising: 'Advertising', rent: 'Rent', insurance: 'Insurance', other: 'Other',
}
const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook', tiktok: 'TikTok', instagram: 'Instagram', influencers: 'Influencers', others: 'Others',
}
const EXPENSE_COLORS: Record<string, string> = {
  ingredients: 'hsl(24, 65%, 52%)', beverages: 'hsl(174, 42%, 44%)', packaging: 'hsl(82, 38%, 46%)',
  cleaning: 'hsl(200, 32%, 52%)', 'kitchen supplies': 'hsl(38, 72%, 52%)',
  utilities: 'hsl(38, 72%, 52%)', employees: 'hsl(152, 45%, 42%)', credit_card: 'hsl(220, 42%, 56%)',
  internet: 'hsl(174, 42%, 44%)', advertising: 'hsl(354, 42%, 58%)', rent: 'hsl(270, 30%, 56%)',
  insurance: 'hsl(320, 32%, 52%)',
  facebook: '#1877F2', tiktok: '#010101', instagram: '#E4405F', influencers: '#F59E0B', others: '#6B7280',
  other: 'hsl(200, 12%, 58%)',
}
function getColor(key: string) { return EXPENSE_COLORS[key] ?? EXPENSE_COLORS.other }

const ADJ_PAGE_SIZE = 5

// Timeline starts from Jan 2026
const TIMELINE_START_YEAR = 2026
const TIMELINE_START_MONTH = 1

function buildTimelineMonths(currentMonth: number, currentYear: number): { month: number; year: number; label: string; shortLabel: string }[] {
  const months: { month: number; year: number; label: string; shortLabel: string }[] = []
  let m = TIMELINE_START_MONTH
  let y = TIMELINE_START_YEAR
  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    months.push({ month: m, year: y, label: `${MONTH_NAMES[m - 1]} ${y}`, shortLabel: `${MONTH_SHORT[m - 1]} ${y}` })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

type ActiveTab = 'wallet' | string // 'wallet' or 'YYYY-MM'

export default function CashFlowManagementPage() {
  const bkk = getBangkokNow()
  const timelineMonths = useMemo(() => buildTimelineMonths(bkk.month, bkk.year), [bkk.month, bkk.year])
  const [activeTab, setActiveTab] = useState<ActiveTab>('wallet')

  // Derive month/year from tab
  const isWalletTab = activeTab === 'wallet'
  const selectedMonth = isWalletTab ? bkk.month : Number(activeTab.split('-')[1])
  const selectedYear = isWalletTab ? bkk.year : Number(activeTab.split('-')[0])

  // Adjust form state
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [adjMethod, setAdjMethod] = useState<'cash' | 'promptpay' | 'credit_card'>('cash')
  const [adjType, setAdjType] = useState<'add' | 'subtract'>('add')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjNote, setAdjNote] = useState('')
  const [adjDate, setAdjDate] = useState(() => {
    return `${bkk.year}-${String(bkk.month).padStart(2, '0')}-${String(bkk.day).padStart(2, '0')}`
  })
  const [adjSubmitting, setAdjSubmitting] = useState(false)
  const [adjDeleting, setAdjDeleting] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editType, setEditType] = useState<'add' | 'subtract'>('add')
  const [editSaving, setEditSaving] = useState(false)
  const [adjVisible, setAdjVisible] = useState(ADJ_PAGE_SIZE)

  const { data, isLoading, mutate } = useSWR(
    `/api/management/expenses?month=${selectedMonth}&year=${selectedYear}`,
    fetcher
  )

  const revenue = data?.revenue ?? { cash: 0, promptpay: 0, credit_card: 0, total: 0 }
  const overallWallet = data?.overallWallet ?? { cash: 0, promptpay: 0, credit_card: 0, total: 0, totalRevenue: 0, totalExpenses: 0, totalAdjustments: 0 }
  const allAdjustments: { id: string; method: string; type: string; amount: number; note: string; adjustment_date: string; created_at: string }[] = data?.adjustments ?? []
  const monthlyAdjustments: typeof allAdjustments = data?.monthlyAdjustments ?? []
  const expenses = data?.expenses ?? { total: 0, receipts: { total: 0, byCategory: {} }, fixedCosts: { total: 0, byCategory: {} }, adCosts: { total: 0, byPlatform: {} } }
  const netProfit = data?.netProfit ?? 0

  // Pick adjustments based on tab
  const displayAdjustments = isWalletTab ? allAdjustments : monthlyAdjustments
  const visibleAdjustments = displayAdjustments.slice(0, adjVisible)

  const handleSubmitAdjustment = useCallback(async () => {
    if (!adjAmount || Number(adjAmount) <= 0 || !adjDate) return
    setAdjSubmitting(true)
    try {
      const res = await fetch('/api/management/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: adjMethod, type: adjType, amount: Number(adjAmount), note: adjNote, adjustment_date: adjDate }),
      })
      if (res.ok) {
        setAdjAmount('')
        setAdjNote('')
        setShowAdjustForm(false)
        await mutate()
      }
    } catch (err) { console.error('Error:', err) }
    finally { setAdjSubmitting(false) }
  }, [adjAmount, adjMethod, adjType, adjNote, adjDate, mutate])

  const handleDeleteAdjustment = useCallback(async (id: string) => {
    setAdjDeleting(id)
    try {
      await fetch(`/api/management/expenses?id=${id}`, { method: 'DELETE' })
      await mutate()
    } catch (err) { console.error('Error:', err) }
    finally { setAdjDeleting(null) }
  }, [mutate])

  const startEdit = useCallback((adj: typeof allAdjustments[0]) => {
    setEditingId(adj.id)
    setEditAmount(String(adj.amount))
    setEditNote(adj.note || '')
    setEditType(adj.type as 'add' | 'subtract')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditAmount('')
    setEditNote('')
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editAmount || Number(editAmount) <= 0) return
    setEditSaving(true)
    try {
      const res = await fetch('/api/management/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, type: editType, amount: Number(editAmount), note: editNote }),
      })
      if (res.ok) {
        setEditingId(null)
        setEditAmount('')
        setEditNote('')
        await mutate()
      }
    } catch (err) { console.error('Error:', err) }
    finally { setEditSaving(false) }
  }, [editingId, editType, editAmount, editNote, mutate])

  const allExpenseItems = useMemo(() => {
    const items: { label: string; amount: number; color: string; group: string }[] = []
    for (const [cat, amt] of Object.entries(expenses.receipts.byCategory as Record<string, number>)) {
      items.push({ label: RECEIPT_CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1), amount: amt, color: getColor(cat), group: 'Receipts' })
    }
    for (const [cat, amt] of Object.entries(expenses.fixedCosts.byCategory as Record<string, number>)) {
      items.push({ label: FIXED_CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1), amount: amt, color: getColor(cat), group: 'Fixed Costs' })
    }
    for (const [plat, amt] of Object.entries(expenses.adCosts.byPlatform as Record<string, number>)) {
      items.push({ label: PLATFORM_LABELS[plat] || plat.charAt(0).toUpperCase() + plat.slice(1), amount: amt, color: getColor(plat), group: 'Ad Costs' })
    }
    items.sort((a, b) => b.amount - a.amount)
    return items
  }, [expenses])

  // Reset visible adjustments when switching tabs
  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab)
    setAdjVisible(ADJ_PAGE_SIZE)
    setShowAdjustForm(false)
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-primary p-5 shadow-lg shadow-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Cash Flow Management</h1>
            <p className="mt-1 text-sm font-medium text-primary-foreground/80">Wallet overview and expense tracking</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Sidebar tabs (horizontal on mobile, left column on desktop) */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Tab navigation */}
        <div className="lg:w-48 shrink-0">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 lg:sticky lg:top-4">
            {/* Wallet tab */}
            <button
              onClick={() => switchTab('wallet')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all shrink-0 ${
                isWalletTab
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-card border border-border text-foreground hover:bg-secondary'
              }`}
            >
              <Wallet className="h-4 w-4" />
              Wallet
            </button>

            {/* Month divider */}
            <div className="hidden lg:flex items-center gap-2 px-2 py-1.5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Months</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Month tabs - reverse so newest is first */}
            {[...timelineMonths].reverse().map((tm) => {
              const tabKey = `${tm.year}-${String(tm.month).padStart(2, '0')}`
              const isActive = activeTab === tabKey
              const isCurrent = tm.month === bkk.month && tm.year === bkk.year
              return (
                <button
                  key={tabKey}
                  onClick={() => switchTab(tabKey)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'bg-card border border-border text-foreground/70 hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <CalendarDays className={`h-3.5 w-3.5 ${isActive ? '' : 'text-muted-foreground'}`} />
                  <span className="hidden lg:inline">{tm.label}</span>
                  <span className="lg:hidden">{tm.shortLabel}</span>
                  {isCurrent && !isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading financial data...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">

              {/* ═══════════════ WALLET VIEW ═══════════════ */}
              {isWalletTab && (
                <>
                  {/* Total balance card */}
                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-br from-foreground to-foreground/85 px-5 py-6">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-background/70" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-background/60">Total Balance</span>
                      </div>
                      <p className={`text-3xl font-bold tabular-nums ${overallWallet.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatBaht(overallWallet.total)}
                      </p>
                      <p className="mt-2 text-[11px] text-background/40">All-time revenue minus all expenses, adjusted to reality</p>

                      <div className="mt-4 flex gap-3">
                        <div className="flex-1 rounded-xl bg-background/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-background/50">Revenue</p>
                          <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatBaht(overallWallet.totalRevenue)}</p>
                        </div>
                        <div className="flex-1 rounded-xl bg-background/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-background/50">Expenses</p>
                          <p className="text-sm font-bold text-rose-400 tabular-nums">{formatBaht(overallWallet.totalExpenses)}</p>
                        </div>
                        <div className="flex-1 rounded-xl bg-background/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-background/50">Adjusted</p>
                          <p className={`text-sm font-bold tabular-nums ${overallWallet.totalAdjustments >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {overallWallet.totalAdjustments >= 0 ? '+' : ''}{formatBaht(overallWallet.totalAdjustments)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Per-method breakdown */}
                    <div className="p-4 flex flex-col gap-2">
                      {(Object.keys(METHOD_CONFIG) as Array<keyof typeof METHOD_CONFIG>).map((key) => {
                        const cfg = METHOD_CONFIG[key]
                        const value = overallWallet[key] as number
                        return (
                          <div key={key} className={`flex items-center gap-3 rounded-xl border border-border bg-background p-3 border-l-4 ${cfg.color}`}>
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bgColor}`}>
                              <cfg.icon className={`h-4 w-4 ${cfg.iconColor}`} />
                            </div>
                            <span className="flex-1 text-sm font-medium text-foreground">{cfg.label}</span>
                            <span className={`text-sm font-bold tabular-nums ${value >= 0 ? 'text-foreground' : 'text-rose-500'}`}>{formatBaht(value)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════ MONTHLY VIEW ═══════════════ */}
              {!isWalletTab && (
                <>
                  {/* Monthly summary KPIs */}
                  <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground leading-tight">{formatBaht(revenue.total)}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50">
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        </div>
                        <ArrowDownRight className="h-4 w-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground leading-tight">{formatBaht(expenses.total)}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Expenses</p>
                      </div>
                    </div>
                    <div className="col-span-2 lg:col-span-1 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                          <Wallet className={`h-4 w-4 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`} />
                        </div>
                      </div>
                      <div>
                        <p className={`text-lg font-bold leading-tight ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatBaht(netProfit)}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Net Profit</p>
                      </div>
                    </div>
                  </div>

                  {/* Revenue by method */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-foreground">Revenue by Method</h3>
                      <p className="text-xs text-muted-foreground">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {(Object.keys(METHOD_CONFIG) as Array<keyof typeof METHOD_CONFIG>).map((key) => {
                        const cfg = METHOD_CONFIG[key]
                        const value = revenue[key] as number
                        const pct = revenue.total > 0 ? Math.round((value / revenue.total) * 100) : 0
                        return (
                          <div key={key} className={`flex items-center gap-3 rounded-xl border border-border bg-background p-3 border-l-4 ${cfg.color}`}>
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bgColor}`}>
                              <cfg.icon className={`h-4 w-4 ${cfg.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                              <div className="mt-1 h-1.5 w-full rounded-full bg-border overflow-hidden">
                                <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-foreground tabular-nums">{formatBaht(value)}</p>
                              <p className="text-[10px] text-muted-foreground">{pct}%</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Expenses breakdown */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-foreground">Expenses Breakdown</h3>
                      <p className="text-xs text-muted-foreground">{MONTH_NAMES[selectedMonth - 1]} {selectedYear} - all costs by category</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Receipts', value: expenses.receipts.total, icon: Receipt, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
                        { label: 'Fixed Costs', value: expenses.fixedCosts.total, icon: Wallet, iconBg: 'bg-violet-50', iconColor: 'text-violet-500' },
                        { label: 'Ad Costs', value: expenses.adCosts.total, icon: Megaphone, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
                      ].map((group) => (
                        <div key={group.label} className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary/50 p-3">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${group.iconBg}`}>
                            <group.icon className={`h-3.5 w-3.5 ${group.iconColor}`} />
                          </div>
                          <p className="text-sm font-bold text-foreground tabular-nums">{formatBaht(group.value)}</p>
                          <p className="text-[10px] font-medium text-muted-foreground">{group.label}</p>
                        </div>
                      ))}
                    </div>
                    {allExpenseItems.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {allExpenseItems.map((item, i) => {
                          const pct = expenses.total > 0 ? Math.round((item.amount / expenses.total) * 100) : 0
                          return (
                            <div key={`${item.group}-${item.label}-${i}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: item.color + '0A' }}>
                              <div className="flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{item.label}</p>
                                <p className="text-[11px] text-muted-foreground">{item.group}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted-foreground">{pct}%</span>
                                <span className="text-sm font-bold text-foreground tabular-nums">{formatBaht(item.amount)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-24 flex-col items-center justify-center gap-2 text-center">
                        <p className="text-sm text-muted-foreground">No expenses recorded for this period</p>
                      </div>
                    )}
                    {expenses.total > 0 && (
                      <div className="mt-4 flex items-center justify-between rounded-xl bg-destructive/10 px-4 py-3">
                        <span className="text-sm font-bold text-destructive">Total Expenses</span>
                        <span className="text-xl font-bold text-destructive">{formatBaht(expenses.total)}</span>
                      </div>
                    )}
                  </div>

                  {/* Net profit bar */}
                  <div className={`rounded-2xl border p-5 shadow-sm ${netProfit >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Monthly Net Profit / Loss</h3>
                        <p className="text-xs text-muted-foreground">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
                      </div>
                      <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatBaht(netProfit)}</p>
                    </div>
                    {revenue.total > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Profit margin</span>
                          <span className="font-semibold">{Math.round((netProfit / revenue.total) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, Math.abs(Math.round((netProfit / revenue.total) * 100))))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ═══════════════ ADJUST FUNDS (wallet only) ═══════════════ */}
              {isWalletTab && (<>
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-sm font-bold text-foreground">Adjust Funds</h3>
                  <p className="text-xs text-muted-foreground">Add or deduct money with a date and reason</p>
                </div>
                <div className="px-5 pb-4">
                  {!showAdjustForm ? (
                    <button
                      onClick={() => setShowAdjustForm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Plus className="h-4 w-4" />
                      New Adjustment
                    </button>
                  ) : (
                    <div className="rounded-xl border border-border bg-secondary/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-foreground">New Adjustment</h4>
                        <button onClick={() => setShowAdjustForm(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Add / Subtract toggle */}
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setAdjType('add')}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${adjType === 'add' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Money
                        </button>
                        <button
                          onClick={() => setAdjType('subtract')}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${adjType === 'subtract' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                        >
                          <Minus className="h-3.5 w-3.5" /> Deduct Money
                        </button>
                      </div>

                      {/* Method select */}
                      <div className="mb-3">
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Method</label>
                        <div className="flex gap-2">
                          {(Object.keys(METHOD_CONFIG) as Array<keyof typeof METHOD_CONFIG>).map((key) => {
                            const cfg = METHOD_CONFIG[key]
                            return (
                              <button
                                key={key}
                                onClick={() => setAdjMethod(key)}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${adjMethod === key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                              >
                                <cfg.icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{cfg.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Date picker */}
                      <div className="mb-3">
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
                        <input
                          type="date"
                          value={adjDate}
                          onChange={(e) => setAdjDate(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {/* Amount */}
                      <div className="mb-3">
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount (THB)</label>
                        <input
                          type="number"
                          value={adjAmount}
                          onChange={(e) => setAdjAmount(e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {/* Note */}
                      <div className="mb-4">
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reason / Note</label>
                        <input
                          type="text"
                          value={adjNote}
                          onChange={(e) => setAdjNote(e.target.value)}
                          placeholder="e.g. Bank deposit, Cash lost, Owner withdrawal..."
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <button
                        onClick={handleSubmitAdjustment}
                        disabled={adjSubmitting || !adjAmount || Number(adjAmount) <= 0 || !adjDate}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-40 ${adjType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25' : 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/25'}`}
                      >
                        {adjSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : adjType === 'add' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        {adjSubmitting ? 'Saving...' : adjType === 'add' ? 'Add Money' : 'Deduct Money'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════════════ ACTIVITIES (wallet only) ═══════════════ */}
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Activities</h3>
                      <p className="text-xs text-muted-foreground">
                        {isWalletTab ? 'All adjustments' : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} adjustments`}
                      </p>
                    </div>
                    {displayAdjustments.length > 0 && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Showing {Math.min(adjVisible, displayAdjustments.length)} of {displayAdjustments.length}
                      </span>
                    )}
                  </div>
                </div>

                {displayAdjustments.length > 0 ? (
                  <>
                    <div className="px-5 pb-3 flex flex-col gap-2">
                      {visibleAdjustments.map((adj) => {
                        const cfg = METHOD_CONFIG[adj.method as keyof typeof METHOD_CONFIG] ?? METHOD_CONFIG.cash
                        const isAdd = adj.type === 'add'
                        const isEditing = editingId === adj.id

                        if (isEditing) {
                          return (
                            <div key={adj.id} className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
                              <div className="flex items-center gap-2 mb-2.5">
                                <cfg.icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                                <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                                <span className="text-[10px] text-muted-foreground">Editing</span>
                              </div>
                              <div className="flex gap-2 mb-2">
                                {(['add', 'subtract'] as const).map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => setEditType(t)}
                                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                      editType === t
                                        ? t === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                    }`}
                                  >
                                    {t === 'add' ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                    {t === 'add' ? 'Add' : 'Subtract'}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                placeholder="Amount"
                                min="0"
                                step="0.01"
                                className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="Note / reason (optional)"
                                className="mb-3 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={cancelEdit} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors">
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={editSaving || !editAmount || Number(editAmount) <= 0}
                                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                >
                                  {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  {editSaving ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div key={adj.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isAdd ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                              {isAdd ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <cfg.icon className={`h-3 w-3 ${cfg.iconColor}`} />
                                <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isAdd ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                                  {isAdd ? 'ADD' : 'SUB'}
                                </span>
                              </div>
                              {adj.note && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{adj.note}</p>}
                              <p className="text-[10px] text-muted-foreground/60">
                                {new Date(adj.adjustment_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <span className={`shrink-0 text-sm font-bold tabular-nums ${isAdd ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isAdd ? '+' : '-'}{formatBaht(adj.amount)}
                            </span>
                            <button
                              onClick={() => startEdit(adj)}
                              className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAdjustment(adj.id)}
                              disabled={adjDeleting === adj.id}
                              className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                            >
                              {adjDeleting === adj.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    {(adjVisible < displayAdjustments.length || visibleAdjustments.length > ADJ_PAGE_SIZE) && (
                      <div className="flex items-center justify-center gap-2 border-t border-border px-5 py-3">
                        {adjVisible < displayAdjustments.length && (
                          <button
                            onClick={() => setAdjVisible((v) => Math.min(v + ADJ_PAGE_SIZE, displayAdjustments.length))}
                            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
                          >
                            <ChevronDown className="h-4 w-4" />
                            Load More ({Math.max(0, displayAdjustments.length - adjVisible)} remaining)
                          </button>
                        )}
                        {visibleAdjustments.length > ADJ_PAGE_SIZE && (
                          <button
                            onClick={() => setAdjVisible(ADJ_PAGE_SIZE)}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-5 pb-5">
                    <div className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl bg-secondary/30 text-center">
                      <p className="text-sm text-muted-foreground">No adjustments recorded</p>
                      <p className="text-[11px] text-muted-foreground/60">Use the form above to add or deduct funds</p>
                    </div>
                  </div>
                )}
              </div>
              </>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
