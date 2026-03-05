'use client'

import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { formatBaht, getBangkokNow } from '@/lib/utils'
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  X,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const METHOD_CONFIG = {
  cash: { label: 'Cash', icon: Banknote, color: 'border-l-emerald-500', iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  promptpay: { label: 'PromptPay', icon: Smartphone, color: 'border-l-sky-500', iconColor: 'text-sky-600', bgColor: 'bg-sky-50' },
  credit_card: { label: 'Credit Card', icon: CreditCard, color: 'border-l-amber-500', iconColor: 'text-amber-600', bgColor: 'bg-amber-50' },
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

export default function ExpenseManagementPage() {
  const bkk = getBangkokNow()
  const [month, setMonth] = useState(bkk.month)
  const [year, setYear] = useState(bkk.year)
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [adjMethod, setAdjMethod] = useState<'cash' | 'promptpay' | 'credit_card'>('cash')
  const [adjType, setAdjType] = useState<'add' | 'subtract'>('add')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjNote, setAdjNote] = useState('')
  const [adjSubmitting, setAdjSubmitting] = useState(false)
  const [adjDeleting, setAdjDeleting] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR(
    `/api/management/expenses?month=${month}&year=${year}`,
    fetcher
  )

  const navigateMonth = (dir: number) => {
    let m = month + dir
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMonth(m)
    setYear(y)
  }

  const revenue = data?.revenue ?? { cash: 0, promptpay: 0, credit_card: 0, total: 0 }
  const wallet = data?.wallet ?? { cash: 0, promptpay: 0, credit_card: 0, total: 0 }
  const adjustments = data?.adjustments ?? []
  const expenses = data?.expenses ?? { total: 0, receipts: { total: 0, byCategory: {} }, fixedCosts: { total: 0, byCategory: {} }, adCosts: { total: 0, byPlatform: {} } }
  const netProfit = data?.netProfit ?? 0

  const handleSubmitAdjustment = useCallback(async () => {
    if (!adjAmount || Number(adjAmount) <= 0) return
    setAdjSubmitting(true)
    try {
      const lastDay = new Date(year, month, 0).getDate()
      const today = bkk.day
      const adjDay = Math.min(today, lastDay)
      const adjDate = `${year}-${String(month).padStart(2, '0')}-${String(adjDay).padStart(2, '0')}`

      await fetch('/api/management/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: adjMethod,
          type: adjType,
          amount: Number(adjAmount),
          note: adjNote,
          adjustment_date: adjDate,
        }),
      })
      setAdjAmount('')
      setAdjNote('')
      setShowAdjustForm(false)
      mutate()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setAdjSubmitting(false)
    }
  }, [adjAmount, adjMethod, adjType, adjNote, month, year, bkk.day, mutate])

  const handleDeleteAdjustment = useCallback(async (id: string) => {
    setAdjDeleting(id)
    try {
      await fetch(`/api/management/expenses?id=${id}`, { method: 'DELETE' })
      mutate()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setAdjDeleting(null)
    }
  }, [mutate])

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

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-primary p-5 shadow-lg shadow-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Expense Management</h1>
            <p className="mt-1 text-sm font-medium text-primary-foreground/80">Wallet overview & expense tracking</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        {/* Month navigation */}
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/25">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center justify-center rounded-xl bg-primary-foreground/10 px-4 py-2">
            <span className="text-sm font-bold text-primary-foreground">{MONTH_NAMES[month - 1]} {year}</span>
          </div>
          <button onClick={() => navigateMonth(1)} disabled={month === bkk.month && year === bkk.year} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/25 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading financial data...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ═══ WALLET CARD ═══ */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Wallet header with total */}
            <div className="bg-gradient-to-br from-foreground to-foreground/85 px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-4 w-4 text-background/70" />
                <span className="text-xs font-semibold uppercase tracking-wider text-background/60">Available Funds</span>
              </div>
              <p className="text-3xl font-bold text-background tabular-nums">{formatBaht(wallet.total)}</p>
              <p className="mt-1 text-xs text-background/50">Revenue + adjustments for {MONTH_NAMES[month - 1]}</p>
            </div>

            {/* Per-method breakdown */}
            <div className="p-4 flex flex-col gap-2">
              {(Object.keys(METHOD_CONFIG) as Array<keyof typeof METHOD_CONFIG>).map((key) => {
                const cfg = METHOD_CONFIG[key]
                const value = wallet[key]
                return (
                  <div key={key} className={`flex items-center gap-3 rounded-xl border border-border bg-background p-3 border-l-4 ${cfg.color}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bgColor}`}>
                      <cfg.icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">{cfg.label}</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">{formatBaht(value)}</span>
                  </div>
                )
              })}
            </div>

            {/* Adjust funds button */}
            <div className="px-4 pb-4">
              {!showAdjustForm ? (
                <button
                  onClick={() => setShowAdjustForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Adjust Funds
                </button>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-foreground">Adjust Funds</h4>
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
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                    <button
                      onClick={() => setAdjType('subtract')}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${adjType === 'subtract' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                    >
                      <Minus className="h-3.5 w-3.5" /> Subtract
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
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Note (optional)</label>
                    <input
                      type="text"
                      value={adjNote}
                      onChange={(e) => setAdjNote(e.target.value)}
                      placeholder="e.g. Bank deposit, Petty cash withdrawal..."
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <button
                    onClick={handleSubmitAdjustment}
                    disabled={adjSubmitting || !adjAmount || Number(adjAmount) <= 0}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-40 ${adjType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25' : 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/25'}`}
                  >
                    {adjSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : adjType === 'add' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    {adjSubmitting ? 'Saving...' : adjType === 'add' ? 'Add Funds' : 'Subtract Funds'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ═══ ADJUSTMENT HISTORY ═══ */}
          {adjustments.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-foreground">Adjustment History</h3>
                <p className="text-xs text-muted-foreground">{adjustments.length} adjustment{adjustments.length > 1 ? 's' : ''} this month</p>
              </div>
              <div className="flex flex-col gap-2">
                {adjustments.map((adj: { id: string; method: string; type: string; amount: number; note: string; adjustment_date: string; created_at: string }) => {
                  const cfg = METHOD_CONFIG[adj.method as keyof typeof METHOD_CONFIG] ?? METHOD_CONFIG.cash
                  const isAdd = adj.type === 'add'
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
                          {new Date(adj.adjustment_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold tabular-nums ${isAdd ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {isAdd ? '+' : '-'}{formatBaht(adj.amount)}
                      </span>
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
            </div>
          )}

          {/* ═══ SUMMARY KPIs ═══ */}
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
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Total Revenue</p>
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
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Total Expenses</p>
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

          {/* ═══ TOTAL EXPENSES BREAKDOWN ═══ */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-foreground">Total Expenses</h3>
              <p className="text-xs text-muted-foreground">All costs summed across categories</p>
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

            <div className="mt-4 flex items-center justify-between rounded-xl bg-destructive/10 px-4 py-3">
              <span className="text-sm font-bold text-destructive">Total Expenses</span>
              <span className="text-xl font-bold text-destructive">{formatBaht(expenses.total)}</span>
            </div>
          </div>

          {/* ═══ NET PROFIT BAR ═══ */}
          <div className={`rounded-2xl border p-5 shadow-sm ${netProfit >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Net Profit / Loss</h3>
                <p className="text-xs text-muted-foreground">Revenue minus all expenses</p>
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {formatBaht(netProfit)}
              </p>
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
        </div>
      )}
    </div>
  )
}
