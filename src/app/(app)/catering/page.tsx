'use client'

import { useState } from 'react'
import { formatBaht } from '@/lib/utils'
import { Plus, Trash2, UtensilsCrossed, Loader2 } from 'lucide-react'

interface LineItem {
  name: string
  detail: string
  quantity: string
  quantityLabel: string
  unitPrice: string
}

interface MenuCategory {
  category: string
  items: string
}

function toNum(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

export default function CateringQuotationPage() {
  // Shop info
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [shopContact, setShopContact] = useState('')

  // Customer / event info
  const [customerName, setCustomerName] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventDate, setEventDate] = useState(today)
  const [guestCount, setGuestCount] = useState('')

  // Items
  const [items, setItems] = useState<LineItem[]>([
    { name: '', detail: '', quantity: '1', quantityLabel: '', unitPrice: '' },
  ])

  // Menu categories
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([
    { category: '', items: '' },
  ])

  // Summary options
  const [vatEnabled, setVatEnabled] = useState(false)
  const [depositPercent, setDepositPercent] = useState('50')
  const [minGuests, setMinGuests] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [saving, setSaving] = useState(false)

  // Item helpers
  const addItem = () => setItems([...items, { name: '', detail: '', quantity: '1', quantityLabel: '', unitPrice: '' }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof LineItem, val: string) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: val }
    setItems(updated)
  }

  // Menu helpers
  const addMenuCategory = () => setMenuCategories([...menuCategories, { category: '', items: '' }])
  const removeMenuCategory = (i: number) => setMenuCategories(menuCategories.filter((_, idx) => idx !== i))
  const updateMenuCategory = (i: number, field: keyof MenuCategory, val: string) => {
    const updated = [...menuCategories]
    updated[i] = { ...updated[i], [field]: val }
    setMenuCategories(updated)
  }

  const subtotal = items.reduce((s, item) => s + toNum(item.quantity) * toNum(item.unitPrice), 0)
  const vat = vatEnabled ? Math.round(subtotal * 0.07 * 100) / 100 : 0
  const grandTotal = subtotal + vat

  const resetForm = () => {
    setShopName('')
    setShopPhone('')
    setShopContact('')
    setCustomerName('')
    setEventLocation('')
    setEventDate(today)
    setGuestCount('')
    setItems([{ name: '', detail: '', quantity: '1', quantityLabel: '', unitPrice: '' }])
    setMenuCategories([{ category: '', items: '' }])
    setVatEnabled(false)
    setDepositPercent('50')
    setMinGuests('')
    setPaymentNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/catering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          shopPhone,
          shopContact,
          customerName,
          eventLocation,
          eventDate,
          guestCount: toNum(guestCount),
          items: items.map((i) => ({
            name: i.name,
            detail: i.detail,
            quantity: toNum(i.quantity),
            quantityLabel: i.quantityLabel || String(toNum(i.quantity)),
            unitPrice: toNum(i.unitPrice),
          })),
          menuCategories: menuCategories.filter((m) => m.category || m.items),
          vatEnabled,
          depositPercent: toNum(depositPercent),
          minGuests: toNum(minGuests),
          paymentNotes,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate quotation')
      const data = await res.json()

      const byteCharacters = atob(data.pdf)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const pdfBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' })
      window.open(URL.createObjectURL(pdfBlob), '_blank')
    } catch (err) {
      console.error('Error:', err)
      alert('ไม่สามารถสร้างใบเสนอราคาได้ กรุณาลองใหม่อีกครั้ง')
    }
    setSaving(false)
  }

  const inputClass = 'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
  const labelClass = 'mb-1 block text-xs font-semibold text-muted-foreground tracking-wide'

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">ใบเสนอราคาจัดเลี้ยง</h1>
          <p className="text-xs text-muted-foreground">สร้างใบเสนอราคาสำหรับงานจัดเลี้ยง</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:brightness-110"
        >
          <UtensilsCrossed className="h-4 w-4" />
          ใบเสนอราคาใหม่
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* ข้อมูลร้าน */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">ข้อมูลร้านค้า</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>ชื่อร้าน</label>
              <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className={inputClass} placeholder="ชื่อร้านอาหาร / ร้านค้า" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>เบอร์โทร</label>
                <input type="tel" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} className={inputClass} placeholder="เบอร์โทรศัพท์" />
              </div>
              <div>
                <label className={labelClass}>Line / อีเมล</label>
                <input type="text" value={shopContact} onChange={(e) => setShopContact(e.target.value)} className={inputClass} placeholder="ช่องทางติดต่อ" />
              </div>
            </div>
          </div>
        </div>

        {/* ข้อมูลลูกค้าและงาน */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">ข้อมูลลูกค้าและงาน</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>ชื่อลูกค้า *</label>
              <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} placeholder="ชื่อลูกค้า" />
            </div>
            <div>
              <label className={labelClass}>สถานที่จัดงาน</label>
              <input type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className={inputClass} placeholder="สถานที่ / สถานที่จัดงาน" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>วันที่จัดงาน *</label>
                <input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>จำนวนแขก</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={guestCount}
                  onChange={(e) => { if (e.target.value === '' || /^\d*$/.test(e.target.value)) setGuestCount(e.target.value) }}
                  className={inputClass}
                  placeholder="50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* รายการสินค้า/บริการ */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">รายการสินค้าและบริการ</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110">
              <Plus className="h-3.5 w-3.5" />
              เพิ่มรายการ
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {items.map((item, index) => (
              <div key={index} className="rounded-xl border border-border bg-background p-3">
                <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input type="text" required value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="ชื่อรายการ" className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input type="text" value={item.detail} onChange={(e) => updateItem(index, 'detail', e.target.value)} placeholder="รายละเอียด" className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">จำนวน</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={item.quantity}
                      onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) updateItem(index, 'quantity', e.target.value) }}
                      className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">ป้ายจำนวน</label>
                    <input
                      type="text"
                      value={item.quantityLabel}
                      onChange={(e) => updateItem(index, 'quantityLabel', e.target.value)}
                      className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="เช่น 50 คน"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">ราคา/หน่วย</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={item.unitPrice}
                      onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) updateItem(index, 'unitPrice', e.target.value) }}
                      className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">รวม</label>
                    <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-sm font-semibold text-emerald-700">
                      {formatBaht(toNum(item.quantity) * toNum(item.unitPrice))}
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="mt-3 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* หมวดเมนูอาหาร */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">หมวดเมนูอาหาร</h2>
            <button type="button" onClick={addMenuCategory} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110">
              <Plus className="h-3.5 w-3.5" />
              เพิ่มหมวด
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {menuCategories.map((cat, index) => (
              <div key={index} className="flex items-start gap-2 rounded-xl border border-border bg-background p-3">
                <div className="w-1/3">
                  <label className="text-[10px] font-semibold text-muted-foreground">หมวด</label>
                  <input
                    type="text"
                    value={cat.category}
                    onChange={(e) => updateMenuCategory(index, 'category', e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="เช่น อาหารจานหลัก"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">รายการเมนู</label>
                  <input
                    type="text"
                    value={cat.items}
                    onChange={(e) => updateMenuCategory(index, 'items', e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="เช่น ข้าวผัด, ต้มยำกุ้ง"
                  />
                </div>
                {menuCategories.length > 1 && (
                  <button type="button" onClick={() => removeMenuCategory(index)} className="mt-4 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* สรุปราคาและเงื่อนไข */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">สรุปราคาและเงื่อนไขการชำระเงิน</h2>

          {/* VAT toggle */}
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setVatEnabled(!vatEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${vatEnabled ? 'bg-primary' : 'bg-secondary'}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${vatEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-foreground">รวม VAT 7%</span>
          </div>

          {/* Totals */}
          <div className="mb-5 flex justify-end">
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between border-t border-border py-2 text-sm">
                <span className="text-muted-foreground">ราคารวม</span>
                <span className="text-foreground">{formatBaht(subtotal)}</span>
              </div>
              {vatEnabled && (
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">VAT 7%</span>
                  <span className="text-foreground">{formatBaht(vat)}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2.5 text-base font-bold">
                <span className="text-primary">ยอดรวมสุทธิ</span>
                <span className="text-primary">{formatBaht(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* เงื่อนไขการชำระเงิน */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>มัดจำ %</label>
              <input
                type="text"
                inputMode="numeric"
                value={depositPercent}
                onChange={(e) => { if (e.target.value === '' || /^\d*$/.test(e.target.value)) setDepositPercent(e.target.value) }}
                className={inputClass}
                placeholder="50"
              />
            </div>
            <div>
              <label className={labelClass}>จำนวนแขกขั้นต่ำ</label>
              <input
                type="text"
                inputMode="numeric"
                value={minGuests}
                onChange={(e) => { if (e.target.value === '' || /^\d*$/.test(e.target.value)) setMinGuests(e.target.value) }}
                className={inputClass}
                placeholder="30"
              />
            </div>
            <div>
              <label className={labelClass}>หมายเหตุเพิ่มเติม</label>
              <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className={inputClass} placeholder="เงื่อนไขอื่นๆ..." />
            </div>
          </div>
        </div>

        {/* ปุ่มดำเนินการ */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'กำลังสร้าง...' : 'สร้างใบเสนอราคา PDF'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary"
          >
            รีเซ็ต
          </button>
        </div>
      </form>
    </div>
  )
}
