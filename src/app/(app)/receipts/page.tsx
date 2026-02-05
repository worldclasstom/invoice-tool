'use client'

import { useState, useEffect } from 'react'
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

  // Form state
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receipts & Expenses</h1>
          <p className="text-sm text-muted-foreground">Upload receipts or add expenses manually</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); resetForm() }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Receipt
        </button>
      </div>

      {/* New Receipt Form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">New Receipt</h2>

          {/* Toggle: Upload vs Manual */}
          <div className="mb-6 flex rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setIsManual(false)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !isManual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="h-4 w-4" />
              Upload Receipt
            </button>
            <button
              type="button"
              onClick={() => setIsManual(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isManual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              Manual Entry
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Image upload area */}
            {!isManual && (
              <div>
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="Receipt" className="max-h-48 rounded-lg object-contain" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-card p-1.5 shadow-sm hover:bg-secondary"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input px-6 py-8 transition-colors hover:border-primary/40 hover:bg-primary/5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Camera className="h-5 w-5" />
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {uploading ? 'Uploading...' : 'Click to upload receipt image'}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Receipt Date *</label>
                <input
                  type="date"
                  required
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Vendor / Store *</label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Makro, Local Market"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Total (THB) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{'฿'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Receipt'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Recent Receipts</h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : receipts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-foreground">
                      {formatThaiDate(r.receipt_date)}
                    </td>
                    <td className="px-5 py-3 text-foreground">{r.vendor}</td>
                    <td className="px-5 py-3 text-muted-foreground capitalize">{r.category}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-destructive">
                      -{formatBaht(Number(r.total))}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {r.is_manual ? (
                          <><FileText className="h-3 w-3" /> Manual</>
                        ) : (
                          <><ImageIcon className="h-3 w-3" /> Upload</>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">No receipts yet. Add your first receipt above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
