import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

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

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function generateHTML(data: {
  quotationNumber: string
  shopName: string
  quoterName: string
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
}): string {
  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
  
  const itemsHTML = data.items.map((item, i) => `
    <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8faf8'};">
      <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${item.detail || ''}</td>
      <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.quantityLabel || item.quantity}</td>
      <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">${fmtNum(item.unitPrice)}</td>
      <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">${fmtNum(item.quantity * item.unitPrice)}</td>
    </tr>
  `).join('')

  const menuHTML = data.menuCategories?.filter(c => c.category || c.items).map(cat => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${cat.category}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${cat.items}</td>
    </tr>
  `).join('') || ''

  const depositAmount = data.depositPercent ? Math.round(data.grandTotal * (data.depositPercent / 100) * 100) / 100 : 0
  const remainingAmount = data.grandTotal - depositAmount

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Sarabun', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      padding: 35px 45px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #4a7c59;
    }
    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .brand-name {
      color: #4a7c59;
      font-size: 18px;
      font-weight: 700;
    }
    .brand-sub {
      color: #6b7280;
      font-size: 12px;
      margin-top: 2px;
    }
    .title-section {
      text-align: right;
    }
    .title {
      color: #4a7c59;
      font-size: 24px;
      font-weight: 700;
    }
    .title-en {
      color: #6b7280;
      font-size: 11px;
      margin-top: 3px;
    }
    .title-info {
      color: #6b7280;
      font-size: 11px;
      margin-top: 3px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 25px;
    }
    .info-section h3 {
      color: #4a7c59;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 5px;
    }
    .info-row {
      margin-bottom: 4px;
      font-size: 11px;
      word-wrap: break-word;
    }
    .info-label {
      color: #6b7280;
    }
    .info-name {
      font-weight: 600;
      color: #1f2937;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #4a7c59;
      color: white;
      padding: 10px 8px;
      font-size: 11px;
      font-weight: 600;
      text-align: left;
    }
    .items-table th:first-child {
      text-align: center;
      width: 35px;
    }
    .items-table th:nth-child(4) {
      text-align: center;
    }
    .items-table th:nth-child(5),
    .items-table th:nth-child(6) {
      text-align: right;
    }
    
    .menu-section {
      margin-bottom: 20px;
    }
    .menu-section h3 {
      color: #4a7c59;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .menu-table th {
      background: #f0f4f0;
      color: #4a7c59;
      padding: 8px;
      font-size: 11px;
      font-weight: 600;
      text-align: left;
    }
    
    .summary-payment-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
      gap: 30px;
    }
    .payment-section {
      flex: 1;
    }
    .payment-section h3 {
      color: #4a7c59;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .payment-item {
      margin-bottom: 5px;
      font-size: 11px;
      color: #4b5563;
    }
    .summary-box {
      width: 260px;
      flex-shrink: 0;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 15px;
      background: #fafafa;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      border-top: 2px solid #4a7c59;
      padding-top: 10px;
      margin-top: 10px;
    }
    .summary-total .label {
      color: #4a7c59;
      font-size: 14px;
      font-weight: 700;
    }
    .summary-total .value {
      color: #4a7c59;
      font-size: 14px;
      font-weight: 700;
    }
    
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 80px;
      margin-top: 50px;
      padding: 0 30px;
    }
    .sig-box {
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #9ca3af;
      width: 200px;
      margin: 0 auto 10px;
      padding-top: 50px;
    }
    .sig-label {
      color: #9ca3af;
      font-size: 11px;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
  <div class="logo-section">
  <img src="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/images/madre-logo.png" alt="Madre Logo" style="width: 70px; height: auto;">
  <div>
  <div class="brand-name">Madre Cafe & Restaurant</div>
  <div class="brand-sub">ร้านอาหาร ตำราแม่</div>
  </div>
  </div>
    <div class="title-section">
      <div class="title">ใบเสนอราคา</div>
      <div class="title-en">Catering Quotation</div>
      <div class="title-info">เลขที่: ${data.quotationNumber}</div>
      <div class="title-info">วันที่: ${today}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-section">
      <h3>ข้อมูลร้านค้า</h3>
      ${data.shopName ? `<div class="info-row info-name">${data.shopName}</div>` : ''}
      ${data.quoterName ? `<div class="info-row">ผู้เสนอราคา: ${data.quoterName}</div>` : ''}
      ${data.shopAddress ? `<div class="info-row">${data.shopAddress}</div>` : ''}
      ${data.shopPhone ? `<div class="info-row">โทร: ${data.shopPhone}</div>` : ''}
      ${data.shopEmail ? `<div class="info-row">อีเมล: ${data.shopEmail}</div>` : ''}
    </div>
    <div class="info-section">
      <h3>ข้อมูลลูกค้า / งาน</h3>
      ${data.customerName ? `<div class="info-row info-name">${data.customerName}</div>` : ''}
      ${data.customerAddress ? `<div class="info-row">${data.customerAddress}</div>` : ''}
      ${data.customerPhone ? `<div class="info-row">โทร: ${data.customerPhone}</div>` : ''}
      ${data.customerEmail ? `<div class="info-row">อีเมล: ${data.customerEmail}</div>` : ''}
      ${data.eventLocation ? `<div class="info-row">สถานที่จัดงาน: ${data.eventLocation}</div>` : ''}
      ${data.eventDate ? `<div class="info-row">วันที่จัดงาน: ${data.eventDate}</div>` : ''}
      ${data.guestCount ? `<div class="info-row">จำนวนคน: ${data.guestCount} คน</div>` : ''}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>รายการ</th>
        <th>รายละเอียด</th>
        <th>จำนวน</th>
        <th>ราคา/หน่วย</th>
        <th>รวม (บาท)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  ${menuHTML ? `
  <div class="menu-section">
    <h3>รายการเมนูอาหาร</h3>
    <table class="menu-table">
      <thead>
        <tr>
          <th style="width: 150px;">หมวด</th>
          <th>รายการเมนู</th>
        </tr>
      </thead>
      <tbody>
        ${menuHTML}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="summary-payment-row">
    <div class="payment-section">
      <h3>เงื่อนไขการชำระเงิน</h3>
      ${data.depositPercent ? `
      <div class="payment-item">- มัดจำ ${data.depositPercent}% : ${fmtNum(depositAmount)} บาท ก่อนวันงาน</div>
      <div class="payment-item">- ชำระเงินส่วนที่เหลือ ${fmtNum(remainingAmount)} บาท ในวันจัดงาน</div>
      ` : `
      <div class="payment-item">- ชำระเงินในวันจัดงาน</div>
      `}
      ${data.minGuests ? `<div class="payment-item">- ราคานี้สำหรับขั้นต่ำ ${data.minGuests} คน</div>` : ''}
      ${data.paymentNotes ? `<div class="payment-item">- ${data.paymentNotes}</div>` : ''}
    </div>
    <div class="summary-box">
      <div class="summary-row">
        <span>ราคารวม</span>
        <span>${fmtNum(data.subtotal)} บาท</span>
      </div>
      ${data.vatRate > 0 ? `
      <div class="summary-row">
        <span>VAT ${data.vatRate}%</span>
        <span>${fmtNum(data.vat)} บาท</span>
      </div>
      ` : ''}
      <div class="summary-total">
        <span class="label">ยอดรวมสุทธิ</span>
        <span class="value">${fmtNum(data.grandTotal)} บาท</span>
      </div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">ผู้เสนอราคา (ร้านอาหาร)</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">ผู้อนุมัติ (ลูกค้า)</div>
    </div>
  </div>

  <div class="footer">
    Madre Cafe & Restaurant | ร้านอาหาร ตำราแม่
  </div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      shopName, quoterName, shopAddress, shopPhone, shopEmail,
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

    // Generate HTML
    const html = generateHTML({
      quotationNumber,
      shopName: shopName || '',
      quoterName: quoterName || '',
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

    // Launch browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '5mm', left: '10mm' },
    })

    await browser.close()

    const base64Pdf = Buffer.from(pdfBuffer).toString('base64')
    return NextResponse.json({ pdf: base64Pdf, quotationNumber })

  } catch (error) {
    console.error('[CATERING PDF ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF', details: String(error) }, { status: 500 })
  }
}
