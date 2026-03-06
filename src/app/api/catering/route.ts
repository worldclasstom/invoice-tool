import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'

function fmtBaht(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

/* Generate quotation number: QT-YYYY-MM-NNN */
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

/* Wrap text at word boundaries only */
function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxW: number, maxLines: number = 3): string[] {
  const lines: string[] = []
  const words = text.trim().split(/\s+/)
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word
    if (font.widthOfTextAtSize(testLine, size) <= maxW) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
        if (lines.length >= maxLines) return lines
        currentLine = word
      } else {
        lines.push(word)
        if (lines.length >= maxLines) return lines
      }
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export async function POST(request: Request) {
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
    const subtotal = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
    const vatRate = Number(vatPercent) || 0
    const vat = vatRate > 0 ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0
    const grandTotal = subtotal + vat

    // ─── Create PDF ───
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)

    const fontDir = path.join(process.cwd(), 'public/fonts')
    const regBytes = fs.readFileSync(path.join(fontDir, 'Kanit-Regular.ttf'))
    const boldBytes = fs.readFileSync(path.join(fontDir, 'Kanit-Medium.ttf'))
    const font = await pdfDoc.embedFont(regBytes)
    const bold = await pdfDoc.embedFont(boldBytes)

    // Load logo
    const logoPath = path.join(process.cwd(), 'public/images/madre-logo.png')
    let logoImage = null
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath)
      logoImage = await pdfDoc.embedPng(logoBytes)
    }

    const W = 595.28, H = 841.89
    const M = 45, RightEdge = W - M, contentW = RightEdge - M
    const page = pdfDoc.addPage([W, H])

    // Colors
    const green = rgb(0.18, 0.48, 0.30)
    const dark = rgb(0.12, 0.12, 0.12)
    const mid = rgb(0.35, 0.35, 0.35)
    const light = rgb(0.55, 0.55, 0.55)
    const white = rgb(1, 1, 1)
    const boxBg = rgb(0.96, 0.98, 0.96)
    const lineCl = rgb(0.85, 0.85, 0.85)

    let y = H - 45

    // ═══════════════════ HEADER ═══════════════════
    // Logo
    if (logoImage) {
      page.drawImage(logoImage, { x: M, y: y - 45, width: 50, height: 50 })
    }
    const nameX = M + 60
    page.drawText('Madre Cafe & Restaurant', { x: nameX, y: y, size: 12, font: bold, color: green })
    page.drawText('ร้านอาหาร ตำราแม่', { x: nameX, y: y - 14, size: 9, font, color: mid })

    // Title - right aligned
    const title = 'ใบเสนอราคา'
    const titleW = bold.widthOfTextAtSize(title, 16)
    page.drawText(title, { x: RightEdge - titleW, y, size: 16, font: bold, color: green })

    const subTitle = 'Catering Quotation'
    const subTitleW = font.widthOfTextAtSize(subTitle, 9)
    page.drawText(subTitle, { x: RightEdge - subTitleW, y: y - 14, size: 9, font, color: mid })

    const qnStr = `เลขที่: ${quotationNumber}`
    const qnW = font.widthOfTextAtSize(qnStr, 8)
    page.drawText(qnStr, { x: RightEdge - qnW, y: y - 26, size: 8, font, color: mid })

    const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
    const dateStr = `วันที่: ${today}`
    const dateW = font.widthOfTextAtSize(dateStr, 8)
    page.drawText(dateStr, { x: RightEdge - dateW, y: y - 38, size: 8, font, color: mid })

    y -= 70
    page.drawLine({ start: { x: M, y }, end: { x: RightEdge, y }, thickness: 0.5, color: lineCl })
    y -= 20

    // ═══════════════════ INFO COLUMNS ═══════════════════
    const halfW = (contentW - 20) / 2
    const LX = M
    const RX = M + halfW + 20
    const lh = 13

    // -- LEFT: Shop info --
    let ly = y
    page.drawText('ข้อมูลร้านค้า', { x: LX, y: ly, size: 9, font: bold, color: green })
    ly -= lh + 3
    if (shopName) {
      for (const line of wrapText(shopName, font, 8.5, halfW, 2)) {
        page.drawText(line, { x: LX, y: ly, size: 8.5, font, color: dark }); ly -= lh
      }
    }
    if (quoterName) {
      page.drawText(`ผู้เสนอราคา: ${quoterName}`, { x: LX, y: ly, size: 8, font, color: mid }); ly -= lh
    }
    if (shopAddress) {
      for (const line of wrapText(shopAddress, font, 8, halfW, 3)) {
        page.drawText(line, { x: LX, y: ly, size: 8, font, color: mid }); ly -= lh
      }
    }
    if (shopPhone) { page.drawText(`โทร: ${shopPhone}`, { x: LX, y: ly, size: 8, font, color: mid }); ly -= lh }
    if (shopEmail) { page.drawText(`อีเมล: ${shopEmail}`, { x: LX, y: ly, size: 8, font, color: mid }); ly -= lh }

    // -- RIGHT: Customer info --
    let ry = y
    page.drawText('ข้อมูลลูกค้า / งาน', { x: RX, y: ry, size: 9, font: bold, color: green })
    ry -= lh + 3
    if (customerName) {
      for (const line of wrapText(customerName, font, 8.5, halfW, 2)) {
        page.drawText(line, { x: RX, y: ry, size: 8.5, font, color: dark }); ry -= lh
      }
    }
    if (customerAddress) {
      for (const line of wrapText(customerAddress, font, 8, halfW, 3)) {
        page.drawText(line, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh
      }
    }
    if (customerPhone) { page.drawText(`โทร: ${customerPhone}`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }
    if (customerEmail) { page.drawText(`อีเมล: ${customerEmail}`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }
    if (eventLocation) {
      for (const line of wrapText(`สถานที่จัดงาน: ${eventLocation}`, font, 8, halfW, 2)) {
        page.drawText(line, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh
      }
    }
    if (eventDate) { page.drawText(`วันที่จัดงาน: ${eventDate}`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }
    if (guestCount) { page.drawText(`จำนวนคน: ${guestCount} คน`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }

    y = Math.min(ly, ry) - 18

    // ═══════════════════ ITEMS TABLE ═══════════════════
    const rowH = 18
    const colNo = M
    const colName = M + 25
    const colDetail = M + 140
    const colQty = M + 280
    const colPrice = M + 340
    const colTotal = M + 420

    // Header
    page.drawRectangle({ x: M, y: y - 3, width: contentW, height: rowH + 2, color: green })
    const hy = y + 1
    page.drawText('#', { x: colNo + 6, y: hy, size: 8, font: bold, color: white })
    page.drawText('รายการ', { x: colName + 3, y: hy, size: 8, font: bold, color: white })
    page.drawText('รายละเอียด', { x: colDetail + 3, y: hy, size: 8, font: bold, color: white })
    page.drawText('จำนวน', { x: colQty + 3, y: hy, size: 8, font: bold, color: white })
    page.drawText('ราคา/หน่วย', { x: colPrice + 3, y: hy, size: 8, font: bold, color: white })
    const totalHdr = 'รวม (บาท)'
    page.drawText(totalHdr, { x: RightEdge - bold.widthOfTextAtSize(totalHdr, 8) - 4, y: hy, size: 8, font: bold, color: white })
    y -= rowH + 4

    // Rows
    items.forEach((item: { name: string; detail?: string; quantity: number; quantityLabel?: string; unitPrice: number }, idx: number) => {
      const isOdd = idx % 2 === 0
      if (isOdd) page.drawRectangle({ x: M, y: y - 3, width: contentW, height: rowH, color: boxBg })

      const ty = y + 2
      page.drawText(String(idx + 1), { x: colNo + 8, y: ty, size: 8, font, color: mid })
      page.drawText(item.name || '', { x: colName + 3, y: ty, size: 8, font, color: dark })
      page.drawText(item.detail || '', { x: colDetail + 3, y: ty, size: 8, font, color: mid })
      const qtyStr = item.quantityLabel || String(item.quantity || '')
      page.drawText(qtyStr, { x: colQty + 3, y: ty, size: 8, font, color: dark })
      page.drawText(fmtBaht(Number(item.unitPrice) || 0), { x: colPrice + 3, y: ty, size: 8, font, color: dark })
      const lineTotal = fmtBaht((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))
      page.drawText(lineTotal, { x: RightEdge - font.widthOfTextAtSize(lineTotal, 8) - 4, y: ty, size: 8, font, color: dark })
      y -= rowH
    })
    y -= 12

    // ═══════════════════ MENU CATEGORIES ═══════════════════
    const hasMenu = menuCategories?.length > 0 && menuCategories.some((c: { category: string; items: string }) => c.category || c.items)
    if (hasMenu) {
      page.drawText('รายการเมนูอาหาร', { x: M, y, size: 10, font: bold, color: green })
      y -= 16

      page.drawRectangle({ x: M, y: y - 3, width: contentW, height: rowH, color: boxBg })
      page.drawText('หมวด', { x: M + 6, y: y + 2, size: 8, font: bold, color: green })
      page.drawText('รายการเมนู', { x: M + 130, y: y + 2, size: 8, font: bold, color: green })
      y -= rowH

      menuCategories.forEach((mc: { category: string; items: string }) => {
        if (mc.category || mc.items) {
          page.drawLine({ start: { x: M, y: y + 14 }, end: { x: RightEdge, y: y + 14 }, thickness: 0.5, color: lineCl })
          page.drawText(mc.category || '', { x: M + 6, y: y + 2, size: 8, font, color: dark })
          page.drawText(mc.items || '', { x: M + 130, y: y + 2, size: 8, font, color: mid })
          y -= rowH
        }
      })
      y -= 10
    }

    // ═══════════════════ SUMMARY BOX ═══════════════════
    const boxW = 200
    const boxX = RightEdge - boxW
    page.drawRectangle({ x: boxX - 6, y: y - 60, width: boxW + 6, height: 65, color: boxBg, borderColor: green, borderWidth: 1 })
    y -= 10

    page.drawText('ราคารวม', { x: boxX, y, size: 9, font, color: mid })
    const stStr = `${fmtBaht(subtotal)} บาท`
    page.drawText(stStr, { x: boxX + boxW - font.widthOfTextAtSize(stStr, 9) - 6, y, size: 9, font, color: dark })
    y -= 20

    if (vatRate > 0) {
      page.drawText(`VAT ${vatRate}%`, { x: boxX, y, size: 9, font, color: mid })
      const vs = `${fmtBaht(vat)} บาท`
      page.drawText(vs, { x: boxX + boxW - font.widthOfTextAtSize(vs, 9) - 6, y, size: 9, font, color: dark })
      y -= 20
    }

    page.drawLine({ start: { x: boxX, y: y + 16 }, end: { x: boxX + boxW - 6, y: y + 16 }, thickness: 1.2, color: green })
    page.drawText('ยอดรวมสุทธิ', { x: boxX, y, size: 11, font: bold, color: green })
    const gs = `${fmtBaht(grandTotal)} บาท`
    page.drawText(gs, { x: boxX + boxW - bold.widthOfTextAtSize(gs, 11) - 6, y, size: 11, font: bold, color: green })

    y -= 45

    // ═══════════════════ PAYMENT TERMS ═══════════════════
    page.drawText('เงื่อนไขการชำระเงิน', { x: M, y, size: 10, font: bold, color: green })
    y -= 15
    const bullets: string[] = []
    if (depositPercent) {
      const depRate = Number(depositPercent) || 0
      const depAmount = Math.round(grandTotal * (depRate / 100) * 100) / 100
      const remaining = Math.round((grandTotal - depAmount) * 100) / 100
      bullets.push(`มัดจำ ${depositPercent}% : ${fmtBaht(depAmount)} บาท ก่อนวันงาน`)
      bullets.push(`ชำระเงินส่วนที่เหลือ ${fmtBaht(remaining)} บาท ในวันจัดงาน`)
    } else {
      bullets.push('ชำระเงินในวันจัดงาน')
    }
    if (minGuests) bullets.push(`ราคานี้สำหรับขั้นต่ำ ${minGuests} คน`)
    if (paymentNotes) bullets.push(paymentNotes)

    for (const b of bullets) {
      page.drawText(`- ${b}`, { x: M + 4, y, size: 8, font, color: mid })
      y -= 14
    }

    y -= 20

    // ═══════════════════ SIGNATURES ═══════════════════
    const sigW = 150
    const sLX = M + 30
    const sRX = RightEdge - sigW - 30

    page.drawLine({ start: { x: sLX, y }, end: { x: sLX + sigW, y }, thickness: 0.8, color: mid })
    page.drawLine({ start: { x: sRX, y }, end: { x: sRX + sigW, y }, thickness: 0.8, color: mid })

    y -= 13
    const l1 = 'ผู้เสนอราคา (ร้านอาหาร)'
    const l2 = 'ผู้อนุมัติ (ลูกค้า)'
    page.drawText(l1, { x: sLX + (sigW - font.widthOfTextAtSize(l1, 8)) / 2, y, size: 8, font, color: light })
    page.drawText(l2, { x: sRX + (sigW - font.widthOfTextAtSize(l2, 8)) / 2, y, size: 8, font, color: light })

    // ─── Footer ───
    page.drawLine({ start: { x: M, y: 40 }, end: { x: RightEdge, y: 40 }, thickness: 0.5, color: lineCl })
    const fTxt = 'Madre Cafe & Restaurant | ร้านอาหาร ตำราแม่'
    page.drawText(fTxt, { x: (W - font.widthOfTextAtSize(fTxt, 7)) / 2, y: 28, size: 7, font, color: light })

    // ─── Output ───
    const pdfBytes = await pdfDoc.save()
    const base64 = Buffer.from(pdfBytes).toString('base64')
    return NextResponse.json({ pdf: base64, quotationNumber })

  } catch (err) {
    console.error('[CATERING PDF ERROR]', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
