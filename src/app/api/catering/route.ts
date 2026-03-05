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
      shopPhone,
      shopContact,
      customerName,
      eventLocation,
      eventDate,
      guestCount,
      items,
      menuCategories,
      vatPercent,
      shopAddress,
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

    // Load Thai font
    const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansThai-Regular.ttf')
    const fontBytes = fs.readFileSync(fontPath)

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const thaiFont = await pdfDoc.embedFont(fontBytes)

    const page = pdfDoc.addPage([612, 842]) // A4-ish
    const { width, height } = page.getSize()
    const green = rgb(0.22, 0.47, 0.34)
    const darkGray = rgb(0.2, 0.2, 0.2)
    const gray = rgb(0.45, 0.45, 0.45)
    const lightLine = rgb(0.85, 0.85, 0.85)

    let y = height - 50

    // ─── Header ───
    page.drawText('ใบเสนอราคางานจัดเลี้ยง', { x: 50, y, size: 22, font: thaiFont, color: green })
    y -= 18
    page.drawText('Catering Quotation', { x: 50, y, size: 12, font: thaiFont, color: gray })
    y -= 30

    // ─── Shop info ───
    if (shopName) { page.drawText(`ชื่อร้าน: ${shopName}`, { x: 50, y, size: 10, font: thaiFont, color: darkGray }); y -= 16 }
    if (shopAddress) { page.drawText(`ที่อยู่: ${shopAddress}`, { x: 50, y, size: 10, font: thaiFont, color: darkGray }); y -= 16 }
    if (shopPhone) { page.drawText(`โทร: ${shopPhone}`, { x: 50, y, size: 10, font: thaiFont, color: darkGray }); y -= 16 }
    if (shopContact) { page.drawText(`Line / Email: ${shopContact}`, { x: 50, y, size: 10, font: thaiFont, color: darkGray }); y -= 16 }
    y -= 8

    // ─── Customer info ───
    if (customerName) { page.drawText(`ลูกค้า / สำนักงาน / บริษัท: ${customerName}`, { x: 50, y, size: 10, font: thaiFont, color: darkGray }); y -= 16 }
    if (eventLocation) { page.drawText(`สถานที่จัดงาน: ${eventLocation}`, { x: 50, y, size: 10, font: thaiFont, color: darkGray }); y -= 16 }
    if (eventDate) {
      const d = new Date(eventDate + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
      page.drawText(`วันที่จัดงาน: ${d}`, { x: 50, y, size: 10, font: thaiFont, color: darkGray })
      y -= 16
    }
    if (guestCount) { page.drawText(`จำนวนแขก: ${guestCount} คน`, { x: 50, y, size: 10, font: thaiFont, color: darkGray }); y -= 16 }
    y -= 12

    // ─── Items table ───
    page.drawRectangle({ x: 50, y: y - 2, width: width - 100, height: 20, color: rgb(0.93, 0.96, 0.93) })
    const cols = [50, 205, 310, 370, 440, 510]
    page.drawText('ลำดับ', { x: cols[0] + 4, y: y + 2, size: 9, font: thaiFont, color: green })
    page.drawText('รายการ', { x: cols[1] + 4, y: y + 2, size: 9, font: thaiFont, color: green })
    page.drawText('รายละเอียด', { x: cols[2] + 4, y: y + 2, size: 9, font: thaiFont, color: green })
    page.drawText('จำนวน', { x: cols[3] + 4, y: y + 2, size: 9, font: thaiFont, color: green })
    page.drawText('ราคา/หน่วย', { x: cols[4] + 4, y: y + 2, size: 9, font: thaiFont, color: green })
    page.drawText('รวม', { x: cols[5] + 4, y: y + 2, size: 9, font: thaiFont, color: green })
    y -= 22

    for (let i = 0; i < (items ?? []).length; i++) {
      const item = items[i]
      const lineTotal = (item.quantity ?? 0) * (item.unitPrice ?? 0)
      page.drawText(String(i + 1), { x: cols[0] + 4, y, size: 9, font: thaiFont, color: darkGray })
      page.drawText(String(item.name ?? ''), { x: cols[1] + 4, y, size: 9, font: thaiFont, color: darkGray })
      page.drawText(String(item.detail ?? ''), { x: cols[2] + 4, y, size: 9, font: thaiFont, color: darkGray })
      page.drawText(String(item.quantityLabel ?? item.quantity ?? ''), { x: cols[3] + 4, y, size: 9, font: thaiFont, color: darkGray })
      page.drawText(fmtBaht(item.unitPrice ?? 0), { x: cols[4] + 4, y, size: 9, font: thaiFont, color: darkGray })
      page.drawText(fmtBaht(lineTotal), { x: cols[5] + 4, y, size: 9, font: thaiFont, color: darkGray })
      y -= 16
      page.drawLine({ start: { x: 50, y: y + 12 }, end: { x: width - 50, y: y + 12 }, thickness: 0.5, color: lightLine })
    }
    y -= 12

    // ─── Menu categories ───
    if (menuCategories?.length > 0) {
      page.drawText('เมนูอาหาร', { x: 50, y, size: 12, font: thaiFont, color: green })
      y -= 20
      page.drawRectangle({ x: 50, y: y - 2, width: width - 100, height: 18, color: rgb(0.93, 0.96, 0.93) })
      page.drawText('หมวด', { x: 54, y: y + 2, size: 9, font: thaiFont, color: green })
      page.drawText('รายการเมนู', { x: 200, y: y + 2, size: 9, font: thaiFont, color: green })
      y -= 20

      for (const cat of menuCategories) {
        page.drawText(String(cat.category ?? ''), { x: 54, y, size: 9, font: thaiFont, color: darkGray })
        page.drawText(String(cat.items ?? ''), { x: 200, y, size: 9, font: thaiFont, color: darkGray })
        y -= 16
      }
      y -= 12
    }

    // ─── Summary ───
    page.drawText('สรุปราคา', { x: 50, y, size: 12, font: thaiFont, color: green })
    y -= 20
    page.drawText(`Subtotal`, { x: 380, y, size: 10, font: thaiFont, color: gray })
    page.drawText(`${fmtBaht(subtotal)} บาท`, { x: 470, y, size: 10, font: thaiFont, color: darkGray })
    y -= 16
    if (vatRate > 0) {
      page.drawText(`VAT ${vatRate}%`, { x: 380, y, size: 10, font: thaiFont, color: gray })
      page.drawText(`${fmtBaht(vat)} บาท`, { x: 470, y, size: 10, font: thaiFont, color: darkGray })
      y -= 16
    }
    page.drawLine({ start: { x: 380, y: y + 12 }, end: { x: width - 50, y: y + 12 }, thickness: 1, color: green })
    page.drawText(`ยอดรวมสุทธิ`, { x: 380, y, size: 11, font: thaiFont, color: green })
    page.drawText(`${fmtBaht(grandTotal)} บาท`, { x: 470, y, size: 11, font: thaiFont, color: green })
    y -= 24

    // ─── Payment terms ───
    page.drawText('เงื่อนไขการชำระเงิน', { x: 50, y, size: 12, font: thaiFont, color: green })
    y -= 18
    if (depositPercent) { page.drawText(`• มัดจำ ${depositPercent}% ก่อนวันงาน`, { x: 60, y, size: 9, font: thaiFont, color: darkGray }); y -= 14 }
    page.drawText('• ชำระเงินส่วนที่เหลือในวันจัดงาน', { x: 60, y, size: 9, font: thaiFont, color: darkGray }); y -= 14
    if (minGuests) { page.drawText(`• ราคานี้สำหรับขั้นต่ำ ${minGuests} คน`, { x: 60, y, size: 9, font: thaiFont, color: darkGray }); y -= 14 }
    if (paymentNotes) { page.drawText(`• ${paymentNotes}`, { x: 60, y, size: 9, font: thaiFont, color: darkGray }); y -= 14 }
    y -= 24

    // ─── Signatures ───
    page.drawLine({ start: { x: 50, y }, end: { x: 230, y }, thickness: 0.5, color: lightLine })
    page.drawLine({ start: { x: 350, y }, end: { x: width - 50, y }, thickness: 0.5, color: lightLine })
    y -= 14
    page.drawText('ผู้เสนอราคา (ร้านอาหาร)', { x: 55, y, size: 9, font: thaiFont, color: gray })
    page.drawText('ผู้อนุมัติ (ลูกค้า)', { x: 370, y, size: 9, font: thaiFont, color: gray })

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
