'use client'

import { useState } from 'react'
import { formatBaht } from '@/lib/utils'
import { Plus, Check } from 'lucide-react'
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

const PIE_COLORS = ['#22c55e', '#06b6d4', '#f43f5e', '#fb923c', '#f59e0b', '#a78bfa', '#64748b', '#ec4899']

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
          dueDay: null,
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fixed Costs</h1>
          <p className="text-xs text-muted-foreground">{thaiMonth}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); resetForm() }}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Add Cost
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-violet-500 p-3 shadow-md shadow-violet-500/15 sm:p-4">
          <p className="text-[10px] font-semibold text-violet-100 uppercase tracking-wide">Total</p>
          <p className="mt-0.5 text-base font-bold text-white sm:text-lg">{formatBaht(totalCosts)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-500 p-3 shadow-md shadow-emerald-500/15 sm:p-4">
          <p className="text-[10px] font-semibold text-emerald-100 uppercase tracking-wide">Paid</p>
          <p className="mt-0.5 text-base font-bold text-white sm:text-lg">{formatBaht(totalPaid)}</p>
        </div>
        <div className="rounded-2xl bg-amber-500 p-3 shadow-md shadow-amber-500/15 sm:p-4">
          <p className="text-[10px] font-semibold text-amber-100 uppercase tracking-wide">Remaining</p>
          <p className="mt-0.5 text-base font-bold text-white sm:text-lg">{formatBaht(totalUnpaid)}</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">Add Fixed Cost</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electricity, Water"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  {COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount (THB) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{'฿'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-7 pr-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="Optional notes"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
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

      {/* Fixed Costs Table */}
      <div className="mb-4 rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">Monthly Fixed Costs</h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : costs.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 w-12">Paid</th>
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
                      className={`border-b border-border/50 last:border-0 transition-all duration-300 ${
                        cost.is_paid ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <td className="px-5 py-3">
                        <button
                          onClick={() => togglePaid(cost.id, cost.is_paid)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                            cost.is_paid
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                              : 'border-border text-transparent hover:border-emerald-300'
                          }`}
                          title={cost.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </td>
                      <td className={`px-5 py-3 font-medium ${cost.is_paid ? 'text-emerald-700' : 'text-foreground'}`}>
                        {cost.name}
                      </td>
                      <td className="px-5 py-3 capitalize text-muted-foreground">{cost.category}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {PAYMENT_METHODS.find((m) => m.value === cost.payment_method)?.label || cost.payment_method}
                      </td>
                      <td className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${cost.is_paid ? 'text-emerald-600' : 'text-foreground'}`}>
                        {formatBaht(Number(cost.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col divide-y divide-border/50 md:hidden">
              {costs.map((cost) => (
                <div key={cost.id} className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 ${cost.is_paid ? 'bg-emerald-50' : ''}`}>
                  <button
                    onClick={() => togglePaid(cost.id, cost.is_paid)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      cost.is_paid
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : 'border-border text-transparent hover:border-emerald-300'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${cost.is_paid ? 'text-emerald-700' : 'text-foreground'}`}>{cost.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{cost.category}</p>
                  </div>
                  <p className={`text-sm font-semibold ${cost.is_paid ? 'text-emerald-600' : 'text-foreground'}`}>
                    {formatBaht(Number(cost.amount))}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">No fixed costs for this month. Add your first one above.</p>
          </div>
        )}
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-foreground">Payments by Method</h2>
          <p className="mb-3 text-xs text-muted-foreground">Where your money goes</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={11}
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
