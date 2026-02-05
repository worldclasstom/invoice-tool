'use client'

import { useState } from 'react'
import { formatBaht, formatThaiDate } from '@/lib/utils'
import { Upload, Camera, Trash2, Plus, FileText, Image as ImageIcon } from 'lucide-react'
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
  const [isManual, setIsManual] = useState(false)

  const [receiptDate, setReceiptDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  )
  const [vendor, setVendor] = useState('')
  const [total, setTotal] = useState('')
  const [category, setCategory] = useState('ingredients')
  const [notes, setNotes] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await res.json()
      if (result.url) setImageUrl(result.url)
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
  }

  const resetForm = () => {
    setReceiptDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }))
    setVendor('')
    setTotal('')
    setCategory('ingredients')
    setNotes('')
    setImageUrl(null)
    setIsManual(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptDate,
          vendor,
          total: Number(total),
          category,
          notes: notes || null,
          imageUrl,
          isManual,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
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
          <h2 className="mb-4 text-sm font-bold text-foreground">New Receipt</h2>

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
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="Receipt" className="max-h-48 rounded-xl object-contain" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 shadow-md hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/50 px-6 py-8 transition-all hover:border-rose-400 hover:bg-rose-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                        <Camera className="h-5 w-5 text-rose-500" />
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                        <Upload className="h-5 w-5 text-rose-500" />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {uploading ? 'Uploading...' : 'Tap to upload receipt image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="sr-only"
                      disabled={uploading}
                    />
                  </label>
                )}
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

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Receipt'}
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
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">Recent Receipts</h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : receipts.length > 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/50">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col divide-y divide-border/50 md:hidden">
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.vendor}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatThaiDate(r.receipt_date)}</span>
                      <span className="text-xs capitalize text-muted-foreground">{r.category}</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-rose-500">
                    -{formatBaht(Number(r.total))}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No receipts yet. Add your first receipt above.</p>
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
