import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatThaiDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatThaiDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBaht(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Returns today's date in Thailand (Asia/Bangkok) as a YYYY-MM-DD string */
export function getThaiToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

/** Returns the current year/month/day numbers in Bangkok timezone */
export function getBangkokNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? '0')
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** Returns a YYYY-MM-DD string offset by N days from today in Bangkok timezone */
export function getThaiDateOffset(days: number): string {
  // Build today in Bangkok, then shift by days
  const now = new Date()
  // Get Bangkok date parts
  const bkk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  bkk.setDate(bkk.getDate() + days)
  const y = bkk.getFullYear()
  const m = String(bkk.getMonth() + 1).padStart(2, '0')
  const d = String(bkk.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Format a YYYY-MM-DD date string to a full Thai display string
 * e.g. "วันพฤหัสบดีที่ 27 กุมภาพันธ์ 2569"
 * Uses UTC noon to avoid timezone day-shift issues.
 */
export function formatFullThaiDate(dateStr: string): string {
  // Parse as UTC noon so Bangkok (+7) stays on the same calendar day
  const d = new Date(dateStr + 'T00:00:00+07:00')
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Returns an ISO-like timestamp string representing the current time in Thailand */
export function getThaiISOString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}
