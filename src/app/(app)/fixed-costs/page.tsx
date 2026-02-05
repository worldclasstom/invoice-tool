'use client'

import { useState } from 'react'
import { formatBaht } from '@/lib/utils'
import { Plus, Check, X } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const COST_CATEGORIES = [
  'utilities',
  'employees',
  'rent',
  'advertising',
  'insurance',
  'subscriptions',
  'maintenance',
  'other',
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'kbank', label: 'KBank' },
  { value: 'scb', label: 'SCB' },
  { value: 'bangkok_bank', label: 'Bangkok Bank' },
  { value: 'krungsri', label: 'Krungsri' },
]

const PIE_COLORS = ['#3A5A40', '#588157', '#D4613E', '#E07A5F', '#F2CC8F', '#81B29A', '#3D405B', '#A3B18A']

interface FixedCost {
  id: string
  name: string
  category: string
  amount: number
  payment_method: string
  is_paid: boolean
  paid_date: string | null
  period_month: number
  period_year: number
  notes: string | null
}

export default function FixedCostsPage() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  const { data, isLoading } = useSWR(`/api/fixed-costs?month=${month}&year=${year}`, fetcher)
  const costs: FixedCost[] = data?.costs ?? []

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('utilities')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [dueDay, setDueDay] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const thaiMonth = new Date(year, month - 1).toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  })

  const resetForm = () => {
    setName('')
    setCategory('utilities')
    setAmount('')
    setPaymentMethod('cash')
    setDueDay('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/fixed-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          amount: Number(amount),
          paymentMethod,
          dueDay: dueDay ? Number(dueDay) : null,
          periodMonth: month,
          periodYear: year,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      resetForm()
      setShowForm(false)
      mutate(`/api/fixed-costs?month=${month}&year=${year}`)
    } catch (err) {
      alert('Failed to save fixed cost.')
      console.error(err)
    }
    setSaving(false)
  }

  const togglePaid = async (id: string, currentPaid: boolean) => {
    try {
      const res = await fetch('/api/fixed-costs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPaid: !currentPaid }),
      })
      if (!res.ok) throw new Error('Failed to update')
      mutate(`/api/fixed-costs?month=${month}&year=${year}`)
    } catch (err) {
      console.error(err)
    }
  }

  // Pie chart: payments by method
  const methodTotals: Record<string, number> = {}
  costs.forEach((c) => {
    const method = PAYMENT_METHODS.find((m) => m.value === c.payment_method)?.label || c.payment_method
    methodTotals[method] = (methodTotals[method] || 0) + Number(c.amount)
  })
  const pieData = Object.entries(methodTotals)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  const totalCosts = costs.reduce((s, c) => s + Number(c.amount), 0)
  const totalPaid = costs.filter((c) => c.is_paid).reduce((s, c) => s + Number(c.amount), 0)
  const totalUnpaid = totalCosts - totalPaid

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fixed Costs</h1>
          <p className="text-sm text-muted-foreground">{thaiMonth}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); resetForm() }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Cost
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Fixed Costs</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatBaht(totalCosts)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid</p>
          <p className="mt-1 text-xl font-bold text-success">{formatBaht(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remaining</p>
          <p className="mt-1 text-xl font-bold text-destructive">{formatBaht(totalUnpaid)}</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Add Fixed Cost</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electricity, Water"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Amount (THB) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{'฿'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Optional notes"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
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

      {/* Fixed Costs Table */}
      <div className="mb-6 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Monthly Fixed Costs</h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : costs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((cost) => (
                  <tr
                    key={cost.id}
                    className={`border-b border-border last:border-0 transition-colors ${
                      cost.is_paid ? 'bg-success/5' : ''
                    }`}
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() => togglePaid(cost.id, cost.is_paid)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                          cost.is_paid
                            ? 'border-success bg-success text-success-foreground'
                            : 'border-border text-muted-foreground hover:border-primary'
                        }`}
                        title={cost.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
                      >
                        {cost.is_paid ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4 opacity-0" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{cost.name}</td>
                    <td className="px-5 py-3 capitalize text-muted-foreground">{cost.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {PAYMENT_METHODS.find((m) => m.value === cost.payment_method)?.label || cost.payment_method}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-foreground">
                      {formatBaht(Number(cost.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">No fixed costs for this month. Add your first one above.</p>
          </div>
        )}
      </div>

      {/* Pie Chart: Payments by Method */}
      {pieData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Payments by Method</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatBaht(val)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
