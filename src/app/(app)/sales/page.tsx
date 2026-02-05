'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBaht } from '@/lib/utils'
import { Upload, Camera, Plus, Trash2, Check } from 'lucide-react'
import Image from 'next/image'

const WEATHER_OPTIONS = [
  { value: 'sunny', label: 'Sunny', icon: '/weather/sunny.svg' },
  { value: 'cloudy', label: 'Cloudy', icon: '/weather/cloudy.svg' },
  { value: 'rainy', label: 'Rainy', icon: '/weather/rainy.svg' },
  { value: 'stormy', label: 'Stormy', icon: '/weather/stormy.svg' },
]

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning', icon: '/times/morning.svg', desc: '6-11' },
  { value: 'lunch', label: 'Lunch', icon: '/times/lunch.svg', desc: '11-14' },
  { value: 'afternoon', label: 'Afternoon', icon: '/times/afternoon.svg', desc: '14-17' },
  { value: 'evening', label: 'Evening', icon: '/times/evening.svg', desc: '17-21' },
]

const BANK_OPTIONS = ['KBank', 'SCB', 'Bangkok Bank', 'Krungsri', 'Cash Holdings']

interface TransferDetail {
  destination: string
  amount: number
}

export default function SalesPage() {
  const [thaiDate, setThaiDate] = useState('')
  const [thaiTime, setThaiTime] = useState('')
  const [reportDate, setReportDate] = useState('')

  const [cashAmount, setCashAmount] = useState('')
  const [promptpayAmount, setPromptpayAmount] = useState('')
  const [creditCardAmount, setCreditCardAmount] = useState('')

  const [tablesServed, setTablesServed] = useState('')
  const [togoOrders, setTogoOrders] = useState('')

  const [transfers, setTransfers] = useState<TransferDetail[]>([
    { destination: '', amount: 0 },
  ])

  const [posImage, setPosImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [weather, setWeather] = useState('')
  const [busiestTimes, setBusiestTimes] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Auto-grab Thai time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const thaiDateStr = now.toLocaleDateString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
      const thaiTimeStr = now.toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const isoDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
      setThaiDate(thaiDateStr)
      setThaiTime(thaiTimeStr)
      setReportDate(isoDate)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const total =
    Number(cashAmount || 0) +
    Number(promptpayAmount || 0) +
    Number(creditCardAmount || 0)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setPosImage(data.url)
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
  }

  const toggleBusiestTime = (value: string) => {
    setBusiestTimes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  const addTransfer = () => {
    setTransfers([...transfers, { destination: '', amount: 0 }])
  }

  const removeTransfer = (index: number) => {
    setTransfers(transfers.filter((_, i) => i !== index))
  }

  const updateTransfer = (index: number, field: keyof TransferDetail, value: string | number) => {
    const updated = [...transfers]
    updated[index] = { ...updated[index], [field]: value }
    setTransfers(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate,
          cashAmount: Number(cashAmount || 0),
          promptpayAmount: Number(promptpayAmount || 0),
          creditCardAmount: Number(creditCardAmount || 0),
          tablesServed: Number(tablesServed || 0),
          togoOrders: Number(togoOrders || 0),
          weather,
          busiestTimes,
          posImageUrl: posImage,
          transferDetails: transfers.filter((t) => t.destination && t.amount > 0),
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
    } catch (err) {
      alert('Failed to save sales report. Please try again.')
      console.error(err)
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header with live date/time */}
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <h1 className="text-2xl font-bold text-foreground">Daily Sales Report</h1>
        <p className="mt-1 text-lg text-primary">{thaiDate}</p>
        <p className="text-sm tabular-nums text-muted-foreground">{thaiTime}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Payment Inputs */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Payments Received</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Cash</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{'฿'}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">PromptPay</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{'฿'}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={promptpayAmount}
                  onChange={(e) => setPromptpayAmount(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Credit Cards</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{'฿'}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditCardAmount}
                  onChange={(e) => setCreditCardAmount(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold text-primary">{formatBaht(total)}</span>
          </div>
        </div>

        {/* Money Transfers */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Money Transfers</h2>
            <button
              type="button"
              onClick={addTransfer}
              className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {transfers.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <select
                  value={t.destination}
                  onChange={(e) => updateTransfer(i, 'destination', e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select destination</option>
                  {BANK_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="relative w-36">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{'฿'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={t.amount || ''}
                    onChange={(e) => updateTransfer(i, 'amount', Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0.00"
                  />
                </div>
                {transfers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTransfer(i)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tables & To-Go */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Service Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Tables Served</label>
              <input
                type="number"
                min="0"
                step="1"
                value={tablesServed}
                onChange={(e) => setTablesServed(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">To-Go Orders</label>
              <input
                type="number"
                min="0"
                step="1"
                value={togoOrders}
                onChange={(e) => setTogoOrders(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* POS Image Upload */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">POS Sales Report Photo</h2>
          <p className="mb-3 text-xs text-muted-foreground">Take a photo or upload the end-of-day POS report for record keeping.</p>
          {posImage ? (
            <div className="relative">
              <img src={posImage} alt="POS report" className="max-h-64 rounded-lg object-contain" />
              <button
                type="button"
                onClick={() => setPosImage(null)}
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
                {uploading ? 'Uploading...' : 'Click to upload or take photo'}
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

        {/* Weather Widget */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Weather Today</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWeather(w.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                  weather === w.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <Image src={w.icon} alt={w.label} width={48} height={48} />
                <span className="text-xs font-medium text-foreground">{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Busiest Times Widget */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-base font-semibold text-foreground">Busiest Time(s)?</h2>
          <p className="mb-4 text-xs text-muted-foreground">Select all that apply</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIME_OPTIONS.map((t) => {
              const isSelected = busiestTimes.includes(t.value)
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleBusiestTime(t.value)}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute right-2 top-2 rounded-full bg-primary p-0.5">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <Image src={t.icon} alt={t.label} width={48} height={48} />
                  <span className="text-xs font-medium text-foreground">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved Successfully!' : 'Submit Sales Report'}
        </button>
      </form>
    </div>
  )
}
