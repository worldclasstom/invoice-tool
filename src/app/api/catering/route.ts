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
      shopName,
      shopAddress,
      shopPhone,
      shopContact,
    customerName,
    customerAddress,
    customerPhone,
    customerEmail,
    eventLocation,
      eventDate,
      guestCount,
      items,
      menuCategories,
      vatPercent,
      depositPercent,
      minGuests,
      paymentNotes,
    } = body

    // Calculate totals
    const subtotal = (items ?? []).reduce(
      (s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice,
      0
    )
    const vatRate = Number(vatPercent) || 0
    const vat = vatRate > 0 ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0
    const grandTotal = subtotal + vat

    // Load fonts
    const fontDir = path.join(process.cwd(), 'public/fonts')
    const regularBytes = fs.readFileSync(path.join(fontDir, 'NotoSansThai-Regular.ttf'))

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const font = await pdfDoc.embedFont(regularBytes)

    // Load and embed the logo
    const logoPath = path.join(process.cwd(), 'public/images/madre-logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)
    const logoDims = logoImage.scale(0.5)
    const logoW = Math.min(logoDims.width, 70)
    const logoH = (logoW / logoDims.width) * logoDims.height

    const page = pdfDoc.addPage([612, 842]) // A4
    const { width, height } = page.getSize()
    const margin = 50

    // ─── Brand Colors ───
    const brandGreen = rgb(0.22, 0.47, 0.34)
    const darkText = rgb(0.15, 0.15, 0.15)
    const midGray = rgb(0.4, 0.4, 0.4)
    const lightGray = rgb(0.6, 0.6, 0.6)
    const lineColor = rgb(0.82, 0.82, 0.82)
    const headerBg = rgb(0.22, 0.47, 0.34)
    const headerText = rgb(1, 1, 1)
    const altRowBg = rgb(0.96, 0.98, 0.96)
    const accentBg = rgb(0.93, 0.96, 0.93)

    let y = height - 45

    // ============================================================
    //  HEADER: Logo + Restaurant Name + Quotation Title
    // ============================================================
    // Draw logo
    page.drawImage(logoImage, {
      x: margin,
      y: y - logoH + 10,
      width: logoW,
      height: logoH,
    })

    // Restaurant name to the right of logo
    const textX = margin + logoW + 14
    page.drawText('Madre Cafe & Restaurant', {
      x: textX, y: y, size: 16, font, color: brandGreen,
    })
    page.drawText('ร้านอาหาร ตำราแม่', {
      x: textX, y: y - 18, size: 11, font, color: midGray,
    })

    // Quotation title on the right side
    const titleText = 'ใบเสนอราคาจัดเลี้ยง'
    const titleWidth = font.widthOfTextAtSize(titleText, 18)
    page.drawText(titleText, {
      x: width - margin - titleWidth, y: y, size: 18, font, color: brandGreen,
    })
    const subTitleText = 'Catering Quotation'
    const subTitleWidth = font.widthOfTextAtSize(subTitleText, 9)
    page.drawText(subTitleText, {
      x: width - margin - subTitleWidth, y: y - 16, size: 9, font, color: lightGray,
    })

    // Date on the right
    const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
    const dateText = `วันที่: ${today}`
    const dateWidth = font.widthOfTextAtSize(dateText, 8)
    page.drawText(dateText, {
      x: width - margin - dateWidth, y: y - 30, size: 8, font, color: lightGray,
    })

    y -= Math.max(logoH, 50) + 12

    // Divider
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1.5, color: brandGreen })
    y -= 20

    // ============================================================
    //  INFO SECTION: Shop + Customer side by side
    // ============================================================
    const halfW = (width - margin * 2 - 20) / 2
    const leftX = margin
    const rightX = margin + halfW + 20

    // Shop Info
    page.drawText('ข้อมูลร้านค้า', { x: leftX, y, size: 10, font, color: brandGreen })
    y -= 15
    if (shopName) { page.drawText(shopName, { x: leftX, y, size: 9, font, color: darkText }); y -= 13 }
    if (shopAddress) { page.drawText(shopAddress, { x: leftX, y, size: 8, font, color: midGray }); y -= 13 }
    if (shopPhone) { page.drawText(`โทร: ${shopPhone}`, { x: leftX, y, size: 8, font, color: midGray }); y -= 13 }
    if (shopContact) { page.drawText(`Line / Email: ${shopContact}`, { x: leftX, y, size: 8, font, color: midGray }); y -= 13 }

    // Customer Info (on the right, reset y to same start as shop info)
    const shopLines = [shopName, shopAddress, shopPhone, shopContact].filter(Boolean).length
    let rightY = y + shopLines * 13 + 15
    page.drawText('ข้อมูลลูกค้า / งาน', { x: rightX, y: rightY, size: 10, font, color: brandGreen })
    rightY -= 15
    if (customerName) { page.drawText(customerName, { x: rightX, y: rightY, size: 9, font, color: darkText }); rightY -= 13 }
    if (customerAddress) { page.drawText(customerAddress, { x: rightX, y: rightY, size: 8, font, color: midGray }); rightY -= 13 }
    if (customerPhone) { page.drawText(`โทร: ${customerPhone}`, { x: rightX, y: rightY, size: 8, font, color: midGray }); rightY -= 13 }
    if (customerEmail) { page.drawText(`อีเมล: ${customerEmail}`, { x: rightX, y: rightY, size: 8, font, color: midGray }); rightY -= 13 }
    if (eventLocation) { page.drawText(`สถานที่: ${eventLocation}`, { x: rightX, y: rightY, size: 8, font, color: midGray }); rightY -= 13 }
    if (eventDate) {
      const d = new Date(eventDate + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
      page.drawText(`วันที่จัดงาน: ${d}`, { x: rightX, y: rightY, size: 8, font, color: midGray })
      rightY -= 13
    }
    if (guestCount) { page.drawText(`จำนวนแขก: ${guestCount} คน`, { x: rightX, y: rightY, size: 8, font, color: midGray }); rightY -= 13 }

    y = Math.min(y, rightY) - 14

    // ============================================================
    //  ITEMS TABLE
    // ============================================================
    const tableW = width - margin * 2
    const colX = [margin, margin + 32, margin + 210, margin + 310, margin + 380, margin + 455]
    const rowH = 18

    // Table header
    page.drawRectangle({ x: margin, y: y - 4, width: tableW, height: rowH + 4, color: headerBg })
    page.drawText('#', { x: colX[0] + 6, y: y + 1, size: 8, font, color: headerText })
    page.drawText('รายการ', { x: colX[1] + 4, y: y + 1, size: 8, font, color: headerText })
    page.drawText('รายละเอียด', { x: colX[2] + 4, y: y + 1, size: 8, font, color: headerText })
    page.drawText('จำนวน', { x: colX[3] + 4, y: y + 1, size: 8, font, color: headerText })
    page.drawText('ราคา/หน่วย', { x: colX[4] + 4, y: y + 1, size: 8, font, color: headerText })
    page.drawText('รวม (บาท)', { x: colX[5] + 4, y: y + 1, size: 8, font, color: headerText })
    y -= rowH + 4

    // Table rows
    for (let i = 0; i < (items ?? []).length; i++) {
      const item = items[i]
      const lineTotal = (item.quantity ?? 0) * (item.unitPrice ?? 0)

      // Alternate row background
      if (i % 2 === 0) {
        page.drawRectangle({ x: margin, y: y - 4, width: tableW, height: rowH, color: altRowBg })
      }

      page.drawText(String(i + 1), { x: colX[0] + 6, y: y + 1, size: 8, font, color: darkText })

      // Truncate long text
      const nameText = String(item.name ?? '').substring(0, 28)
      page.drawText(nameText, { x: colX[1] + 4, y: y + 1, size: 8, font, color: darkText })

      const detailText = String(item.detail ?? '').substring(0, 18)
      page.drawText(detailText, { x: colX[2] + 4, y: y + 1, size: 8, font, color: midGray })

      const qtyText = String(item.quantityLabel || item.quantity || '')
      page.drawText(qtyText, { x: colX[3] + 4, y: y + 1, size: 8, font, color: darkText })

      page.drawText(fmtBaht(item.unitPrice ?? 0), { x: colX[4] + 4, y: y + 1, size: 8, font, color: darkText })

      const totalText = fmtBaht(lineTotal)
      const totalW = font.widthOfTextAtSize(totalText, 8)
      page.drawText(totalText, { x: width - margin - totalW - 4, y: y + 1, size: 8, font, color: darkText })

      y -= rowH
      page.drawLine({ start: { x: margin, y: y + 14 }, end: { x: width - margin, y: y + 14 }, thickness: 0.3, color: lineColor })
    }
    y -= 8

    // ============================================================
    //  MENU CATEGORIES
    // ============================================================
    if (menuCategories?.length > 0 && menuCategories.some((c: { category: string; items: string }) => c.category || c.items)) {
      page.drawText('รายการเมนูอาหาร', { x: margin, y, size: 10, font, color: brandGreen })
      y -= 16

      // Menu header
      page.drawRectangle({ x: margin, y: y - 4, width: tableW, height: rowH + 2, color: accentBg })
      page.drawText('หมวด', { x: margin + 6, y: y + 1, size: 8, font, color: brandGreen })
      page.drawText('รายการเมนู', { x: margin + 150, y: y + 1, size: 8, font, color: brandGreen })
      y -= rowH + 2

      for (const cat of menuCategories) {
        if (!cat.category && !cat.items) continue
        page.drawText(String(cat.category ?? ''), { x: margin + 6, y: y + 1, size: 8, font, color: darkText })
        // Wrap long items text
        const itemsText = String(cat.items ?? '')
        const maxChars = 70
        if (itemsText.length > maxChars) {
          page.drawText(itemsText.substring(0, maxChars), { x: margin + 150, y: y + 1, size: 8, font, color: midGray })
          y -= 13
          page.drawText(itemsText.substring(maxChars), { x: margin + 150, y: y + 1, size: 8, font, color: midGray })
        } else {
          page.drawText(itemsText, { x: margin + 150, y: y + 1, size: 8, font, color: midGray })
        }
        y -= 15
        page.drawLine({ start: { x: margin, y: y + 11 }, end: { x: width - margin, y: y + 11 }, thickness: 0.3, color: lineColor })
      }
      y -= 8
    }

    // ============================================================
    //  SUMMARY BOX
    // ============================================================
    const summaryW = 220
    const summaryX = width - margin - summaryW
    const summaryStartY = y

    // Summary background
    const summaryRows = 2 + (vatRate > 0 ? 1 : 0)
    const summaryH = summaryRows * 18 + 26
    page.drawRectangle({ x: summaryX - 8, y: summaryStartY - summaryH + 10, width: summaryW + 8, height: summaryH, color: accentBg, borderColor: lineColor, borderWidth: 0.5 })

    page.drawText('ราคารวม', { x: summaryX, y, size: 8, font, color: midGray })
    page.drawText(`${fmtBaht(subtotal)} บาท`, { x: summaryX + summaryW - font.widthOfTextAtSize(`${fmtBaht(subtotal)} บาท`, 8) - 8, y, size: 8, font, color: darkText })
    y -= 18

    if (vatRate > 0) {
      page.drawText(`VAT ${vatRate}%`, { x: summaryX, y, size: 8, font, color: midGray })
      page.drawText(`${fmtBaht(vat)} บาท`, { x: summaryX + summaryW - font.widthOfTextAtSize(`${fmtBaht(vat)} บาท`, 8) - 8, y, size: 8, font, color: darkText })
      y -= 18
    }

    page.drawLine({ start: { x: summaryX, y: y + 14 }, end: { x: summaryX + summaryW - 8, y: y + 14 }, thickness: 1, color: brandGreen })
    page.drawText('ยอดรวมสุทธิ', { x: summaryX, y, size: 11, font, color: brandGreen })
    const grandTotalText = `${fmtBaht(grandTotal)} บาท`
    page.drawText(grandTotalText, { x: summaryX + summaryW - font.widthOfTextAtSize(grandTotalText, 11) - 8, y, size: 11, font, color: brandGreen })
    y -= 30

    // ============================================================
    //  PAYMENT TERMS
    // ============================================================
    page.drawText('เงื่อนไขการชำระเงิน', { x: margin, y, size: 10, font, color: brandGreen })
    y -= 16
    const bulletItems: string[] = []
    if (depositPercent) bulletItems.push(`มัดจำ ${depositPercent}% ก่อนวันงาน`)
    bulletItems.push('ชำระเงินส่วนที่เหลือในวันจัดงาน')
    if (minGuests) bulletItems.push(`ราคานี้สำหรับขั้นต่ำ ${minGuests} คน`)
    if (paymentNotes) bulletItems.push(paymentNotes)

    for (const bullet of bulletItems) {
      page.drawText(`  -  ${bullet}`, { x: margin + 4, y, size: 8, font, color: midGray })
      y -= 14
    }
    y -= 20

    // ============================================================
    //  SIGNATURE LINES
    // ============================================================
    const sigLineW = 180
    const leftSigX = margin + 20
    const rightSigX = width - margin - sigLineW - 20

    page.drawLine({ start: { x: leftSigX, y }, end: { x: leftSigX + sigLineW, y }, thickness: 0.8, color: lineColor })
    page.drawLine({ start: { x: rightSigX, y }, end: { x: rightSigX + sigLineW, y }, thickness: 0.8, color: lineColor })
    y -= 14

    const leftLabel = 'ผู้เสนอราคา (ร้านอาหาร)'
    const rightLabel = 'ผู้อนุมัติ (ลูกค้า)'
    const leftLabelW = font.widthOfTextAtSize(leftLabel, 8)
    const rightLabelW = font.widthOfTextAtSize(rightLabel, 8)
    page.drawText(leftLabel, { x: leftSigX + (sigLineW - leftLabelW) / 2, y, size: 8, font, color: lightGray })
    page.drawText(rightLabel, { x: rightSigX + (sigLineW - rightLabelW) / 2, y, size: 8, font, color: lightGray })

    // ─── Footer ───
    const footerY = 30
    page.drawLine({ start: { x: margin, y: footerY + 12 }, end: { x: width - margin, y: footerY + 12 }, thickness: 0.5, color: lineColor })
    const footerText = 'Madre Cafe & Restaurant  |  ร้านอาหาร ตำราแม่'
    const footerW = font.widthOfTextAtSize(footerText, 7)
    page.drawText(footerText, { x: (width - footerW) / 2, y: footerY, size: 7, font, color: lightGray })

    const pdfBytes = await pdfDoc.save()

    return NextResponse.json({
      pdf: Buffer.from(pdfBytes).toString('base64'),
      quotation: { subtotal, vat, grandTotal },
    })
  } catch (error) {
    console.error('Error creating catering quotation:', error)
    return NextResponse.json(
      { error: 'Failed to create quotation' },
      { status: 500 }
    )
  }
}
