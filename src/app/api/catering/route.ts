import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import fontkit from '@pdf-lib/fontkit'

function fmtBaht(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
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

    // Calculate totals
    const subtotal = (items ?? []).reduce(
      (s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0,
    )
    const vatRate = Number(vatPercent) || 0
    const vat = vatRate > 0 ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0
    const grandTotal = subtotal + vat

    // ─── Load single static font ───
    const fontDir = path.join(process.cwd(), 'public/fonts')
    const regularBytes = fs.readFileSync(path.join(fontDir, 'NotoSansThai-Regular.ttf'))

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const font = await pdfDoc.embedFont(regularBytes)

    // ─── Embed logo ───
    const logoPath = path.join(process.cwd(), 'public/images/madre-logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)
    const logoDims = logoImage.scale(0.5)
    const logoW = Math.min(logoDims.width, 60)
    const logoH = (logoW / logoDims.width) * logoDims.height

    const page = pdfDoc.addPage([612, 842]) // A4
    const { width, height } = page.getSize()
    const M = 50 // margin

    // ─── Colors ───
    const green = rgb(0.22, 0.47, 0.34)
    const dark = rgb(0.13, 0.13, 0.13)
    const mid = rgb(0.38, 0.38, 0.38)
    const light = rgb(0.58, 0.58, 0.58)
    const line = rgb(0.82, 0.82, 0.82)
    const white = rgb(1, 1, 1)
    const altRow = rgb(0.965, 0.98, 0.965)
    const accentBg = rgb(0.94, 0.97, 0.94)

    let y = height - 50

    // ════════════════════════════════════════════════════════════
    //  HEADER BLOCK
    // ════════════════════════════════════════════════════════════
    page.drawImage(logoImage, { x: M, y: y - logoH + 12, width: logoW, height: logoH })

    const nameX = M + logoW + 12
    page.drawText('Madre Cafe & Restaurant', { x: nameX, y: y + 2, size: 13, font, color: green })
    page.drawText('ร้านอาหาร ตำราแม่', { x: nameX, y: y - 14, size: 9, font, color: mid })

    // Title block right-aligned
    const titleText = 'ใบเสนอราคาจัดเลี้ยง'
    const tw = font.widthOfTextAtSize(titleText, 16)
    page.drawText(titleText, { x: width - M - tw, y: y + 2, size: 16, font, color: green })

    const sub1 = 'Catering Quotation'
    const sw1 = font.widthOfTextAtSize(sub1, 8)
    page.drawText(sub1, { x: width - M - sw1, y: y - 14, size: 8, font, color: light })

    const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
    const dateStr = `วันที่ : ${today}`
    const dw = font.widthOfTextAtSize(dateStr, 8)
    page.drawText(dateStr, { x: width - M - dw, y: y - 26, size: 8, font, color: light })

    y -= Math.max(logoH, 48) + 14

    // Green divider
    page.drawRectangle({ x: M, y, width: width - M * 2, height: 2, color: green })
    y -= 22

    // ════════════════════════════════════════════════════════════
    //  TWO-COLUMN INFO (Shop left, Customer right)
    // ════════════════════════════════════════════════════════════
    const colW = (width - M * 2 - 30) / 2
    const LX = M
    const RX = M + colW + 30
    const lineH = 14
    const infoStartY = y

    // -- LEFT: Shop Info --
    let ly = infoStartY
    page.drawText('ข้อมูลร้านค้า', { x: LX, y: ly, size: 10, font, color: green })
    ly -= lineH + 2
    if (shopName) { page.drawText(shopName, { x: LX, y: ly, size: 9, font, color: dark }); ly -= lineH }
    if (shopAddress) { page.drawText(shopAddress, { x: LX, y: ly, size: 8, font, color: mid }); ly -= lineH }
    if (shopPhone) { page.drawText(`โทร: ${shopPhone}`, { x: LX, y: ly, size: 8, font, color: mid }); ly -= lineH }
    if (shopContact) { page.drawText(`Line / Email: ${shopContact}`, { x: LX, y: ly, size: 8, font, color: mid }); ly -= lineH }

    // -- RIGHT: Customer Info --
    let ry = infoStartY
    page.drawText('ข้อมูลลูกค้า / งาน', { x: RX, y: ry, size: 10, font, color: green })
    ry -= lineH + 2
    if (customerName) { page.drawText(customerName, { x: RX, y: ry, size: 9, font, color: dark }); ry -= lineH }
    if (customerAddress) { page.drawText(customerAddress, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lineH }
    if (customerPhone) { page.drawText(`โทร: ${customerPhone}`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lineH }
    if (customerEmail) { page.drawText(`อีเมล: ${customerEmail}`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lineH }
    if (eventLocation) { page.drawText(`สถานที่จัดงาน: ${eventLocation}`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lineH }
    if (eventDate) {
      const d = new Date(eventDate + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
      page.drawText(`วันที่จัดงาน: ${d}`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lineH
    }
    if (guestCount) { page.drawText(`จำนวนคน: ${guestCount} คน`, { x: RX, y: ry, size: 8, font, color: mid }); ry -= lineH }

    // Use the LOWER of the two columns so nothing overlaps
    y = Math.min(ly, ry) - 18

    // ════════════════════════════════════════════════════════════
    //  ITEMS TABLE
    // ════════════════════════════════════════════════════════════
    const tableW = width - M * 2
    const rowH = 20
    // Column positions
    const c0 = M          // #
    const c1 = M + 28     // Item name
    const c2 = M + 195    // Detail
    const c3 = M + 310    // Qty
    const c4 = M + 380    // Unit price
    const c5 = M + 460    // Total

    // Header row
    page.drawRectangle({ x: M, y: y - 5, width: tableW, height: rowH + 4, color: green })
    const hdrY = y + 1
    page.drawText('#', { x: c0 + 8, y: hdrY, size: 8, font, color: white })
    page.drawText('รายการ', { x: c1 + 4, y: hdrY, size: 8, font, color: white })
    page.drawText('รายละเอียด', { x: c2 + 4, y: hdrY, size: 8, font, color: white })
    page.drawText('จำนวน', { x: c3 + 4, y: hdrY, size: 8, font, color: white })
    page.drawText('ราคา/หน่วย', { x: c4 + 4, y: hdrY, size: 8, font, color: white })
    page.drawText('รวม (บาท)', { x: c5 + 4, y: hdrY, size: 8, font, color: white })
    y -= rowH + 5

    // Data rows
    for (let i = 0; i < (items ?? []).length; i++) {
      const item = items[i]
      const lineTotal = (item.quantity ?? 0) * (item.unitPrice ?? 0)

      if (i % 2 === 0) {
        page.drawRectangle({ x: M, y: y - 5, width: tableW, height: rowH, color: altRow })
      }
      const rY = y + 1
      page.drawText(String(i + 1), { x: c0 + 8, y: rY, size: 8, font, color: dark })
      page.drawText(String(item.name ?? '').substring(0, 26), { x: c1 + 4, y: rY, size: 8, font, color: dark })
      page.drawText(String(item.detail ?? '').substring(0, 18), { x: c2 + 4, y: rY, size: 8, font, color: mid })
      page.drawText(String(item.quantityLabel || item.quantity || ''), { x: c3 + 4, y: rY, size: 8, font, color: dark })
      page.drawText(fmtBaht(item.unitPrice ?? 0), { x: c4 + 4, y: rY, size: 8, font, color: dark })

      const tStr = fmtBaht(lineTotal)
      const tW = font.widthOfTextAtSize(tStr, 8)
      page.drawText(tStr, { x: width - M - tW - 6, y: rY, size: 8, font, color: dark })

      y -= rowH
      page.drawLine({ start: { x: M, y: y + 15 }, end: { x: width - M, y: y + 15 }, thickness: 0.3, color: line })
    }
    y -= 10

    // ════════════════════════════════════════════════════════════
    //  MENU CATEGORIES
    // ════════════════════════════════════════════════════════════
    const hasMenu = menuCategories?.length > 0 && menuCategories.some((c: { category: string; items: string }) => c.category || c.items)
    if (hasMenu) {
      page.drawText('รายการเมนูอาหาร', { x: M, y, size: 10, font, color: green })
      y -= 18

      page.drawRectangle({ x: M, y: y - 4, width: tableW, height: rowH, color: accentBg })
      page.drawText('หมวด', { x: M + 8, y: y + 2, size: 8, font, color: green })
      page.drawText('รายการเมนู', { x: M + 140, y: y + 2, size: 8, font, color: green })
      y -= rowH + 2

      for (const cat of menuCategories) {
        if (!cat.category && !cat.items) continue
        page.drawText(String(cat.category ?? ''), { x: M + 8, y: y + 2, size: 8, font, color: dark })
        const txt = String(cat.items ?? '')
        const maxC = 65
        if (txt.length > maxC) {
          page.drawText(txt.substring(0, maxC), { x: M + 140, y: y + 2, size: 8, font, color: mid })
          y -= 14
          page.drawText(txt.substring(maxC), { x: M + 140, y: y + 2, size: 8, font, color: mid })
        } else {
          page.drawText(txt, { x: M + 140, y: y + 2, size: 8, font, color: mid })
        }
        y -= 16
        page.drawLine({ start: { x: M, y: y + 12 }, end: { x: width - M, y: y + 12 }, thickness: 0.3, color: line })
      }
      y -= 10
    }

    // ════════════════════════════════════════════════════════════
    //  SUMMARY BOX (right-aligned)
    // ════════════════════════════════════════════════════════════
    const boxW = 220
    const boxX = width - M - boxW
    const numRows = 2 + (vatRate > 0 ? 1 : 0)
    const boxH = numRows * 20 + 16
    page.drawRectangle({ x: boxX - 10, y: y - boxH + 14, width: boxW + 12, height: boxH, color: accentBg, borderColor: line, borderWidth: 0.5 })

    // Subtotal
    page.drawText('ราคารวม', { x: boxX, y, size: 9, font, color: mid })
    const stStr = `${fmtBaht(subtotal)} บาท`
    page.drawText(stStr, { x: boxX + boxW - font.widthOfTextAtSize(stStr, 9) - 8, y, size: 9, font, color: dark })
    y -= 20

    // VAT
    if (vatRate > 0) {
      const vatLabel = `VAT ${vatRate}%`
      page.drawText(vatLabel, { x: boxX, y, size: 9, font, color: mid })
      const vatStr = `${fmtBaht(vat)} บาท`
      page.drawText(vatStr, { x: boxX + boxW - font.widthOfTextAtSize(vatStr, 9) - 8, y, size: 9, font, color: dark })
      y -= 20
    }

    // Divider in box
    page.drawLine({ start: { x: boxX, y: y + 16 }, end: { x: boxX + boxW - 8, y: y + 16 }, thickness: 1.2, color: green })

    // Grand total
    page.drawText('ยอดรวมสุทธิ', { x: boxX, y, size: 12, font, color: green })
    const gtStr = `${fmtBaht(grandTotal)} บาท`
    page.drawText(gtStr, { x: boxX + boxW - font.widthOfTextAtSize(gtStr, 12) - 8, y, size: 12, font, color: green })
    y -= 32

    // ════════════════════════════════════════════════════════════
    //  PAYMENT TERMS
    // ════════════════════════════════════════════════════════════
    page.drawText('เงื่อนไขการชำระเงิน', { x: M, y, size: 10, font, color: green })
    y -= 16
    const bullets: string[] = []
    if (depositPercent) {
      const depRate = Number(depositPercent) || 0
      const depAmount = Math.round(grandTotal * (depRate / 100) * 100) / 100
      const remaining = Math.round((grandTotal - depAmount) * 100) / 100
      bullets.push(`มัดจำ ${depositPercent}% : ${fmtBaht(depAmount)} บาท ก่อนวันงาน`)
      bullets.push(`ชำระเงินส่วนที่เหลือ ${fmtBaht(remaining)} บาท ในวันจัดงาน`)
    } else {
      bullets.push('ชำระเงินส่วนที่เหลือในวันจัดงาน')
    }
    if (minGuests) bullets.push(`ราคานี้สำหรับขั้นต่ำ ${minGuests} คน`)
    if (paymentNotes) bullets.push(paymentNotes)

    for (const b of bullets) {
      page.drawText(`  -  ${b}`, { x: M + 4, y, size: 8, font, color: mid })
      y -= 14
    }
    y -= 24

    // ════════════════════════════════════════════════════════════
    //  SIGNATURE LINES
    // ════════════════════════════════════════════════════════════
    const sigW = 170
    const sLX = M + 30
    const sRX = width - M - sigW - 30

    page.drawLine({ start: { x: sLX, y }, end: { x: sLX + sigW, y }, thickness: 0.8, color: line })
    page.drawLine({ start: { x: sRX, y }, end: { x: sRX + sigW, y }, thickness: 0.8, color: line })
    y -= 14

    const lbl1 = 'ผู้เสนอราคา (ร้านอาหาร)'
    const lbl2 = 'ผู้อนุมัติ (ลูกค้า)'
    page.drawText(lbl1, { x: sLX + (sigW - font.widthOfTextAtSize(lbl1, 8)) / 2, y, size: 8, font, color: light })
    page.drawText(lbl2, { x: sRX + (sigW - font.widthOfTextAtSize(lbl2, 8)) / 2, y, size: 8, font, color: light })

    // ─── Footer ───
    const fY = 30
    page.drawLine({ start: { x: M, y: fY + 12 }, end: { x: width - M, y: fY + 12 }, thickness: 0.5, color: line })
    const fText = 'Madre Cafe & Restaurant  |  ร้านอาหาร ตำราแม่'
    page.drawText(fText, { x: (width - font.widthOfTextAtSize(fText, 7)) / 2, y: fY, size: 7, font, color: light })

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
