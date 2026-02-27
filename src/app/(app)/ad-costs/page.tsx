'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { Loader2, Plus, Trash2, Edit3, X, Check, CalendarRange, TrendingUp, DollarSign, ChevronDown } from 'lucide-react'

/* ── helpers ── */
const fetcher = (url: string) => fetch(url).then((r) => r.json())
const formatBaht = (n: number) => n.toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const toDateStr = (d: Date) => d.toISOString().split('T')[0]

/* ── platform config ── */
type Platform = 'facebook' | 'tiktok' | 'instagram'
type PeriodType = 'weekly' | 'monthly' | 'yearly'

const PLATFORMS: { id: Platform; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'facebook', label: 'Facebook', color: '#1877F2', bgColor: 'bg-[#1877F2]/10', borderColor: 'border-[#1877F2]/30' },
  { id: 'tiktok', label: 'TikTok', color: '#000000', bgColor: 'bg-neutral-900/10', borderColor: 'border-neutral-900/30' },
  { id: 'instagram', label: 'Instagram', color: '#E4405F', bgColor: 'bg-[#E4405F]/10', borderColor: 'border-[#E4405F]/30' },
]

const PERIODS: { id: PeriodType; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/>
    </svg>
  )
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  switch (platform) {
    case 'facebook': return <FacebookIcon className={className} />
    case 'tiktok': return <TikTokIcon className={className} />
    case 'instagram': return <InstagramIcon className={className} />
  }
}

/* ── types ── */
interface AdCostEntry {
  id: string
  platform: Platform
  period_type: PeriodType
  start_date: string
  end_date: string
  amount: number
  note: string
  created_at: string
}

