'use client'

import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

/* ─── Date & Formatting Utilities ─── */

export function getThaiToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type ViewMode = 'monthly' | 'quarterly' | 'yearly'

export function getDateRange(mode: ViewMode, ref: string): { from: string; to: string } {
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

export function getDateLabel(mode: ViewMode, from: string, to: string): string {
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
      return `${year + 543}`
    }
  }
}

export function navigateRange(mode: ViewMode, from: string, direction: number): string {
  const d = new Date(from + 'T12:00:00')
  if (mode === 'monthly') d.setMonth(d.getMonth() + direction)
  else if (mode === 'quarterly') d.setMonth(d.getMonth() + direction * 3)
  else d.setFullYear(d.getFullYear() + direction)
  return toDateStr(d)
}

export function formatBaht(v: number): string {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

export function formatShortBaht(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

/* ─── Color Palette ─── */

export const COLORS = {
  sales: 'hsl(152, 45%, 42%)',
  expenses: 'hsl(354, 52%, 56%)',
  ingredients: 'hsl(24, 65%, 52%)',
  fixedCosts: 'hsl(220, 42%, 56%)',
  electricity: 'hsl(38, 72%, 52%)',
  sunny: 'hsl(42, 68%, 52%)',
  rainy: 'hsl(210, 48%, 54%)',
  cloudy: 'hsl(200, 12%, 64%)',
  facebook: '#1877F2',
  tiktok: '#010101',
  instagram: '#E4405F',
  influencers: '#F59E0B',
  others: '#6B7280',
}

export const CATEGORY_COLORS = [
  'hsl(24, 65%, 52%)',
  'hsl(152, 45%, 42%)',
  'hsl(38, 72%, 52%)',
  'hsl(174, 42%, 44%)',
  'hsl(220, 42%, 56%)',
  'hsl(354, 42%, 58%)',
  'hsl(270, 30%, 56%)',
  'hsl(82, 38%, 46%)',
]

export const PAYMENT_COLORS = ['hsl(152, 45%, 42%)', 'hsl(220, 42%, 56%)', 'hsl(38, 72%, 52%)']

export const GRID_STROKE = 'hsl(40, 12%, 90%)'
export const AXIS_STROKE = 'hsl(160, 8%, 52%)'

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

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < (s?.length ?? 0); i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}

export function getCategoryColor(category: string): string {
  return FIXED_CATEGORY_COLORS[category?.toLowerCase()] ?? CATEGORY_COLORS[Math.abs(hashStr(category)) % CATEGORY_COLORS.length]
}

/* ─── Shared Sub-components ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartTooltip({ active, payload, label }: any) {
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

export function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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

export function KPICard({ icon, iconBg, label, value, trend, subtitle }: { icon: React.ReactNode; iconBg: string; label: string; value: string; trend?: 'up' | 'down'; subtitle?: string }) {
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

export function EmptyChart() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No data available for this period</p>
    </div>
  )
}

export function WeatherBadge({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-1">
      {icon}
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-bold text-foreground">{count}</span>
    </div>
  )
}
