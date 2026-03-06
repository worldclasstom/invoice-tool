import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import fontkit from '@pdf-lib/fontkit'

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

// Colors
const primaryColor = rgb(74/255, 124/255, 89/255) // #4a7c59
const grayColor = rgb(107/255, 114/255, 128/255) // #6b7280
const darkColor = rgb(31/255, 41/255, 55/255) // #1f2937
const lightGrayColor = rgb(229/255, 231/255, 235/255) // #e5e7eb

interface QuotationItem {
  name: string
  detail: string
  quantity: number
  quantityLabel: string
  unitPrice: number
}

interface MenuCategory {
  category: string
  items: string
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
  items: QuotationItem[]
  menuCategories: MenuCategory[]
  subtotal: number
  vat: number
  vatRate: number
  grandTotal: number
  depositPercent: number
  minGuests: number
  paymentNotes: string
}

async function generatePDF(data: QuotationData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // Load Thai font
  const fontPath = path.join(process.cwd(), 'public/fonts/Sarabun-Regular.ttf')
  const fontBoldPath = path.join(process.cwd(), 'public/fonts/Sarabun-SemiBold.ttf')
  
  const fontBytes = fs.readFileSync(fontPath)
  const fontBoldBytes = fs.readFileSync(fontBoldPath)
  const thaiFont = await pdfDoc.embedFont(fontBytes)
  const thaiFontBold = await pdfDoc.embedFont(fontBoldBytes)

  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const margin = 40
  let y = height - margin

  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })

  // ─── HEADER ───
  // Brand name on left
  page.drawText('Madre Cafe & Restaurant', {
    x: margin,
    y: y - 5,
    size: 16,
    font: thaiFontBold,
    color: primaryColor,
  })
  page.drawText('ร้านอาหาร ตำราแม่', {
    x: margin,
    y: y - 22,
    size: 10,
    font: thaiFont,
    color: grayColor,
  })

  // Title on right
  page.drawText('ใบเสนอราคา', {
    x: width - margin - 100,
    y: y - 5,
    size: 22,
    font: thaiFontBold,
    color: primaryColor,
  })
  page.drawText('Catering Quotation', {
    x: width - margin - 100,
    y: y - 22,
    size: 9,
    font: thaiFont,
    color: grayColor,
  })
  page.drawText(`เลขที่: ${data.quotationNumber}`, {
    x: width - margin - 100,
    y: y - 36,
    size: 9,
    font: thaiFont,
    color: grayColor,
  })
  page.drawText(`วันที่: ${today}`, {
    x: width - margin - 100,
    y: y - 50,
    size: 9,
    font: thaiFont,
    color: grayColor,
  })

  // Header line
  y -= 65
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: primaryColor,
  })

  // ─── INFO SECTION ───
  y -= 25
  const colMid = width / 2

  // Shop info (left)
  page.drawText('ข้อมูลร้านค้า', {
    x: margin,
    y,
    size: 11,
    font: thaiFontBold,
    color: primaryColor,
  })

  // Customer info (right)
  page.drawText('ข้อมูลลูกค้า / งาน', {
    x: colMid + 10,
    y,
    size: 11,
    font: thaiFontBold,
    color: primaryColor,
  })

  y -= 5
  page.drawLine({
    start: { x: margin, y },
    end: { x: colMid - 10, y },
    thickness: 0.5,
    color: lightGrayColor,
  })
  page.drawLine({
    start: { x: colMid + 10, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: lightGrayColor,
  })

  y -= 14
  const infoSize = 9
  const lineHeight = 13

  // Shop details
  let shopY = y
  if (data.shopName) {
    page.drawText(data.shopName, { x: margin, y: shopY, size: infoSize, font: thaiFontBold, color: darkColor })
    shopY -= lineHeight
  }
  if (data.quoterName) {
    page.drawText(`ผู้เสนอราคา: ${data.quoterName}`, { x: margin, y: shopY, size: infoSize, font: thaiFont, color: darkColor })
    shopY -= lineHeight
  }
  if (data.taxId) {
    page.drawText(`เลขประจำตัวผู้เสียภาษี: ${data.taxId}`, { x: margin, y: shopY, size: infoSize, font: thaiFont, color: darkColor })
    shopY -= lineHeight
  }
  if (data.shopAddress) {
    page.drawText(data.shopAddress, { x: margin, y: shopY, size: infoSize, font: thaiFont, color: darkColor })
    shopY -= lineHeight
  }
  if (data.shopPhone) {
    page.drawText(`โทร: ${data.shopPhone}`, { x: margin, y: shopY, size: infoSize, font: thaiFont, color: darkColor })
    shopY -= lineHeight
  }
  if (data.shopEmail) {
    page.drawText(`อีเมล: ${data.shopEmail}`, { x: margin, y: shopY, size: infoSize, font: thaiFont, color: darkColor })
  }

  // Customer details
  let custY = y
  if (data.customerName) {
    page.drawText(data.customerName, { x: colMid + 10, y: custY, size: infoSize, font: thaiFontBold, color: darkColor })
    custY -= lineHeight
  }
  if (data.customerAddress) {
    page.drawText(data.customerAddress, { x: colMid + 10, y: custY, size: infoSize, font: thaiFont, color: darkColor })
    custY -= lineHeight
  }
  if (data.customerPhone) {
    page.drawText(`โทร: ${data.customerPhone}`, { x: colMid + 10, y: custY, size: infoSize, font: thaiFont, color: darkColor })
    custY -= lineHeight
  }
  if (data.customerEmail) {
    page.drawText(`อีเมล: ${data.customerEmail}`, { x: colMid + 10, y: custY, size: infoSize, font: thaiFont, color: darkColor })
    custY -= lineHeight
  }
  if (data.eventLocation) {
    page.drawText(`สถานที่จัดงาน: ${data.eventLocation}`, { x: colMid + 10, y: custY, size: infoSize, font: thaiFont, color: darkColor })
    custY -= lineHeight
  }
  if (data.eventDate) {
    page.drawText(`วันที่จัดงาน: ${data.eventDate}`, { x: colMid + 10, y: custY, size: infoSize, font: thaiFont, color: darkColor })
    custY -= lineHeight
  }
  if (data.guestCount) {
    page.drawText(`จำนวนคน: ${data.guestCount} คน`, { x: colMid + 10, y: custY, size: infoSize, font: thaiFont, color: darkColor })
  }

  // ─── ITEMS TABLE ───
  y = Math.min(shopY, custY) - 25

  // Table header
  const tableX = margin
  const tableWidth = width - margin * 2
  const colWidths = [30, 100, 140, 60, 70, 70] // #, รายการ, รายละเอียด, จำนวน, ราคา/หน่วย, รวม
  const headerHeight = 22

  page.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: primaryColor,
  })

  const headerY = y - 15
  let colX = tableX + 5
  const headers = ['#', 'รายการ', 'รายละเอียด', 'จำนวน', 'ราคา/หน่วย', 'รวม (บาท)']
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: colX,
      y: headerY,
      size: 9,
      font: thaiFontBold,
      color: rgb(1, 1, 1),
    })
    colX += colWidths[i]
  })

  // Table rows
  y -= headerHeight
  const rowHeight = 20
  data.items.forEach((item, idx) => {
    const rowY = y - rowHeight
    
    // Alternating row background
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: tableX,
        y: rowY,
        width: tableWidth,
        height: rowHeight,
        color: rgb(248/255, 250/255, 248/255),
      })
    }

    // Row border
    page.drawLine({
      start: { x: tableX, y: rowY },
      end: { x: tableX + tableWidth, y: rowY },
      thickness: 0.5,
      color: lightGrayColor,
    })

    const textY = rowY + 6
    let cx = tableX + 5
    
    page.drawText(String(idx + 1), { x: cx + 10, y: textY, size: 9, font: thaiFont, color: darkColor })
    cx += colWidths[0]
    
    page.drawText(item.name || '', { x: cx, y: textY, size: 9, font: thaiFont, color: darkColor })
    cx += colWidths[1]
    
    page.drawText(item.detail || '', { x: cx, y: textY, size: 9, font: thaiFont, color: darkColor })
    cx += colWidths[2]
    
    page.drawText(item.quantityLabel || String(item.quantity), { x: cx, y: textY, size: 9, font: thaiFont, color: darkColor })
    cx += colWidths[3]
    
    page.drawText(fmtNum(item.unitPrice), { x: cx, y: textY, size: 9, font: thaiFont, color: darkColor })
    cx += colWidths[4]
    
    page.drawText(fmtNum(item.quantity * item.unitPrice), { x: cx, y: textY, size: 9, font: thaiFont, color: darkColor })

    y -= rowHeight
  })

  // ─── MENU CATEGORIES ───
  const hasMenus = data.menuCategories && data.menuCategories.some(c => c.category || c.items)
  if (hasMenus) {
    y -= 20
    page.drawText('รายการเมนูอาหาร', {
      x: margin,
      y,
      size: 11,
      font: thaiFontBold,
      color: primaryColor,
    })
    y -= 5
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: lightGrayColor,
    })

    // Menu header
    y -= 18
    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: tableWidth,
      height: 18,
      color: rgb(240/255, 244/255, 240/255),
    })
    page.drawText('หมวด', { x: margin + 5, y, size: 9, font: thaiFontBold, color: primaryColor })
    page.drawText('รายการเมนู', { x: margin + 120, y, size: 9, font: thaiFontBold, color: primaryColor })

    y -= 18
    data.menuCategories.filter(c => c.category || c.items).forEach(cat => {
      page.drawLine({
        start: { x: margin, y: y + 4 },
        end: { x: width - margin, y: y + 4 },
        thickness: 0.5,
        color: lightGrayColor,
      })
      page.drawText(cat.category || '', { x: margin + 5, y, size: 9, font: thaiFont, color: darkColor })
      page.drawText(cat.items || '', { x: margin + 120, y, size: 9, font: thaiFont, color: darkColor })
      y -= 16
    })
  }

  // ─── BOTTOM SECTION ───
  y -= 20

  // Payment terms (left)
  page.drawText('เงื่อนไขการชำระเงิน', {
    x: margin,
    y,
    size: 11,
    font: thaiFontBold,
    color: primaryColor,
  })
  y -= 5
  page.drawLine({
    start: { x: margin, y },
    end: { x: colMid - 30, y },
    thickness: 0.5,
    color: lightGrayColor,
  })

  y -= 14
  const depositAmount = data.depositPercent ? Math.round(data.grandTotal * (data.depositPercent / 100) * 100) / 100 : 0
  const remainingAmount = data.grandTotal - depositAmount

  if (data.depositPercent > 0) {
    page.drawText(`• มัดจำ ${data.depositPercent}% : ${fmtNum(depositAmount)} บาท ก่อนวันงาน`, {
      x: margin,
      y,
      size: 9,
      font: thaiFont,
      color: darkColor,
    })
    y -= lineHeight
    page.drawText(`• ชำระเงินส่วนที่เหลือ ${fmtNum(remainingAmount)} บาท ในวันจัดงาน`, {
      x: margin,
      y,
      size: 9,
      font: thaiFont,
      color: darkColor,
    })
    y -= lineHeight
  } else {
    page.drawText('• ชำระเงินในวันจัดงาน', {
      x: margin,
      y,
      size: 9,
      font: thaiFont,
      color: darkColor,
    })
    y -= lineHeight
  }

  if (data.minGuests > 0) {
    page.drawText(`• ราคานี้สำหรับขั้นต่ำ ${data.minGuests} คน`, {
      x: margin,
      y,
      size: 9,
      font: thaiFont,
      color: darkColor,
    })
    y -= lineHeight
  }

  if (data.paymentNotes) {
    page.drawText(`• ${data.paymentNotes}`, {
      x: margin,
      y,
      size: 9,
      font: thaiFont,
      color: darkColor,
    })
  }

  // Summary box (right)
  const summaryX = colMid + 50
  const summaryWidth = width - margin - summaryX
  const summaryY = y + 60
  const summaryHeight = 70

  page.drawRectangle({
    x: summaryX,
    y: summaryY - summaryHeight,
    width: summaryWidth,
    height: summaryHeight,
    borderColor: lightGrayColor,
    borderWidth: 0.5,
    color: rgb(250/255, 250/255, 250/255),
  })

  let sy = summaryY - 15
  page.drawText('ราคารวม', { x: summaryX + 10, y: sy, size: 9, font: thaiFont, color: darkColor })
  page.drawText(`${fmtNum(data.subtotal)} บาท`, { x: summaryX + summaryWidth - 80, y: sy, size: 9, font: thaiFont, color: darkColor })

  if (data.vatRate > 0) {
    sy -= 14
    page.drawText(`VAT ${data.vatRate}%`, { x: summaryX + 10, y: sy, size: 9, font: thaiFont, color: darkColor })
    page.drawText(`${fmtNum(data.vat)} บาท`, { x: summaryX + summaryWidth - 80, y: sy, size: 9, font: thaiFont, color: darkColor })
  }

  sy -= 10
  page.drawLine({
    start: { x: summaryX + 10, y: sy },
    end: { x: summaryX + summaryWidth - 10, y: sy },
    thickness: 1,
    color: primaryColor,
  })

  sy -= 14
  page.drawText('ยอดรวมสุทธิ', { x: summaryX + 10, y: sy, size: 10, font: thaiFontBold, color: primaryColor })
  page.drawText(`${fmtNum(data.grandTotal)} บาท`, { x: summaryX + summaryWidth - 80, y: sy, size: 10, font: thaiFontBold, color: primaryColor })

  // ─── SIGNATURES ───
  const sigY = y - 60
  const sig1X = margin + 80
  const sig2X = width - margin - 180

  page.drawLine({
    start: { x: sig1X, y: sigY },
    end: { x: sig1X + 100, y: sigY },
    thickness: 0.5,
    color: grayColor,
  })
  page.drawText('ผู้เสนอราคา (ร้านอาหาร)', { x: sig1X + 5, y: sigY - 12, size: 9, font: thaiFont, color: grayColor })

  page.drawLine({
    start: { x: sig2X, y: sigY },
    end: { x: sig2X + 100, y: sigY },
    thickness: 0.5,
    color: grayColor,
  })
  page.drawText('ผู้อนุมัติ (ลูกค้า)', { x: sig2X + 15, y: sigY - 12, size: 9, font: thaiFont, color: grayColor })

  // ─── FOOTER ───
  const footerY = margin
  page.drawLine({
    start: { x: margin, y: footerY + 15 },
    end: { x: width - margin, y: footerY + 15 },
    thickness: 0.5,
    color: lightGrayColor,
  })
  page.drawText('Madre Cafe & Restaurant | ร้านอาหาร ตำราแม่', {
    x: width / 2 - 80,
    y: footerY,
    size: 8,
    font: thaiFont,
    color: grayColor,
  })

  return pdfDoc.save()
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

    // Generate PDF
    const pdfBytes = await generatePDF({
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

    const base64Pdf = Buffer.from(pdfBytes).toString('base64')
    return NextResponse.json({ pdf: base64Pdf, quotationNumber })

  } catch (error) {
    console.error('[CATERING PDF ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF', details: String(error) }, { status: 500 })
  }
}
