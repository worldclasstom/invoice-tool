'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { formatBaht } from '@/lib/utils'
import {
  FileSpreadsheet,
  Download,
  Calendar,
  ShieldCheck,
  Lock,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  DollarSign,
  Loader2,
  Info,
  AlertTriangle,
  ChevronDown,
  Lightbulb,
  BookOpen,
  CheckCircle2,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getThaiYear(): number {
  return new Date().getFullYear() + 543
}

function getYearOptions(): { label: string; from: string; to: string }[] {
  const currentYear = new Date().getFullYear()
  const options = []
  for (let y = currentYear; y >= currentYear - 4; y--) {
    options.push({
      label: `${y + 543} (${y})`,
      from: `${y}-01-01`,
      to: `${y}-12-31`,
    })
  }
  return options
}

export default function TaxPage() {
  const currentYear = new Date().getFullYear()
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`)
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`)
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)

  const yearOptions = getYearOptions()

  const { data, isLoading, error } = useSWR(
    `/api/tax-export?from=${dateFrom}&to=${dateTo}&format=json`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const summary = data?.summary
  const expensesByCategory = data?.expensesByCategory ?? {}

  const handleExportCSV = useCallback(async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/tax-export?from=${dateFrom}&to=${dateTo}&format=csv`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tax-export-${dateFrom}-to-${dateTo}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
    setDownloading(false)
  }, [dateFrom, dateTo])

  const selectYear = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    setYearDropdownOpen(false)
  }

  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => (b as number) - (a as number))

  const topCategory = sortedCategories[0]

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-primary p-6 shadow-lg shadow-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="h-5 w-5 text-primary-foreground/80" />
              <h1 className="text-lg font-bold text-primary-foreground">Tax & Annual Export</h1>
            </div>
            <p className="mt-1.5 text-sm text-primary-foreground/70">
              Export your transaction data for tax filing and financial reporting
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-primary-foreground/15 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground/70" />
            <span className="text-xs font-semibold text-primary-foreground/80">{getThaiYear()}</span>
          </div>
        </div>
      </div>

      {/* Security Banner */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <Lock className="h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-xs font-medium text-emerald-800">
          Your data is encrypted and processed securely. Exports are generated on-demand and never stored externally.
        </p>
      </div>

      {/* Date Range Selection */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Select Reporting Period
        </h2>

        {/* Quick Year Select */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Select Year</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              <span>{yearOptions.find((y) => y.from === dateFrom && y.to === dateTo)?.label ?? 'Custom Range'}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {yearDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-card shadow-lg">
                {yearOptions.map((y) => (
                  <button
                    key={y.label}
                    type="button"
                    onClick={() => selectYear(y.from, y.to)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent ${dateFrom === y.from && dateTo === y.to ? 'bg-primary/5 font-bold text-primary' : 'text-foreground'}`}
                  >
                    <span>{y.label}</span>
                    {dateFrom === y.from && dateTo === y.to && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Summary Preview */}
      {isLoading ? (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Calculating your tax summary...</p>
        </div>
      ) : error ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm font-medium text-destructive">Failed to load data. Please try again.</p>
        </div>
      ) : summary ? (
        <div className="mb-6 flex flex-col gap-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard
              icon={<DollarSign className="h-4 w-4" />}
              iconBg="bg-emerald-50 text-emerald-700"
              label="Total Revenue"
              value={formatBaht(summary.totalRevenue)}
              subtitle={`${summary.daysReported} day${summary.daysReported === 1 ? '' : 's'}`}
            />
            <KPICard
              icon={<Receipt className="h-4 w-4" />}
              iconBg="bg-red-50 text-red-600"
              label="Total Expenses"
              value={formatBaht(summary.totalExpenses)}
              subtitle={`${data.receiptsCount + data.fixedCostsCount} items`}
            />
            <KPICard
              icon={summary.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              iconBg={summary.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}
              label="Net Profit"
              value={formatBaht(summary.netProfit)}
            />
            <KPICard
              icon={<Wallet className="h-4 w-4" />}
              iconBg="bg-orange-50 text-orange-600"
              label="Fixed Costs"
              value={formatBaht(summary.totalFixedCosts)}
              subtitle={`${data.fixedCostsCount} items`}
            />
          </div>

          {/* Revenue Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-foreground">Revenue Breakdown</h3>
            <div className="flex flex-col gap-2">
              <BreakdownRow label="Cash" value={summary.totalCash} total={summary.totalRevenue} color="bg-emerald-500" />
              <BreakdownRow label="PromptPay" value={summary.totalPromptpay} total={summary.totalRevenue} color="bg-sky-500" />
              <BreakdownRow label="Credit Card" value={summary.totalCreditCard} total={summary.totalRevenue} color="bg-amber-500" />
            </div>
          </div>

          {/* Expense Categories */}
          {sortedCategories.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-foreground">Expense Categories</h3>
              <div className="flex flex-col gap-2">
                {sortedCategories.map(([cat, amount]) => (
                  <BreakdownRow
                    key={cat}
                    label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    value={amount as number}
                    total={summary.totalExpenses}
                    color="bg-foreground/70"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Monthly Breakdown Table */}
          {data?.monthlyRows && data.monthlyRows.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-foreground">Monthly Breakdown</h3>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full min-w-[780px] text-[11px]">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th rowSpan={2} className="px-1.5 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide">Month</th>
                      <th rowSpan={2} className="px-1.5 py-2 text-right font-bold text-emerald-700 uppercase tracking-wide">Income</th>
                      <th colSpan={4} className="px-1.5 py-1.5 text-center font-bold text-red-500 uppercase tracking-wide border-b border-red-200">Expenses</th>
                      <th colSpan={5} className="px-1.5 py-1.5 text-center font-bold text-orange-500 uppercase tracking-wide border-b border-orange-200">Fixed Costs</th>
                      <th rowSpan={2} className="px-1.5 py-2 text-right font-bold text-muted-foreground uppercase tracking-wide">Net</th>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-1.5 py-1.5 text-right font-medium text-red-400">Ingr.</th>
                      <th className="px-1.5 py-1.5 text-right font-medium text-red-400">Drinks</th>
                      <th className="px-1.5 py-1.5 text-right font-medium text-red-400">Other</th>
                      <th className="px-1.5 py-1.5 text-right font-bold text-red-600">Total</th>
                      <th className="px-1.5 py-1.5 text-right font-medium text-orange-400">Elec.</th>
                      <th className="px-1.5 py-1.5 text-right font-medium text-orange-400">Water</th>
                      <th className="px-1.5 py-1.5 text-right font-medium text-orange-400">Emp.</th>
                      <th className="px-1.5 py-1.5 text-right font-medium text-orange-400">Other</th>
                      <th className="px-1.5 py-1.5 text-right font-bold text-orange-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyRows.map((row: { month: string; income: number; expIngredients: number; expDrinks: number; expOther: number; receiptExpenses: number; fcElectricity: number; fcWater: number; fcEmployee: number; fcOther: number; fixedCosts: number; totalExpenses: number; netProfit: number; days: number }) => {
                      const monthLabel = new Date(row.month + '-15T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', month: 'short', year: '2-digit' })
                      return (
                        <tr key={row.month} className="border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="px-1.5 py-2 font-semibold text-foreground">
                            {monthLabel}
                            <span className="ml-1 text-[9px] font-normal text-muted-foreground">({row.days}d)</span>
                          </td>
                          <td className="px-1.5 py-2 text-right font-semibold text-emerald-700">{formatBaht(row.income)}</td>
                          <td className="px-1.5 py-2 text-right text-red-500">{formatBaht(row.expIngredients)}</td>
                          <td className="px-1.5 py-2 text-right text-red-500">{formatBaht(row.expDrinks)}</td>
                          <td className="px-1.5 py-2 text-right text-red-500">{formatBaht(row.expOther)}</td>
                          <td className="px-1.5 py-2 text-right font-semibold text-red-600">{formatBaht(row.receiptExpenses)}</td>
                          <td className="px-1.5 py-2 text-right text-orange-500">{formatBaht(row.fcElectricity)}</td>
                          <td className="px-1.5 py-2 text-right text-orange-500">{formatBaht(row.fcWater)}</td>
                          <td className="px-1.5 py-2 text-right text-orange-500">{formatBaht(row.fcEmployee)}</td>
                          <td className="px-1.5 py-2 text-right text-orange-500">{formatBaht(row.fcOther)}</td>
                          <td className="px-1.5 py-2 text-right font-semibold text-orange-600">{formatBaht(row.fixedCosts)}</td>
                          <td className={`px-1.5 py-2 text-right font-bold ${row.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {formatBaht(row.netProfit)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/20">
                      <td className="px-1.5 py-2.5 font-bold text-foreground">Total</td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-emerald-700">{formatBaht(summary.totalRevenue)}</td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-red-500">
                        {formatBaht(data.monthlyRows.reduce((s: number, r: { expIngredients: number }) => s + r.expIngredients, 0))}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-red-500">
                        {formatBaht(data.monthlyRows.reduce((s: number, r: { expDrinks: number }) => s + r.expDrinks, 0))}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-red-500">
                        {formatBaht(data.monthlyRows.reduce((s: number, r: { expOther: number }) => s + r.expOther, 0))}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-red-600">{formatBaht(summary.totalReceiptExpenses)}</td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-orange-500">
                        {formatBaht(data.monthlyRows.reduce((s: number, r: { fcElectricity: number }) => s + r.fcElectricity, 0))}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-orange-500">
                        {formatBaht(data.monthlyRows.reduce((s: number, r: { fcWater: number }) => s + r.fcWater, 0))}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-orange-500">
                        {formatBaht(data.monthlyRows.reduce((s: number, r: { fcEmployee: number }) => s + r.fcEmployee, 0))}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-orange-500">
                        {formatBaht(data.monthlyRows.reduce((s: number, r: { fcOther: number }) => s + r.fcOther, 0))}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-orange-600">{formatBaht(summary.totalFixedCosts)}</td>
                      <td className={`px-1.5 py-2.5 text-right font-bold ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatBaht(summary.netProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Export Buttons */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-foreground">Export Data</h2>
        <p className="mb-4 text-xs text-muted-foreground">Download your data in CSV format for spreadsheet applications and tax filing software</p>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={downloading || isLoading || !summary}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading ? 'Generating...' : 'Download CSV'}
        </button>
      </div>

      {/* Tips & Information Section */}
      <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setTipsOpen(!tipsOpen)}
          className="flex w-full items-center justify-between p-5"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-foreground">Tax Reporting Tips & Information</h2>
              <p className="text-xs text-muted-foreground">Important guidance for annual reporting</p>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tipsOpen ? 'rotate-180' : ''}`} />
        </button>

        {tipsOpen && (
          <div className="border-t border-border px-5 pb-5 pt-4">
            <div className="flex flex-col gap-4">
              <TipCard
                icon={<BookOpen className="h-4 w-4 text-sky-600" />}
                title="Why Annual Data Matters"
                description="Maintaining accurate annual transaction records is essential for tax compliance in Thailand. The Revenue Department may require detailed breakdowns of income and expenses for audits or routine filings."
              />
              <TipCard
                icon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
                title="Keep Receipts Organized"
                description="Upload all purchase receipts promptly to ensure your expense records are complete. Missing receipts can lead to underreported deductions and higher tax liabilities."
              />
              <TipCard
                icon={<Info className="h-4 w-4 text-amber-600" />}
                title="Verify Before Submitting"
                description="Always review your exported data against your bank statements before submitting to your accountant or tax authority. Look for discrepancies in daily totals and ensure all fixed costs are marked as paid."
              />
              <TipCard
                icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
                title="Data Security"
                description="All exports are generated on-demand using your authenticated session. Data is transmitted over encrypted connections and never cached or stored on external servers."
              />

              {topCategory && (
                <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-4">
                  <p className="text-xs font-medium text-amber-800">
                    <strong>Quick Insight:</strong> Your largest expense category is <strong className="capitalize">{topCategory[0]}</strong> at {formatBaht(topCategory[1] as number)}, representing {summary ? Math.round(((topCategory[1] as number) / summary.totalExpenses) * 100) : 0}% of total expenses. Consider reviewing this category for potential savings.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function KPICard({ icon, iconBg, label, value, subtitle }: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  subtitle?: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
        {subtitle && <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/70">{subtitle}</p>}
      </div>
    </div>
  )
}

function BreakdownRow({ label, value, total, color }: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm font-medium text-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-bold text-foreground">{formatBaht(value)}</span>
      <span className="w-10 shrink-0 text-right text-[11px] font-medium text-muted-foreground">{pct}%</span>
    </div>
  )
}

function TipCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-secondary/40 p-4">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
