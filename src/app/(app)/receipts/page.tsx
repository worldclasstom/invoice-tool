'use client'

import { useState, useMemo } from 'react'
import { formatBaht, formatThaiDate } from '@/lib/utils'
import { Upload, Camera, Trash2, Edit3, Plus, FileText, ChevronDown, ChevronUp, CalendarRange } from 'lucide-react'
import useSWR, { mutate } from 'swr'

const CATEGORIES = [
  'ingredients',
  'beverages',
  'packaging',
  'cleaning',
  'kitchen supplies',
  'other',
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Receipt {
  id: string
  receipt_date: string
  vendor: string
  total: number
  category: string
  notes: string | null
  image_url: string | null
  is_manual: boolean
  created_at: string
}

export default function ReceiptsPage() {
  const { data, isLoading } = useSWR('/api/receipts', fetcher)
  const receipts: Receipt[] = data?.receipts ?? []

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)
  const [isManual, setIsManual] = useState(false)

  // Filter state
  type FilterPreset = 'all' | 'this_week' | 'this_month' | 'prev_month' | 'custom'
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const filteredReceipts = useMemo(() => {
    if (filterPreset === 'all') return receipts

    const now = new Date()
    // Use Bangkok timezone for date calculations
    const bangkokNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    let from: string
    let to: string

    if (filterPreset === 'this_week') {
      const day = bangkokNow.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday = start of week
      const weekStart = new Date(bangkokNow)
      weekStart.setDate(bangkokNow.getDate() - diff)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      from = weekStart.toLocaleDateString('en-CA')
      to = weekEnd.toLocaleDateString('en-CA')
    } else if (filterPreset === 'this_month') {
      from = `${bangkokNow.getFullYear()}-${String(bangkokNow.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(bangkokNow.getFullYear(), bangkokNow.getMonth() + 1, 0).getDate()
      to = `${bangkokNow.getFullYear()}-${String(bangkokNow.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    } else if (filterPreset === 'prev_month') {
      const prevMonth = new Date(bangkokNow.getFullYear(), bangkokNow.getMonth() - 1, 1)
      from = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()
      to = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    } else {
      // custom
      from = customFrom || '1970-01-01'
      to = customTo || '2099-12-31'
    }

    return receipts.filter((r) => r.receipt_date >= from && r.receipt_date <= to)
  }, [receipts, filterPreset, customFrom, customTo])

  const visibleReceipts = filteredReceipts.slice(0, visibleCount)
  const hasMore = filteredReceipts.length > visibleCount
  const isExpanded = visibleCount > 10

  const selectPreset = (preset: FilterPreset) => {
    setFilterPreset(preset)
    setVisibleCount(10) // Reset pagination when changing filter
  }

  const [receiptDate, setReceiptDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  )
  const [vendor, setVendor] = useState('')
  const [total, setTotal] = useState('')
  const [category, setCategory] = useState('ingredients')
  const [notes, setNotes] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })

  // Legacy single-image getter for edit mode
  const imageUrl = imageUrls[0] ?? null

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })
    const uploaded: string[] = [...imageUrls]
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length })
      try {
        const formData = new FormData()
        formData.append('file', files[i])
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const result = await res.json()
        if (result.url) uploaded.push(result.url)
      } catch (err) {
        console.error(`Upload failed for file ${i + 1}:`, err)
      }
    }
    setImageUrls(uploaded)
    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    // Reset the input so the same files can be re-selected
    e.target.value = ''
  }

  const resetForm = () => {
    setEditingId(null)
    setReceiptDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }))
    setVendor('')
    setTotal('')
    setCategory('ingredients')
    setNotes('')
    setImageUrls([])
    setIsManual(false)
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteReceipt = async (id: string, vendor: string) => {
    if (!confirm(`Delete receipt from "${vendor}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/receipts?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      mutate('/api/receipts')
    } catch (err) {
      alert('Failed to delete receipt.')
      console.error(err)
    }
    setDeletingId(null)
  }

  const editReceipt = (receipt: Receipt) => {
    setEditingId(receipt.id)
    setReceiptDate(receipt.receipt_date)
    setVendor(receipt.vendor)
    setTotal(String(receipt.total))
    setCategory(receipt.category)
    setNotes(receipt.notes || '')
    setImageUrls(receipt.image_url ? [receipt.image_url] : [])
    setIsManual(receipt.is_manual)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingId) {
        // Single update
        const payload = {
          id: editingId,
          receiptDate,
          vendor,
          total: Number(total),
          category,
          notes: notes || null,
          imageUrl: imageUrls[0] || null,
          isManual,
        }
        const res = await fetch('/api/receipts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update')
      } else if (!isManual && imageUrls.length > 1) {
        // Batch create: one receipt per image
        setSaveProgress({ current: 0, total: imageUrls.length })
        for (let i = 0; i < imageUrls.length; i++) {
          setSaveProgress({ current: i + 1, total: imageUrls.length })
          const payload = {
            receiptDate,
            vendor: imageUrls.length > 1 ? `${vendor || 'Receipt'} (${i + 1})` : vendor,
            total: Number(total),
            category,
            notes: notes || null,
            imageUrl: imageUrls[i],
            isManual: false,
          }
          const res = await fetch('/api/receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error(`Failed to save receipt ${i + 1}`)
        }
        setSaveProgress({ current: 0, total: 0 })
      } else {
        // Single create
        const payload = {
          receiptDate,
          vendor,
          total: Number(total),
          category,
          notes: notes || null,
          imageUrl: imageUrls[0] || null,
          isManual,
        }
        const res = await fetch('/api/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to save')
      }
      resetForm()
      setShowForm(false)
      mutate('/api/receipts')
    } catch (err) {
      alert('Failed to save receipt.')
      console.error(err)
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Receipts & Expenses</h1>
          <p className="text-xs text-muted-foreground">Upload receipts or add expenses manually</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); resetForm() }}
          className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-500/20 transition-all hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Add Receipt
        </button>
      </div>

      {/* New Receipt Form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">{editingId ? 'Edit Receipt' : 'New Receipt'}</h2>
            {editingId && (
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(false) }}
                className="rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Toggle: Upload vs Manual */}
          <div className="mb-5 flex rounded-xl bg-secondary p-1">
            <button
              type="button"
              onClick={() => setIsManual(false)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                !isManual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Upload Receipt
            </button>
            <button
              type="button"
              onClick={() => setIsManual(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                isManual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Manual Entry
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Image upload area */}
            {!isManual && (
              <div>
                {/* Uploaded image previews */}
                {imageUrls.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {imageUrls.length} receipt{imageUrls.length > 1 ? 's' : ''} uploaded
                      </span>
                      <button
                        type="button"
                        onClick={() => setImageUrls([])}
                        className="text-[10px] font-medium text-destructive hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {imageUrls.map((url, i) => (
                        <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary">
                          <img src={url} alt={`Receipt ${i + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-card/90 opacity-0 shadow-md transition-all group-hover:opacity-100 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-card/80 px-1.5 py-0.5 text-[9px] font-bold text-foreground shadow-sm">
                            {i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload area (always visible so user can add more) */}
                <label className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 transition-all ${
                  imageUrls.length > 0
                    ? 'border-border bg-secondary/50 py-4 hover:border-rose-300 hover:bg-rose-50/30'
                    : 'border-rose-300 bg-rose-50/50 py-8 hover:border-rose-400 hover:bg-rose-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                      <Camera className="h-5 w-5 text-rose-500" />
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                      <Upload className="h-5 w-5 text-rose-500" />
                    </div>
                  </div>
                  {uploading ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      Uploading {uploadProgress.current} of {uploadProgress.total}...
                    </span>
                  ) : (
                    <div className="text-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {imageUrls.length > 0 ? 'Add more receipts' : 'Upload receipt images'}
                      </span>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        Select one or multiple images at once
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receipt Date *</label>
                <input
                  type="date"
                  required
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor / Store *</label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="e.g. Makro, Local Market"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total (THB) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{'฿'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-7 pr-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="Optional notes..."
              />
            </div>

            {!isManual && imageUrls.length > 1 && (
              <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-2.5">
                <p className="text-xs font-medium text-sky-700">
                  Batch mode: {imageUrls.length} receipts will be created, each with the details above. Vendor names will be numbered (e.g. &quot;Makro (1)&quot;, &quot;Makro (2)&quot;).
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {saving
                  ? saveProgress.total > 1
                    ? `Saving ${saveProgress.current}/${saveProgress.total}...`
                    : 'Saving...'
                  : editingId
                  ? 'Update Receipt'
                  : !isManual && imageUrls.length > 1
                  ? `Save ${imageUrls.length} Receipts`
                  : 'Save Receipt'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt List */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Receipts</h2>
          {filteredReceipts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Showing {Math.min(visibleCount, filteredReceipts.length)} of {filteredReceipts.length}
            </span>
          )}
        </div>

        {/* Date Filters */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarRange className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            {([
              ['all', 'All'],
              ['this_week', 'This Week'],
              ['this_month', 'This Month'],
              ['prev_month', 'Previous Month'],
              ['custom', 'Custom Range'],
            ] as [FilterPreset, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => selectPreset(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterPreset === key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {filterPreset === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setVisibleCount(10) }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setVisibleCount(10) }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo('') }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filteredReceipts.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Vendor</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReceipts.map((r) => (
                    <tr key={r.id} className="group border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/50">
                      <td className="whitespace-nowrap px-5 py-3 text-foreground">
                        {formatThaiDate(r.receipt_date)}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">{r.vendor}</td>
                      <td className="px-5 py-3 capitalize text-muted-foreground">{r.category}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-rose-500">
                        -{formatBaht(Number(r.total))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.is_manual ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                        }`}>
                          {r.is_manual ? 'Manual' : 'Upload'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => editReceipt(r)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-secondary hover:text-foreground"
                            aria-label={`Edit receipt from ${r.vendor}`}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteReceipt(r.id, r.vendor)}
                            disabled={deletingId === r.id}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            aria-label={`Delete receipt from ${r.vendor}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col divide-y divide-border/50 md:hidden">
              {visibleReceipts.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.vendor}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatThaiDate(r.receipt_date)}</span>
                      <span className="text-xs capitalize text-muted-foreground">{r.category}</span>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-rose-500">
                    -{formatBaht(Number(r.total))}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => editReceipt(r)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-secondary hover:text-foreground"
                      aria-label={`Edit receipt from ${r.vendor}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteReceipt(r.id, r.vendor)}
                      disabled={deletingId === r.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label={`Delete receipt from ${r.vendor}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Load More / Show Less */}
            {(hasMore || isExpanded) && (
              <div className="flex items-center justify-center gap-3 border-t border-border px-5 py-3">
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 5)}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Load 5 More
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={() => setVisibleCount(10)}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                    Show Less
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {receipts.length > 0 && filterPreset !== 'all'
                ? 'No receipts match this filter.'
                : 'No receipts yet. Add your first receipt above.'}
            </p>
            {receipts.length > 0 && filterPreset !== 'all' && (
              <button
                onClick={() => selectPreset('all')}
                className="mt-1 text-xs font-semibold text-primary hover:underline"
              >
                Show all receipts
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Receipt({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
      <path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>
    </svg>
  )
}
