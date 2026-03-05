'use client'

import { useState, useMemo } from 'react'
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
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const RECEIPT_CATEGORY_LABELS: Record<string, string> = {
  ingredients: 'Ingredients',
  beverages: 'Beverages',
  packaging: 'Packaging',
  cleaning: 'Cleaning',
  'kitchen supplies': 'Kitchen Supplies',
  other: 'Other',
}

const FIXED_CATEGORY_LABELS: Record<string, string> = {
  utilities: 'Utilities',
  employees: 'Employees',
  credit_card: 'Credit Card',
  internet: 'Internet',
  advertising: 'Advertising',
  rent: 'Rent',
  insurance: 'Insurance',
  other: 'Other',
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  influencers: 'Influencers',
  others: 'Others',
}

const EXPENSE_COLORS: Record<string, string> = {
  // Receipt categories
  ingredients: 'hsl(24, 65%, 52%)',
  beverages: 'hsl(174, 42%, 44%)',
  packaging: 'hsl(82, 38%, 46%)',
  cleaning: 'hsl(200, 32%, 52%)',
  'kitchen supplies': 'hsl(38, 72%, 52%)',
  // Fixed categories
  utilities: 'hsl(38, 72%, 52%)',
  employees: 'hsl(152, 45%, 42%)',
  credit_card: 'hsl(220, 42%, 56%)',
  internet: 'hsl(174, 42%, 44%)',
  advertising: 'hsl(354, 42%, 58%)',
  rent: 'hsl(270, 30%, 56%)',
  insurance: 'hsl(320, 32%, 52%)',
  // Ad platforms
  facebook: '#1877F2',
  tiktok: '#010101',
  instagram: '#E4405F',
  influencers: '#F59E0B',
  others: '#6B7280',
  // Fallback
  other: 'hsl(200, 12%, 58%)',
}

function getColor(key: string): string {
  return EXPENSE_COLORS[key] ?? EXPENSE_COLORS.other
}

export default function ExpenseManagementPage() {
  const bkk = getBangkokNow()
  const [month, setMonth] = useState(bkk.month)
  const [year, setYear] = useState(bkk.year)

  const { data, isLoading } = useSWR(
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
  const expenses = data?.expenses ?? { total: 0, receipts: { total: 0, byCategory: {} }, fixedCosts: { total: 0, byCategory: {} }, adCosts: { total: 0, byPlatform: {} } }
  const netProfit = data?.netProfit ?? 0

  // Flatten all expense items into one sorted array for the combined breakdown
  const allExpenseItems = useMemo(() => {
    const items: { label: string; amount: number; color: string; group: string }[] = []

    // Receipts by category
    for (const [cat, amt] of Object.entries(expenses.receipts.byCategory as Record<string, number>)) {
      items.push({
        label: RECEIPT_CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
        amount: amt,
        color: getColor(cat),
        group: 'Receipts',
      })
    }

    // Fixed costs by category
    for (const [cat, amt] of Object.entries(expenses.fixedCosts.byCategory as Record<string, number>)) {
      items.push({
        label: FIXED_CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
        amount: amt,
        color: getColor(cat),
        group: 'Fixed Costs',
      })
    }

    // Ad costs by platform
    for (const [plat, amt] of Object.entries(expenses.adCosts.byPlatform as Record<string, number>)) {
      items.push({
        label: PLATFORM_LABELS[plat] || plat.charAt(0).toUpperCase() + plat.slice(1),
        amount: amt,
        color: getColor(plat),
        group: 'Ad Costs',
      })
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
            <p className="mt-1 text-sm font-medium text-primary-foreground/80">Revenue & expense overview</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        {/* Month navigation */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/25"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-foreground/10 px-4 py-2">
            <span className="text-sm font-bold text-primary-foreground">
              {MONTH_NAMES[month - 1]} {year}
            </span>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            disabled={month === bkk.month && year === bkk.year}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/25 disabled:opacity-30"
          >
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
          {/* Summary KPIs */}
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

          {/* Revenue by Method */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-foreground">Revenue by Payment Method</h3>
              <p className="text-xs text-muted-foreground">Breakdown of income by how customers paid</p>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Cash', value: revenue.cash, icon: Banknote, color: 'border-l-emerald-500', iconColor: 'text-emerald-600' },
                { label: 'PromptPay (QR)', value: revenue.promptpay, icon: Smartphone, color: 'border-l-sky-500', iconColor: 'text-sky-600' },
                { label: 'Credit Card', value: revenue.credit_card, icon: CreditCard, color: 'border-l-amber-500', iconColor: 'text-amber-600' },
              ].map((method) => {
                const pct = revenue.total > 0 ? Math.round((method.value / revenue.total) * 100) : 0
                return (
                  <div key={method.label} className={`flex items-center gap-3 rounded-xl border border-border bg-background p-3 border-l-4 ${method.color}`}>
                    <method.icon className={`h-4 w-4 shrink-0 ${method.iconColor}`} />
                    <span className="flex-1 text-sm font-medium text-foreground">{method.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{pct}%</span>
                      <span className="text-sm font-bold text-foreground tabular-nums">{formatBaht(method.value)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
              <span className="text-sm font-bold text-primary">Total Revenue</span>
              <span className="text-xl font-bold text-primary">{formatBaht(revenue.total)}</span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-foreground">Total Expenses</h3>
              <p className="text-xs text-muted-foreground">All costs summed across categories</p>
            </div>

            {/* Expense group totals */}
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

            {/* Itemized breakdown */}
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

          {/* Net Profit card */}
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
