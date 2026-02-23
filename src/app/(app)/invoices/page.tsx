'use client'

import { useState } from 'react'
import { formatBaht } from '@/lib/utils'
import { Plus, Trash2, FileText } from 'lucide-react'

interface LineItem {
  description: string
  quantity: string
  unitPrice: string
}

function toNum(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

export default function InvoicePage() {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: '1', unitPrice: '' },
  ])
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  const addLineItem = () => {
    setItems([...items, { description: '', quantity: '1', unitPrice: '' }])
  }

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const subtotal = items.reduce((sum, item) => sum + toNum(item.quantity) * toNum(item.unitPrice), 0)
  const total = subtotal

  const resetForm = () => {
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setNotes('')
    setItems([{ description: '', quantity: '1', unitPrice: '' }])
    setDate(today)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          date,
          notes,
          items: items.map((i) => ({
            description: i.description,
            quantity: toNum(i.quantity),
            unitPrice: toNum(i.unitPrice),
          })),
          subtotal,
          tax: 0,
          total,
        }),
      })

      if (!res.ok) throw new Error('Failed to create invoice')
      const data = await res.json()

      const byteCharacters = atob(data.pdf)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' })
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create invoice. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Invoice Generator</h1>
          <p className="text-xs text-muted-foreground">Create and print invoices</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:brightness-110"
        >
          <FileText className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Customer Info */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">Customer Information</h2>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {items.map((item, index) => (
              <div key={index} className="rounded-xl border border-border bg-background p-3">
                <input
                  type="text"
                  required
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Item description"
                  className="mb-2 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Qty</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={item.quantity}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          updateLineItem(index, 'quantity', val)
                        }
                      }}
                      className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Unit Price</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={item.unitPrice}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          updateLineItem(index, 'unitPrice', val)
                        }
                      }}
                      className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Amount</label>
                    <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-sm font-semibold text-emerald-700">
                      {formatBaht(toNum(item.quantity) * toNum(item.unitPrice))}
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="mt-3 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between border-t border-border py-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatBaht(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2.5 text-base font-bold">
                <span className="text-primary">Total</span>
                <span className="text-primary">{formatBaht(total)}</span>
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground uppercase">No VAT</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <label className="mb-2 block text-sm font-bold text-foreground">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {saving ? 'Generating...' : 'Generate Invoice PDF'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  )
}
