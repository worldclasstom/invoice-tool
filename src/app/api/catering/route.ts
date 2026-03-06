import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

/* ──────────────────────────────────────────────────────────────
   Generate quotation number: QT-YYYY-MM-NNN
   ────────────────────────────────────────────────────────────── */
async function generateQuotationNumber(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: existing } = await supabase
    .from('catering_quotation_numbers')
    .select('sequence')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .order('sequence', { ascending: false })
    .limit(1)

  const nextSeq = (existing && existing.length > 0) ? existing[0].sequence + 1 : 1
  const quotationNumber = `QT-${year}-${String(month).padStart(2, '0')}-${String(nextSeq).padStart(3, '0')}`

  await supabase.from('catering_quotation_numbers').insert({
    user_id: userId,
    quotation_number: quotationNumber,
    year,
    month,
    sequence: nextSeq,
  })

  return quotationNumber
}

/* ──────────────────────────────────────────────────────────────
   HTML template generator
   ────────────────────────────────────────────────────────────── */
function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface QuotationData {
  quotationNumber: string
  shopName: string
  quoterName: string
  taxId: string
  shopAddress: string
  shopPhone: string
  shopEmail: string
  customerName: string
  customerAddress: string
  customerPhone: string
  customerEmail: string
  eventLocation: string
  eventDate: string
  guestCount: number
  items: Array<{ name: string; detail: string; quantity: number; quantityLabel: string; unitPrice: number }>
  menuCategories: Array<{ category: string; items: string }>
  subtotal: number
  vat: number
  vatRate: number
  grandTotal: number
  depositPercent: number
  minGuests: number
  paymentNotes: string
}

