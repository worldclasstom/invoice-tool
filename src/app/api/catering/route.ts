import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import fontkit from '@pdf-lib/fontkit'

function fmtBaht(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

/* helper: truncate text to fit a given width */
function fit(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxW: number): string {
  let t = text
  while (t.length > 0 && font.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -1)
  return t.length < text.length ? t.slice(0, -1) + '...' : t
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      shopName, shopAddress, shopPhone, shopContact,
      customerName, customerAddress, customerPhone, customerEmail,
      eventLocation, eventDate, guestCount,
      items, menuCategories,
      vatPercent, depositPercent, minGuests, paymentNotes,
    } = body

    const subtotal = (items ?? []).reduce(
      (s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0,
    )
    const vatRate = Number(vatPercent) || 0
    const vat = vatRate > 0 ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0
    const grandTotal = subtotal + vat

    // ─── Fonts (Sarabun for clean Thai rendering) ───
    const fontDir = path.join(process.cwd(), 'public/fonts')
    const regBytes = fs.readFileSync(path.join(fontDir, 'Sarabun-Regular.ttf'))
    const boldBytes = fs.readFileSync(path.join(fontDir, 'Sarabun-SemiBold.ttf'))

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const font = await pdfDoc.embedFont(regBytes)
    const bold = await pdfDoc.embedFont(boldBytes)

    // ─── Logo ───
    const logoPath = path.join(process.cwd(), 'public/images/madre-logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)
    const logoDims = logoImage.scale(0.5)
    const logoW = Math.min(logoDims.width, 55)
    const logoH = (logoW / logoDims.width) * logoDims.height

    const page = pdfDoc.addPage([595, 842]) // A4
    const W = page.getSize().width
    const M = 45 // margin
    const RightEdge = W - M
    const contentW = W - M * 2

    // ─── Colors ───
    const green  = rgb(0.18, 0.48, 0.30)
    const dark   = rgb(0.12, 0.12, 0.12)
    const mid    = rgb(0.35, 0.35, 0.35)
    const light  = rgb(0.55, 0.55, 0.55)
    const lineCl = rgb(0.82, 0.82, 0.82)
    const white  = rgb(1, 1, 1)
    const stripeBg = rgb(0.965, 0.975, 0.965)
    const boxBg  = rgb(0.94, 0.96, 0.94)

    let y = 842 - 45

    // ════════════════════ HEADER ════════════════════
    page.drawImage(logoImage, { x: M, y: y - logoH + 10, width: logoW, height: logoH })

    const nameX = M + logoW + 10
    page.drawText('Madre Cafe & Restaurant', { x: nameX, y: y, size: 12, font: bold, color: green })
    page.drawText('ร้านอาหาร ตำราแม่', { x: nameX, y: y - 15, size: 9, font, color: mid })

    // Title right-aligned
    const title = 'ใบเสนอราคาจัดเลี้ยง'
    const tw = bold.widthOfTextAtSize(title, 15)
    page.drawText(title, { x: RightEdge - tw, y: y, size: 15, font: bold, color: green })

    const sub1 = 'Catering Quotation'
    const sw1 = font.widthOfTextAtSize(sub1, 8)
    page.drawText(sub1, { x: RightEdge - sw1, y: y - 15, size: 8, font, color: light })

    const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
    const dateStr = `วันที่ : ${today}`
    const dw = font.widthOfTextAtSize(dateStr, 8)
    page.drawText(dateStr, { x: RightEdge - dw, y: y - 27, size: 8, font, color: light })

    y -= Math.max(logoH, 45) + 12

    // Green divider
    page.drawRectangle({ x: M, y, width: contentW, height: 1.5, color: green })
    y -= 20

    // ════════════════════ TWO-COLUMN INFO ════════════════════
    // Split page into two halves with clear separation
    const halfW = (contentW - 20) / 2  // 20px gap between columns
    const LX = M
    const RX = M + halfW + 20
    const maxLeftW = halfW - 5
    const maxRightW = halfW - 5
    const infoY = y
    const lh = 13 // line height

    // -- LEFT: Shop info --
    let ly = infoY
    page.drawText('ข้อมูลร้านค้า', { x: LX, y: ly, size: 9, font: bold, color: green })
    ly -= lh + 3
    if (shopName) { page.drawText(fit(shopName, font, 8.5, maxLeftW), { x: LX, y: ly, size: 8.5, font, color: dark }); ly -= lh }
    if (shopAddress) { page.drawText(fit(shopAddress, font, 8, maxLeftW), { x: LX, y: ly, size: 8, font, color: mid }); ly -= lh }
    if (shopPhone) { page.drawText(fit(`โทร: ${shopPhone}`, font, 8, maxLeftW), { x: LX, y: ly, size: 8, font, color: mid }); ly -= lh }
    if (shopContact) { page.drawText(fit(`Line/Email: ${shopContact}`, font, 8, maxLeftW), { x: LX, y: ly, size: 8, font, color: mid }); ly -= lh }

    // -- RIGHT: Customer info --
    let ry = infoY
    page.drawText('ข้อมูลลูกค้า / งาน', { x: RX, y: ry, size: 9, font: bold, color: green })
    ry -= lh + 3
    if (customerName) { page.drawText(fit(customerName, font, 8.5, maxRightW), { x: RX, y: ry, size: 8.5, font, color: dark }); ry -= lh }
    if (customerAddress) { page.drawText(fit(customerAddress, font, 8, maxRightW), { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }
    if (customerPhone) { page.drawText(fit(`โทร: ${customerPhone}`, font, 8, maxRightW), { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }
    if (customerEmail) { page.drawText(fit(`อีเมล: ${customerEmail}`, font, 8, maxRightW), { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }
    if (eventLocation) { page.drawText(fit(`สถานที่จัดงาน: ${eventLocation}`, font, 8, maxRightW), { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }
    if (eventDate) {
      const d = new Date(eventDate + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
      page.drawText(fit(`วันที่จัดงาน: ${d}`, font, 8, maxRightW), { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh
    }
    if (guestCount) { page.drawText(`จำนวนคน: ${guestCount} คน`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lh }

    // Move y below whichever column is taller
    y = Math.min(ly, ry) - 16

    // ════════════════════ ITEMS TABLE ════════════════════
    const rowH = 18
    // Column x-positions (absolute)
    const colNo  = M
    const colName = M + 25
    const colDetail = M + 175
    const colQty = M + 300
    const colPrice = M + 370
    const colTotal = M + 440

    // Header
    page.drawRectangle({ x: M, y: y - 3, width: contentW, height: rowH + 2, color: green })
    const hy = y + 1
    page.drawText('#',         { x: colNo + 6,  y: hy, size: 8, font: bold, color: white })
    page.drawText('รายการ',    { x: colName + 3, y: hy, size: 8, font: bold, color: white })
    page.drawText('รายละเอียด', { x: colDetail + 3, y: hy, size: 8, font: bold, color: white })
    page.drawText('จำนวน',     { x: colQty + 3,  y: hy, size: 8, font: bold, color: white })
    page.drawText('ราคา/หน่วย', { x: colPrice + 3, y: hy, size: 8, font: bold, color: white })
    const totalHdr = 'รวม (บาท)'
    page.drawText(totalHdr, { x: RightEdge - bold.widthOfTextAtSize(totalHdr, 8) - 4, y: hy, size: 8, font: bold, color: white })
    y -= rowH + 3

    for (let i = 0; i < (items ?? []).length; i++) {
      const item = items[i]
      const lineTotal = (item.quantity ?? 0) * (item.unitPrice ?? 0)

      if (i % 2 === 0) page.drawRectangle({ x: M, y: y - 3, width: contentW, height: rowH, color: stripeBg })

      const rY = y + 2
      page.drawText(String(i + 1), { x: colNo + 8, y: rY, size: 8, font, color: dark })
      page.drawText(fit(String(item.name ?? ''), font, 8, 145), { x: colName + 3, y: rY, size: 8, font, color: dark })
      page.drawText(fit(String(item.detail ?? ''), font, 7.5, 120), { x: colDetail + 3, y: rY, size: 7.5, font, color: mid })
      page.drawText(String(item.quantityLabel || item.quantity || ''), { x: colQty + 3, y: rY, size: 8, font, color: dark })
      page.drawText(fmtBaht(item.unitPrice ?? 0), { x: colPrice + 3, y: rY, size: 8, font, color: dark })

      const tStr = fmtBaht(lineTotal)
      page.drawText(tStr, { x: RightEdge - font.widthOfTextAtSize(tStr, 8) - 4, y: rY, size: 8, font, color: dark })

      y -= rowH
      page.drawLine({ start: { x: M, y: y + 15 }, end: { x: RightEdge, y: y + 15 }, thickness: 0.3, color: lineCl })
    }
    y -= 10

    // ════════════════════ MENU CATEGORIES ════════════════════
    const hasMenu = menuCategories?.length > 0 && menuCategories.some((c: { category: string; items: string }) => c.category || c.items)
    if (hasMenu) {
      page.drawText('รายการเมนูอาหาร', { x: M, y, size: 10, font: bold, color: green })
      y -= 16

      page.drawRectangle({ x: M, y: y - 3, width: contentW, height: rowH, color: boxBg })
      page.drawText('หมวด', { x: M + 6, y: y + 2, size: 8, font: bold, color: green })
      page.drawText('รายการเมนู', { x: M + 130, y: y + 2, size: 8, font: bold, color: green })
      y -= rowH

      for (const cat of menuCategories) {
        if (!cat.category && !cat.items) continue
        page.drawText(fit(String(cat.category ?? ''), font, 8, 118), { x: M + 6, y: y + 2, size: 8, font, color: dark })
        const txt = String(cat.items ?? '')
        const menuMaxW = contentW - 136
        if (font.widthOfTextAtSize(txt, 8) > menuMaxW) {
          // wrap to 2 lines
          let cut = txt.length
          while (cut > 0 && font.widthOfTextAtSize(txt.substring(0, cut), 8) > menuMaxW) cut--
          page.drawText(txt.substring(0, cut), { x: M + 130, y: y + 2, size: 8, font, color: mid })
          y -= 13
          page.drawText(fit(txt.substring(cut), font, 8, menuMaxW), { x: M + 130, y: y + 2, size: 8, font, color: mid })
        } else {
          page.drawText(txt, { x: M + 130, y: y + 2, size: 8, font, color: mid })
        }
        y -= 15
        page.drawLine({ start: { x: M, y: y + 11 }, end: { x: RightEdge, y: y + 11 }, thickness: 0.3, color: lineCl })
      }
      y -= 10
    }

    // ════════════════════ SUMMARY BOX ════════════════════
    const boxW = 210
    const boxX = RightEdge - boxW
    const numRows = 2 + (vatRate > 0 ? 1 : 0)
    const boxH = numRows * 20 + 14
    page.drawRectangle({ x: boxX - 8, y: y - boxH + 12, width: boxW + 10, height: boxH, color: boxBg, borderColor: lineCl, borderWidth: 0.5 })

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
    y -= 30

    // ════════════════════ PAYMENT TERMS ════════════════════
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
      page.drawText(`  - ${b}`, { x: M + 4, y, size: 8, font, color: mid })
      y -= 14
    }
    y -= 22

    // ════════════════════ SIGNATURES ════════════════════
    const sigW = 160
    const sLX = M + 35
    const sRX = W - M - sigW - 35
    page.drawLine({ start: { x: sLX, y }, end: { x: sLX + sigW, y }, thickness: 0.8, color: lineCl })
    page.drawLine({ start: { x: sRX, y }, end: { x: sRX + sigW, y }, thickness: 0.8, color: lineCl })
    y -= 13
    const l1 = 'ผู้เสนอราคา (ร้านอาหาร)'
    const l2 = 'ผู้อนุมัติ (ลูกค้า)'
    page.drawText(l1, { x: sLX + (sigW - font.widthOfTextAtSize(l1, 8)) / 2, y, size: 8, font, color: light })
    page.drawText(l2, { x: sRX + (sigW - font.widthOfTextAtSize(l2, 8)) / 2, y, size: 8, font, color: light })

    // ─── Footer ───
    page.drawLine({ start: { x: M, y: 40 }, end: { x: RightEdge, y: 40 }, thickness: 0.5, color: lineCl })
    const fTxt = 'Madre Cafe & Restaurant  |  ร้านอาหาร ตำราแม่'
    page.drawText(fTxt, { x: (W - font.widthOfTextAtSize(fTxt, 7)) / 2, y: 28, size: 7, font, color: light })

    const pdfBytes = await pdfDoc.save()
    return NextResponse.json({
      pdf: Buffer.from(pdfBytes).toString('base64'),
      quotation: { subtotal, vat, grandTotal },
    })
  } catch (error) {
    console.error('Error creating catering quotation:', error)
    return NextResponse.json({ error: 'Failed to create quotation' }, { status: 500 })
  }
}