/* ── main page ── */
export default function AdCostsPage() {
  const now = new Date()
  const yearStart = `${now.getFullYear()}-01-01`
  const yearEnd = `${now.getFullYear()}-12-31`

  const [dateFrom, setDateFrom] = useState(yearStart)
  const [dateTo, setDateTo] = useState(yearEnd)
  const [filterPlatform, setFilterPlatform] = useState<Platform | ''>('')
  const [filterPeriod, setFilterPeriod] = useState<PeriodType | ''>('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formPlatform, setFormPlatform] = useState<Platform>('facebook')
  const [formPeriod, setFormPeriod] = useState<PeriodType>('weekly')
  const [formStartDate, setFormStartDate] = useState(toDateStr(now))
  const [formEndDate, setFormEndDate] = useState(toDateStr(new Date(now.getTime() + 7 * 86400000)))
  const [formAmount, setFormAmount] = useState('')
  const [formNote, setFormNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Build query string
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (filterPlatform) params.set('platform', filterPlatform)
    if (filterPeriod) params.set('period_type', filterPeriod)
    return params.toString()
  }, [dateFrom, dateTo, filterPlatform, filterPeriod])

  const { data, isLoading, mutate } = useSWR(`/api/ad-costs?${queryParams}`, fetcher)

  const entries: AdCostEntry[] = data?.entries ?? []
  const summary = data?.summary ?? { totalSpend: 0, byPlatform: {}, byPeriod: {}, count: 0 }

  const resetForm = useCallback(() => {
    setShowForm(false)
    setEditingId(null)
    setFormPlatform('facebook')
    setFormPeriod('weekly')
    setFormStartDate(toDateStr(now))
    setFormEndDate(toDateStr(new Date(now.getTime() + 7 * 86400000)))
    setFormAmount('')
    setFormNote('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!formAmount || Number(formAmount) <= 0) return
    setSaving(true)
    try {
      const body = {
        platform: formPlatform,
        period_type: formPeriod,
        start_date: formStartDate,
        end_date: formEndDate,
        amount: Number(formAmount),
        note: formNote,
      }
      if (editingId) {
        await fetch('/api/ad-costs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        })
      } else {
        await fetch('/api/ad-costs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      await mutate()
      resetForm()
    } finally {
      setSaving(false)
    }
  }, [formPlatform, formPeriod, formStartDate, formEndDate, formAmount, formNote, editingId, mutate, resetForm])

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/ad-costs?id=${id}`, { method: 'DELETE' })
    await mutate()
  }, [mutate])

  const handleEdit = useCallback((entry: AdCostEntry) => {
    setEditingId(entry.id)
    setFormPlatform(entry.platform)
    setFormPeriod(entry.period_type)
    setFormStartDate(entry.start_date)
    setFormEndDate(entry.end_date)
    setFormAmount(String(entry.amount))
    setFormNote(entry.note || '')
    setShowForm(true)
  }, [])

  // Quick date preset helpers
  const setThisWeek = () => {
    const d = new Date()
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setDateFrom(toDateStr(monday))
    setDateTo(toDateStr(sunday))
  }
  const setThisMonth = () => {
    const d = new Date()
    setDateFrom(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    setDateTo(toDateStr(last))
  }
  const setThisYear = () => {
    setDateFrom(`${now.getFullYear()}-01-01`)
    setDateTo(`${now.getFullYear()}-12-31`)
  }

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-6 lg:py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Ad Costs</h1>
              <p className="text-xs text-muted-foreground">Track advertising spend across platforms</p>
            </div>
          </div>
        </div>

        {/* Platform Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Total */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Spend</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatBaht(summary.totalSpend)}</p>
            <p className="text-[11px] text-muted-foreground">{summary.count} entries</p>
          </div>
          {/* Per platform */}
          {PLATFORMS.map((p) => (
            <div key={p.id} className={`rounded-2xl border ${p.borderColor} ${p.bgColor} p-4 shadow-sm`}>
              <div className="mb-2 flex items-center gap-2">
                <PlatformIcon platform={p.id} className="h-4 w-4" style={{ color: p.color } as React.CSSProperties} />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{p.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{formatBaht(summary.byPlatform[p.id] || 0)}</p>
            </div>
          ))}
        </div>

        {/* Date Range & Filters */}
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">Date Range & Filters</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" onClick={setThisWeek} className="rounded-lg bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-secondary/80">This Week</button>
            <button type="button" onClick={setThisMonth} className="rounded-lg bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-secondary/80">This Month</button>
            <button type="button" onClick={setThisYear} className="rounded-lg bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-secondary/80">This Year</button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="relative">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</label>
              <div className="relative">
                <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value as Platform | '')} className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">All Platforms</option>
                  {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="relative">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
              <div className="relative">
                <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as PeriodType | '')} className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">All Periods</option>
                  {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Add New Button */}
        {!showForm && (
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true) }}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3.5 text-sm font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            Add Ad Spend Entry
          </button>
        )}

        {/* Add / Edit Form */}
        {showForm && (
          <div className="mb-5 rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">{editingId ? 'Edit Entry' : 'New Ad Spend Entry'}</h3>
              <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Platform Selection */}
            <div className="mb-4">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormPlatform(p.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-xs font-semibold transition-all ${
                      formPlatform === p.id
                        ? `border-current ${p.bgColor} shadow-sm`
                        : 'border-border bg-background text-muted-foreground hover:border-border/80'
                    }`}
                    style={formPlatform === p.id ? { color: p.color, borderColor: p.color } : undefined}
                  >
                    <PlatformIcon platform={p.id} className="h-4 w-4" />
                    <span className="hidden sm:inline">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Period Type */}
            <div className="mb-4">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Period Type</label>
              <div className="flex gap-2">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFormPeriod(p.id)
                      // Auto-adjust end date based on period
                      const start = new Date(formStartDate + 'T12:00:00')
                      if (p.id === 'weekly') {
                        const end = new Date(start)
                        end.setDate(start.getDate() + 6)
                        setFormEndDate(toDateStr(end))
                      } else if (p.id === 'monthly') {
                        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
                        setFormEndDate(toDateStr(end))
                      } else {
                        const end = new Date(start.getFullYear(), 11, 31)
                        setFormEndDate(toDateStr(end))
                      }
                    }}
                    className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all ${
                      formPeriod === p.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates + Amount */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Start Date</label>
                <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">End Date</label>
                <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount (THB)</label>
                <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" min="0" step="0.01" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Note (optional)</label>
                <input type="text" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="e.g. Boost post #12" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !formAmount || Number(formAmount) <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        )}

        {/* Entries List */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-bold text-foreground">Ad Spend Entries</h3>
            <p className="text-[11px] text-muted-foreground">{entries.length} entries in selected range</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No ad spend entries yet</p>
              <p className="text-xs text-muted-foreground/60">Add your first entry above</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {entries.map((entry) => {
                const platformConfig = PLATFORMS.find((p) => p.id === entry.platform)!
                const periodLabel = PERIODS.find((p) => p.id === entry.period_type)?.label || entry.period_type
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/20">
                    {/* Platform Icon */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: platformConfig.color + '15' }}
                    >
                      <PlatformIcon platform={entry.platform} className="h-5 w-5" style={{ color: platformConfig.color } as React.CSSProperties} />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{platformConfig.label}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: platformConfig.color + '15', color: platformConfig.color }}>
                          {periodLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.start_date} to {entry.end_date}
                        {entry.note && <span className="ml-1.5 text-muted-foreground/60">- {entry.note}</span>}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatBaht(entry.amount)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(entry)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Edit entry"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Period Breakdown */}
        {entries.length > 0 && (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {PERIODS.map((p) => {
              const periodEntries = entries.filter((e) => e.period_type === p.id)
              const total = periodEntries.reduce((s, e) => s + Number(e.amount), 0)
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{p.label} Spend</h4>
                  <p className="mb-2 text-lg font-bold text-foreground">{formatBaht(total)}</p>
                  <div className="flex flex-col gap-1.5">
                    {PLATFORMS.map((pl) => {
                      const plTotal = periodEntries.filter((e) => e.platform === pl.id).reduce((s, e) => s + Number(e.amount), 0)
                      if (plTotal === 0) return null
                      return (
                        <div key={pl.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <PlatformIcon platform={pl.id} className="h-3 w-3" style={{ color: pl.color } as React.CSSProperties} />
                            <span className="text-[11px] text-muted-foreground">{pl.label}</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground">{formatBaht(plTotal)}</span>
                        </div>
                      )
                    })}
                    {total === 0 && <p className="text-[11px] text-muted-foreground/60">No entries</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
