'use client'

import { useState } from 'react'
import { formatBaht } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

export default function InvoicePage() {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  const addLineItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const total = subtotal // No VAT

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
          items,
          subtotal,
          tax: 0,
          total,
        }),
      })

      if (!res.ok) throw new Error('Failed to create invoice')
      const data = await res.json()

      // Open the PDF
      const pdfBlob = new Blob(
        [Buffer.from(data.pdf, 'base64')],
        { type: 'application/pdf' }
      )
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
      <div className="mb-8 flex items-center gap-4">
        <Image
          src="/assets/logos/AW_LOGO_MADRE-01.png"
          alt="Madre Logo"
          width={48}
          height={66}
          priority
        />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoice Generator</h1>
          <p className="text-sm text-muted-foreground">Create and save invoices</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Customer Info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Customer Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          {/* Desktop table header */}
          <div className="mb-2 hidden grid-cols-12 gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1"></div>
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={index}>
                {/* Desktop row */}
                <div className="hidden grid-cols-12 items-center gap-3 md:grid">
                  <div className="col-span-5">
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground">
                      {formatBaht(item.quantity * item.unitPrice)}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile row */}
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3 md:hidden">
                  <input
                    type="text"
                    required
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Qty"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="Unit Price"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{formatBaht(item.quantity * item.unitPrice)}</span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64">
              <div className="flex items-center justify-between border-t border-border py-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatBaht(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border py-2 text-base font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-primary">{formatBaht(total)}</span>
              </div>
              <p className="text-right text-xs text-muted-foreground">No VAT</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="mb-2 block text-sm font-medium text-foreground">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Generating...' : 'Generate Invoice PDF'}
        </button>
      </form>
    </div>
  )
}
