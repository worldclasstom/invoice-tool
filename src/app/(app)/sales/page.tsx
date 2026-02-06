'use client'

import { useState, useEffect } from 'react'
import { formatBaht } from '@/lib/utils'
import { Upload, Camera, Plus, Trash2, Check, Clock, CalendarDays } from 'lucide-react'
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

interface CreditCardDetail {
  nickname: string
  amount: number
}

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
  const [creditCards, setCreditCards] = useState<CreditCardDetail[]>([
    { nickname: '', amount: 0 },
  ])

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

  const creditCardTotal = creditCards.reduce((sum, c) => sum + Number(c.amount || 0), 0)

  const total =
    Number(cashAmount || 0) +
    Number(promptpayAmount || 0) +
    creditCardTotal

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

  const addCreditCard = () => {
    setCreditCards([...creditCards, { nickname: '', amount: 0 }])
  }

  const removeCreditCard = (index: number) => {
    setCreditCards(creditCards.filter((_, i) => i !== index))
  }

  const updateCreditCard = (index: number, field: keyof CreditCardDetail, value: string | number) => {
    const updated = [...creditCards]
    updated[index] = { ...updated[index], [field]: value }
    setCreditCards(updated)
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
          creditCardAmount: creditCardTotal,
          creditCardDetails: creditCards.filter((c) => c.amount > 0),
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
    <div className="mx-auto max-w-2xl">
      {/* Header with live date/time */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-primary p-5 shadow-lg shadow-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Daily Sales Report</h1>
            <p className="mt-1 text-sm font-medium text-primary-foreground/80">{thaiDate}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-primary-foreground/15 px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-primary-foreground/70" />
            <span className="text-sm font-mono font-semibold tabular-nums text-primary-foreground">{thaiTime}</span>
          </div>
        </div>
        {/* Date Picker */}
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary-foreground/10 px-3 py-2.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary-foreground/70" />
          <label className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wide">Report Date</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => {
              const newDate = e.target.value
              setReportDate(newDate)
              // Update the display date to match the selected date
              const selected = new Date(newDate + 'T12:00:00')
              const displayStr = selected.toLocaleDateString('th-TH', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })
              setThaiDate(displayStr)
            }}
            className="ml-auto rounded-lg border-0 bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground/30 [color-scheme:dark]"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Payment Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">Payments Received</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Cash', value: cashAmount, setter: setCashAmount, color: 'border-l-emerald-500' },
              { label: 'PromptPay (QR)', value: promptpayAmount, setter: setPromptpayAmount, color: 'border-l-sky-500' },
            ].map((field) => (
              <div key={field.label} className={`flex items-center gap-3 rounded-xl border border-border bg-background p-3 border-l-4 ${field.color}`}>
                <span className="flex-1 text-sm font-medium text-foreground">{field.label}</span>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{'฿'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    className="w-full rounded-lg border-0 bg-transparent py-1 pl-6 pr-2 text-right text-sm font-semibold text-foreground focus:outline-none focus:ring-0"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}

            {/* Credit Cards with nicknames */}
            <div className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-background p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Credit Cards</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{formatBaht(creditCardTotal)}</span>
                  <button
                    type="button"
                    onClick={addCreditCard}
                    className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {creditCards.map((card, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                    <input
                      type="text"
                      value={card.nickname}
                      onChange={(e) => updateCreditCard(i, 'nickname', e.target.value)}
                      className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                      placeholder={`Card ${i + 1} nickname`}
                    />
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{'฿'}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={card.amount || ''}
                        onChange={(e) => updateCreditCard(i, 'amount', Number(e.target.value))}
                        className="w-full rounded-md border-0 bg-transparent py-1 pl-5 pr-2 text-right text-sm font-semibold text-foreground focus:outline-none focus:ring-0"
                        placeholder="0.00"
                      />
                    </div>
                    {creditCards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCreditCard(i)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
            <span className="text-sm font-bold text-primary">Total</span>
            <span className="text-xl font-bold text-primary">{formatBaht(total)}</span>
          </div>
        </div>

        {/* Money Transfers */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Money Transfers</h2>
            <button
              type="button"
              onClick={addTransfer}
              className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {transfers.map((t, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center">
                <select
                  value={t.destination}
                  onChange={(e) => updateTransfer(i, 'destination', e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select destination</option>
                  {BANK_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-28 sm:flex-none">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{'฿'}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={t.amount || ''}
                      onChange={(e) => updateTransfer(i, 'amount', Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-card py-2 pl-6 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0.00"
                    />
                  </div>
                  {transfers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTransfer(i)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tables & To-Go */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-foreground">Service Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background p-3 text-center">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tables Served</label>
              <input
                type="number"
                min="0"
                step="1"
                value={tablesServed}
                onChange={(e) => setTablesServed(e.target.value)}
                className="w-full bg-transparent text-center text-2xl font-bold text-foreground focus:outline-none"
                placeholder="0"
              />
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-center">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">To-Go Orders</label>
              <input
                type="number"
                min="0"
                step="1"
                value={togoOrders}
                onChange={(e) => setTogoOrders(e.target.value)}
                className="w-full bg-transparent text-center text-2xl font-bold text-foreground focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* POS Image Upload */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-foreground">POS Sales Report Photo</h2>
          <p className="mb-3 text-xs text-muted-foreground">Snap a photo of the end-of-day POS report</p>
          {posImage ? (
            <div className="relative">
              <img src={posImage} alt="POS report" className="max-h-52 rounded-xl object-contain" />
              <button
                type="button"
                onClick={() => setPosImage(null)}
                className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 shadow-md hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-8 transition-all hover:border-primary/50 hover:bg-primary/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <Upload className="h-5 w-5 text-accent" />
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {uploading ? 'Uploading...' : 'Tap to upload or take photo'}
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">Weather Today</h2>
          <div className="grid grid-cols-4 gap-2">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWeather(w.value)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 transition-all duration-200 ${
                  weather === w.value
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/10 scale-[1.02]'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-secondary'
                }`}
              >
                <Image src={w.icon} alt={w.label} width={44} height={44} />
                <span className="text-[11px] font-semibold text-foreground">{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Busiest Times Widget */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-foreground">Busiest Time(s)?</h2>
          <p className="mb-4 text-xs text-muted-foreground">Select all that apply</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIME_OPTIONS.map((t) => {
              const isSelected = busiestTimes.includes(t.value)
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleBusiestTime(t.value)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-md shadow-primary/10 scale-[1.02]'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-secondary'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <Image src={t.icon} alt={t.label} width={44} height={44} />
                  <span className="text-[11px] font-semibold text-foreground">{t.label}</span>
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
          className={`rounded-2xl px-6 py-4 text-sm font-bold shadow-lg transition-all duration-200 disabled:opacity-50 ${
            saved
              ? 'bg-emerald-500 text-white shadow-emerald-500/25'
              : 'bg-primary text-primary-foreground shadow-primary/25 hover:brightness-110'
          }`}
        >
          {saving ? 'Saving...' : saved ? 'Saved Successfully!' : 'Submit Sales Report'}
        </button>
      </form>
    </div>
  )
}
