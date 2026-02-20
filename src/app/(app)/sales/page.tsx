'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatBaht } from '@/lib/utils'
import { Upload, Camera, Plus, Trash2, Check, Clock, CalendarDays, ChevronLeft, ChevronRight, Pencil, AlertCircle } from 'lucide-react'
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
  nickname: string
  amount: number
}

/** Get today's date string (YYYY-MM-DD) in Thailand timezone */
function getThaiToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

/** Get a date offset from today in Thailand timezone */
function getThaiDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

/** Format a date string to Thai display */
function formatThaiDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export default function SalesPage() {
  const [thaiTime, setThaiTime] = useState('')
  const [reportDate, setReportDate] = useState(getThaiToday)

  const [cashAmount, setCashAmount] = useState('')
  const [promptpayAmount, setPromptpayAmount] = useState('')
  const [creditCardAmount, setCreditCardAmount] = useState('')

  const [tablesServed, setTablesServed] = useState('')
  const [togoOrders, setTogoOrders] = useState('')

  const [transfers, setTransfers] = useState<TransferDetail[]>([
    { destination: '', nickname: '', amount: 0 },
  ])

  const [posImage, setPosImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [weather, setWeather] = useState('')
  const [busiestTimes, setBusiestTimes] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isExisting, setIsExisting] = useState(false)
  const [loading, setLoading] = useState(false)

  // Nickname suggestions
  interface NicknameSuggestion {
    nickname: string
    destination: string
  }
  const [nicknameSuggestions, setNicknameSuggestions] = useState<NicknameSuggestion[]>([])
  const [activeNicknameIndex, setActiveNicknameIndex] = useState<number | null>(null)
  const [nicknameQuery, setNicknameQuery] = useState('')
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const thaiToday = getThaiToday()
  const thaiDate = formatThaiDisplay(reportDate)
  const isToday = reportDate === thaiToday

  // Fetch nickname suggestions once on mount
  useEffect(() => {
    async function fetchNicknames() {
      try {
        const res = await fetch('/api/sales/nicknames')
        const data = await res.json()
        if (data.suggestions) setNicknameSuggestions(data.suggestions)
      } catch {
        // silently fail
      }
    }
    fetchNicknames()
  }, [])

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setActiveNicknameIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSuggestions = nicknameSuggestions.filter((s) =>
    s.nickname.toLowerCase().includes(nicknameQuery.toLowerCase())
  )

  const selectNickname = (index: number, suggestion: NicknameSuggestion) => {
    const updated = [...transfers]
    updated[index] = {
      ...updated[index],
      nickname: suggestion.nickname,
      destination: suggestion.destination || updated[index].destination,
    }
    setTransfers(updated)
    setActiveNicknameIndex(null)
    setNicknameQuery('')
  }

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      setThaiTime(
        new Date().toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const resetForm = useCallback(() => {
    setCashAmount('')
    setPromptpayAmount('')
    setCreditCardAmount('')
    setTablesServed('')
    setTogoOrders('')
    setTransfers([{ destination: '', nickname: '', amount: 0 }])
    setPosImage(null)
    setWeather('')
    setBusiestTimes([])
    setSaved(false)
    setIsExisting(false)
  }, [])

  // Load existing data when date changes
  const loadExistingReport = useCallback(async (date: string) => {
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/sales?date=${date}`)
      const { sale } = await res.json()
      if (sale) {
        setCashAmount(sale.cash_amount > 0 ? String(sale.cash_amount) : '')
        setPromptpayAmount(sale.promptpay_amount > 0 ? String(sale.promptpay_amount) : '')
        setCreditCardAmount(sale.credit_card_amount > 0 ? String(sale.credit_card_amount) : '')
        setTablesServed(sale.tables_served > 0 ? String(sale.tables_served) : '')
        setTogoOrders(sale.togo_orders > 0 ? String(sale.togo_orders) : '')
        setWeather(sale.weather || '')
        setBusiestTimes(sale.busiest_times || [])
        setPosImage(sale.pos_image_url || null)
        setTransfers(
          sale.transfer_details?.length > 0
            ? sale.transfer_details
            : [{ destination: '', nickname: '', amount: 0 }]
        )
        setIsExisting(true)
      } else {
        resetForm()
      }
    } catch {
      resetForm()
    }
    setLoading(false)
  }, [resetForm])

  useEffect(() => {
    loadExistingReport(reportDate)
  }, [reportDate, loadExistingReport])

  const total =
    Number(cashAmount || 0) +
    Number(promptpayAmount || 0) +
    Number(creditCardAmount || 0)

  const transferTotal = transfers.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const remaining = Math.round((total - transferTotal) * 100) / 100
  const isBalanced = total > 0 && remaining === 0

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
    setTransfers([...transfers, { destination: '', nickname: '', amount: 0 }])
  }

  const removeTransfer = (index: number) => {
    setTransfers(transfers.filter((_, i) => i !== index))
  }

  const updateTransfer = (index: number, field: keyof TransferDetail, value: string | number) => {
    const updated = [...transfers]
    updated[index] = { ...updated[index], [field]: value }
    setTransfers(updated)
  }

  const navigateDate = (offset: number) => {
    const d = new Date(reportDate + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setReportDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }))
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
      setIsExisting(true)
      // Refresh nickname suggestions so new ones are available immediately
      fetch('/api/sales/nicknames')
        .then((r) => r.json())
        .then((d) => { if (d.suggestions) setNicknameSuggestions(d.suggestions) })
        .catch(() => {})
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
            <span className="font-mono text-sm font-semibold tabular-nums text-primary-foreground">{thaiTime}</span>
          </div>
        </div>

        {/* Date navigation */}
        <div className="mt-4 flex flex-col gap-2.5">
          {/* Quick date buttons */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Today', date: getThaiToday() },
              { label: 'Yesterday', date: getThaiDateOffset(-1) },
              { label: '2 days ago', date: getThaiDateOffset(-2) },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setReportDate(opt.date)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  reportDate === opt.date
                    ? 'bg-primary-foreground text-primary shadow-md'
                    : 'bg-primary-foreground/15 text-primary-foreground/80 hover:bg-primary-foreground/25'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date picker row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateDate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/25"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary-foreground/70" />
              <input
                type="date"
                value={reportDate}
                max={thaiToday}
                onChange={(e) => setReportDate(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-primary-foreground focus:outline-none [color-scheme:dark]"
              />
            </div>
            <button
              type="button"
              onClick={() => navigateDate(1)}
              disabled={isToday}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/25 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Existing report indicator */}
      {isExisting && !loading && (
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Pencil className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">
            A report already exists for this date. Your changes will update the existing report.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading report...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Payment Inputs */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-foreground">Payments Received</h2>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Cash', value: cashAmount, setter: setCashAmount, color: 'border-l-emerald-500' },
                { label: 'PromptPay (QR)', value: promptpayAmount, setter: setPromptpayAmount, color: 'border-l-sky-500' },
                { label: 'Credit Cards', value: creditCardAmount, setter: setCreditCardAmount, color: 'border-l-amber-500' },
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
                <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
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
                    {transfers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTransfer(i)}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1" ref={activeNicknameIndex === i ? suggestionsRef : undefined}>
                      <input
                        type="text"
                        value={t.nickname}
                        onChange={(e) => {
                          updateTransfer(i, 'nickname', e.target.value)
                          setNicknameQuery(e.target.value)
                          setActiveNicknameIndex(e.target.value.length > 0 ? i : null)
                        }}
                        onFocus={() => {
                          if (t.nickname.length > 0) {
                            setNicknameQuery(t.nickname)
                            setActiveNicknameIndex(i)
                          } else if (nicknameSuggestions.length > 0) {
                            setNicknameQuery('')
                            setActiveNicknameIndex(i)
                          }
                        }}
                        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Nickname (e.g. John's card)"
                        autoComplete="off"
                      />
                      {activeNicknameIndex === i && (nicknameQuery === '' ? nicknameSuggestions : filteredSuggestions).length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                          {(nicknameQuery === '' ? nicknameSuggestions : filteredSuggestions).map((s, si) => (
                            <button
                              key={si}
                              type="button"
                              onClick={() => selectNickname(i, s)}
                              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent first:rounded-t-xl last:rounded-b-xl"
                            >
                              <span className="font-medium text-foreground">{s.nickname}</span>
                              {s.destination && (
                                <span className="ml-2 text-xs text-muted-foreground">{s.destination}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative w-28 shrink-0">
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
                  </div>
                </div>
              ))}
            </div>

            {/* Transfer balance status */}
            <div className={`mt-4 rounded-xl px-4 py-3 ${
              total === 0
                ? 'bg-muted/50'
                : isBalanced
                  ? 'bg-emerald-500/10'
                  : remaining > 0
                    ? 'bg-amber-500/10'
                    : 'bg-destructive/10'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transferred</span>
                <span className="text-sm font-bold text-foreground">{formatBaht(transferTotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isBalanced ? 'Status' : remaining > 0 ? 'Remaining' : 'Over by'}
                </span>
                <span className={`text-sm font-bold ${
                  total === 0
                    ? 'text-muted-foreground'
                    : isBalanced
                      ? 'text-emerald-600'
                      : remaining > 0
                        ? 'text-amber-600'
                        : 'text-destructive'
                }`}>
                  {total === 0
                    ? 'Enter payments first'
                    : isBalanced
                      ? 'All funds accounted for'
                      : formatBaht(Math.abs(remaining))}
                </span>
              </div>
            </div>
          </div>

          {/* Tables & To-Go */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-foreground">Service Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background p-3 text-center">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tables Served</label>
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
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">To-Go Orders</label>
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
            {posImage && (
              <div className="relative mb-3">
                <img src={posImage} alt="POS report" className="max-h-52 rounded-xl object-contain" />
                <button
                  type="button"
                  onClick={() => setPosImage(null)}
                  className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 shadow-md hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            )}
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6 transition-all hover:border-primary/50 hover:bg-primary/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <Upload className="h-5 w-5 text-accent" />
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {uploading ? 'Uploading...' : posImage ? 'Tap to replace photo' : 'Tap to upload or take photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="sr-only"
                disabled={uploading}
              />
            </label>
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
            <h2 className="mb-1 text-sm font-bold text-foreground">{'Busiest Time(s)?'}</h2>
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
            disabled={saving || !isBalanced}
            className={`rounded-2xl px-6 py-4 text-sm font-bold shadow-lg transition-all duration-200 disabled:opacity-50 ${
              saved
                ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                : 'bg-primary text-primary-foreground shadow-primary/25 hover:brightness-110'
            }`}
          >
            {saving
              ? 'Saving...'
              : saved
                ? 'Saved Successfully!'
                : !isBalanced && total > 0
                  ? 'All funds must be transferred before submitting'
                  : isExisting
                    ? 'Update Sales Report'
                    : 'Submit Sales Report'}
          </button>

          {/* Duplicate warning */}
          {!isBalanced && total > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Make sure all funds are accounted for in the transfers section before submitting. The total transferred must match the total payments received.
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