function buildHTML(data: QuotationData): string {
  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
  const depositAmount = data.depositPercent ? Math.round(data.grandTotal * (data.depositPercent / 100) * 100) / 100 : 0
  const remainingAmount = data.grandTotal - depositAmount

  const itemsHTML = data.items.map((it, i) => `
    <tr class="${i % 2 === 0 ? '' : 'alt'}">
      <td class="center">${i + 1}</td>
      <td>${it.name || ''}</td>
      <td>${it.detail || ''}</td>
      <td class="center">${it.quantityLabel || it.quantity}</td>
      <td class="right">${fmtNum(it.unitPrice)}</td>
      <td class="right">${fmtNum(it.quantity * it.unitPrice)}</td>
    </tr>
  `).join('')

  const menuHTML = data.menuCategories?.filter(c => c.category || c.items).map(c => `
    <tr>
      <td style="width:25%; font-weight:600; color:#4a7c59;">${c.category || ''}</td>
      <td>${c.items || ''}</td>
    </tr>
  `).join('') || ''

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', sans-serif; font-size: 11px; color: #1f2937; background: #fff; padding: 30px 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4a7c59; padding-bottom: 15px; margin-bottom: 20px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 55px; height: 55px; object-fit: contain; }
    .brand-name { font-size: 16px; font-weight: 700; color: #4a7c59; }
    .brand-name-th { font-size: 11px; color: #6b7280; }
    .header-right { text-align: right; }
    .title { font-size: 22px; font-weight: 700; color: #4a7c59; }
    .subtitle { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .info-row { display: flex; gap: 30px; margin-bottom: 20px; }
    .info-col { flex: 1; }
    .section-title { font-size: 12px; font-weight: 700; color: #4a7c59; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin-bottom: 8px; }
    .info-text { font-size: 10px; color: #374151; margin-bottom: 3px; }
    .info-bold { font-weight: 600; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #4a7c59; color: #fff; font-weight: 600; font-size: 10px; padding: 8px 6px; text-align: left; }
    td { padding: 6px; font-size: 10px; border-bottom: 1px solid #e5e7eb; }
    tr.alt { background: #f8faf8; }
    .center { text-align: center; }
    .right { text-align: right; }
    .menu-table th { background: #f0f4f0; color: #4a7c59; }
    .bottom-row { display: flex; gap: 30px; margin-bottom: 25px; }
    .payment-terms { flex: 1; }
    .summary-box { width: 200px; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; background: #fafafa; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; }
    .summary-divider { border-top: 2px solid #4a7c59; margin: 8px 0; }
    .summary-total { font-weight: 700; color: #4a7c59; font-size: 12px; }
    .signatures { display: flex; justify-content: space-around; margin: 40px 0 30px 0; }
    .sig-block { text-align: center; }
    .sig-line { width: 140px; border-bottom: 1px solid #9ca3af; margin-bottom: 8px; height: 50px; }
    .sig-label { font-size: 10px; color: #6b7280; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; font-size: 9px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="https://invoice-tool-eta.vercel.app/images/madre-logo.png" class="logo" alt="Logo" />
      <div>
        <div class="brand-name">Madre Cafe & Restaurant</div>
        <div class="brand-name-th">ร้านอาหาร ตำราแม่</div>
      </div>
    </div>
    <div class="header-right">
      <div class="title">ใบเสนอราคา</div>
      <div class="subtitle">Catering Quotation</div>
      <div class="subtitle">เลขที่: ${data.quotationNumber}</div>
      <div class="subtitle">วันที่: ${today}</div>
    </div>
  </div>

  <div class="info-row">
    <div class="info-col">
      <div class="section-title">ข้อมูลร้านค้า</div>
      ${data.shopName ? `<div class="info-text info-bold">${data.shopName}</div>` : ''}
      ${data.quoterName ? `<div class="info-text">ผู้เสนอราคา: ${data.quoterName}</div>` : ''}
      ${data.taxId ? `<div class="info-text">เลขประจำตัวผู้เสียภาษี: ${data.taxId}</div>` : ''}
      ${data.shopAddress ? `<div class="info-text">${data.shopAddress}</div>` : ''}
      ${data.shopPhone ? `<div class="info-text">โทร: ${data.shopPhone}</div>` : ''}
      ${data.shopEmail ? `<div class="info-text">อีเมล: ${data.shopEmail}</div>` : ''}
    </div>
    <div class="info-col">
      <div class="section-title">ข้อมูลลูกค้า / งาน</div>
      ${data.customerName ? `<div class="info-text info-bold">${data.customerName}</div>` : ''}
      ${data.customerAddress ? `<div class="info-text">${data.customerAddress}</div>` : ''}
      ${data.customerPhone ? `<div class="info-text">โทร: ${data.customerPhone}</div>` : ''}
      ${data.customerEmail ? `<div class="info-text">อีเมล: ${data.customerEmail}</div>` : ''}
      ${data.eventLocation ? `<div class="info-text">สถานที่จัดงาน: ${data.eventLocation}</div>` : ''}
      ${data.eventDate ? `<div class="info-text">วันที่จัดงาน: ${data.eventDate}</div>` : ''}
      ${data.guestCount ? `<div class="info-text">จำนวนคน: ${data.guestCount} คน</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width:6%">#</th>
        <th style="width:22%">รายการ</th>
        <th style="width:30%">รายละเอียด</th>
        <th class="center" style="width:12%">จำนวน</th>
        <th class="right" style="width:15%">ราคา/หน่วย</th>
        <th class="right" style="width:15%">รวม (บาท)</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  ${menuHTML ? `
  <div class="section-title">รายการเมนูอาหาร</div>
  <table class="menu-table">
    <thead><tr><th>หมวด</th><th>รายการเมนู</th></tr></thead>
    <tbody>${menuHTML}</tbody>
  </table>
  ` : ''}

  <div class="bottom-row">
    <div class="payment-terms">
      <div class="section-title">เงื่อนไขการชำระเงิน</div>
      ${data.depositPercent > 0 ? `<div class="info-text">- มัดจำ ${data.depositPercent}% : ${fmtNum(depositAmount)} บาท ก่อนวันงาน</div>` : ''}
      ${data.depositPercent > 0 ? `<div class="info-text">- ชำระเงินส่วนที่เหลือ ${fmtNum(remainingAmount)} บาท ในวันจัดงาน</div>` : ''}
      ${data.depositPercent === 0 ? `<div class="info-text">- ชำระเงินในวันจัดงาน</div>` : ''}
      ${data.minGuests > 0 ? `<div class="info-text">- ราคานี้สำหรับขั้นต่ำ ${data.minGuests} คน</div>` : ''}
      ${data.paymentNotes ? `<div class="info-text">- ${data.paymentNotes}</div>` : ''}
    </div>
    <div class="summary-box">
      <div class="summary-row"><span>ราคารวม</span><span>${fmtNum(data.subtotal)} บาท</span></div>
      ${data.vatRate > 0 ? `<div class="summary-row"><span>VAT ${data.vatRate}%</span><span>${fmtNum(data.vat)} บาท</span></div>` : ''}
      <div class="summary-divider"></div>
      <div class="summary-row summary-total"><span>ยอดรวมสุทธิ</span><span>${fmtNum(data.grandTotal)} บาท</span></div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้เสนอราคา (ร้านอาหาร)</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ (ลูกค้า)</div></div>
  </div>

  <div class="footer">Madre Cafe & Restaurant | ร้านอาหาร ตำราแม่</div>
</body>
</html>`
}

/* ──────────────────────────────────────────────────────────────
   PDF generation via Puppeteer
   ────────────────────────────────────────────────────────────── */
async function generatePDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true })
  await browser.close()
  return Buffer.from(pdfBuffer)
}

/* ──────────────────────────────────────────────────────────────
   POST handler
   ────────────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      shopName, quoterName, taxId, shopAddress, shopPhone, shopEmail,
      customerName, customerAddress, customerPhone, customerEmail,
      eventLocation, eventDate, guestCount,
      items, menuCategories,
      vatPercent, depositPercent, minGuests, paymentNotes,
      isExample = false,
    } = body

    // Generate quotation number
    let quotationNumber: string
    if (isExample) {
      quotationNumber = 'QT-ตัวอย่าง'
    } else {
      quotationNumber = await generateQuotationNumber(supabase, user.id)
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, it: { quantity: number; unitPrice: number }) =>
      sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)
    const vatRate = Number(vatPercent) || 0
    const vat = Math.round(subtotal * (vatRate / 100) * 100) / 100
    const grandTotal = subtotal + vat

    // Build HTML and generate PDF
    const html = buildHTML({
      quotationNumber,
      shopName: shopName || '',
      quoterName: quoterName || '',
      taxId: taxId || '',
      shopAddress: shopAddress || '',
      shopPhone: shopPhone || '',
      shopEmail: shopEmail || '',
      customerName: customerName || '',
      customerAddress: customerAddress || '',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      eventLocation: eventLocation || '',
      eventDate: eventDate || '',
      guestCount: guestCount || 0,
      items: items || [],
      menuCategories: menuCategories || [],
      subtotal,
      vat,
      vatRate,
      grandTotal,
      depositPercent: depositPercent || 0,
      minGuests: minGuests || 0,
      paymentNotes: paymentNotes || '',
    })

    const pdfBuffer = await generatePDF(html)
    const base64Pdf = pdfBuffer.toString('base64')

    return NextResponse.json({ pdf: base64Pdf, quotationNumber })

  } catch (error) {
    console.error('[CATERING PDF ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF', details: String(error) }, { status: 500 })
  }
}
