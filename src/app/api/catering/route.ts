import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'

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

async function generatePDF(data: QuotationData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Load Thai font
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  const fontUrl = `${baseUrl}/fonts/Sarabun-Regular.ttf`
  const fontBoldUrl = `${baseUrl}/fonts/Sarabun-SemiBold.ttf`
  
  try {
    const [fontResponse, fontBoldResponse] = await Promise.all([
      fetch(fontUrl),
      fetch(fontBoldUrl)
    ])
    
    if (fontResponse.ok && fontBoldResponse.ok) {
      const fontBuffer = await fontResponse.arrayBuffer()
      const fontBoldBuffer = await fontBoldResponse.arrayBuffer()
      const fontBase64 = Buffer.from(fontBuffer).toString('base64')
      const fontBoldBase64 = Buffer.from(fontBoldBuffer).toString('base64')
      
      doc.addFileToVFS('Sarabun-Regular.ttf', fontBase64)
      doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal')
      doc.addFileToVFS('Sarabun-Bold.ttf', fontBoldBase64)
      doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold')
      doc.setFont('Sarabun')
    }
  } catch (e) {
    console.error('Font loading error:', e)
    // Continue with default font
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  const green = [74, 124, 89] as [number, number, number]
  const gray = [107, 114, 128] as [number, number, number]
  const darkGray = [31, 41, 55] as [number, number, number]
  
  let y = margin
  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })

  // Header - Logo and Title
  // Try to load logo
  try {
    const logoUrl = `${baseUrl}/images/madre-logo.png`
    const logoResponse = await fetch(logoUrl)
    if (logoResponse.ok) {
      const logoBuffer = await logoResponse.arrayBuffer()
      const logoBase64 = Buffer.from(logoBuffer).toString('base64')
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', margin, y, 25, 25)
    }
  } catch (e) {
    console.error('Logo loading error:', e)
  }

  // Brand name
  doc.setFontSize(14)
  doc.setFont('Sarabun', 'bold')
  doc.setTextColor(...green)
  doc.text('Madre Cafe & Restaurant', margin + 30, y + 8)
  
  doc.setFontSize(10)
  doc.setFont('Sarabun', 'normal')
  doc.setTextColor(...gray)
  doc.text('ร้านอาหาร ตำราแม่', margin + 30, y + 14)

  // Title on right
  doc.setFontSize(20)
  doc.setFont('Sarabun', 'bold')
  doc.setTextColor(...green)
  doc.text('ใบเสนอราคา', pageWidth - margin, y + 5, { align: 'right' })
  
  doc.setFontSize(9)
  doc.setFont('Sarabun', 'normal')
  doc.setTextColor(...gray)
  doc.text('Catering Quotation', pageWidth - margin, y + 11, { align: 'right' })
  doc.text(`เลขที่: ${data.quotationNumber}`, pageWidth - margin, y + 17, { align: 'right' })
  doc.text(`วันที่: ${today}`, pageWidth - margin, y + 23, { align: 'right' })

  y += 30
  
  // Green line under header
  doc.setDrawColor(...green)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // Info sections - Shop and Customer side by side
  const colWidth = (contentWidth - 10) / 2
  
  // Shop info
  doc.setFontSize(11)
  doc.setFont('Sarabun', 'bold')
  doc.setTextColor(...green)
  doc.text('ข้อมูลร้านค้า', margin, y)
  
  // Customer info header
  doc.text('ข้อมูลลูกค้า / งาน', margin + colWidth + 10, y)
  
  y += 2
  doc.setDrawColor(209, 213, 219)
  doc.setLineWidth(0.2)
  doc.line(margin, y, margin + colWidth, y)
  doc.line(margin + colWidth + 10, y, pageWidth - margin, y)
  y += 5

  doc.setFontSize(9)
  doc.setFont('Sarabun', 'normal')
  doc.setTextColor(...darkGray)

  // Shop details
  let shopY = y
  if (data.shopName) {
    doc.setFont('Sarabun', 'bold')
    doc.text(data.shopName, margin, shopY)
    doc.setFont('Sarabun', 'normal')
    shopY += 4
  }
  if (data.quoterName) {
    doc.setTextColor(...gray)
    doc.text(`ผู้เสนอราคา: ${data.quoterName}`, margin, shopY)
    shopY += 4
  }
  if (data.taxId) {
    doc.text(`เลขประจำตัวผู้เสียภาษี: ${data.taxId}`, margin, shopY)
    shopY += 4
  }
  if (data.shopAddress) {
    const addressLines = doc.splitTextToSize(data.shopAddress, colWidth - 5)
    doc.text(addressLines, margin, shopY)
    shopY += addressLines.length * 4
  }
  if (data.shopPhone) {
    doc.text(`โทร: ${data.shopPhone}`, margin, shopY)
    shopY += 4
  }
  if (data.shopEmail) {
    doc.text(`อีเมล: ${data.shopEmail}`, margin, shopY)
    shopY += 4
  }

  // Customer details
  let custY = y
  const custX = margin + colWidth + 10
  doc.setTextColor(...darkGray)
  if (data.customerName) {
    doc.setFont('Sarabun', 'bold')
    doc.text(data.customerName, custX, custY)
    doc.setFont('Sarabun', 'normal')
    custY += 4
  }
  doc.setTextColor(...gray)
  if (data.customerAddress) {
    const addressLines = doc.splitTextToSize(data.customerAddress, colWidth - 5)
    doc.text(addressLines, custX, custY)
    custY += addressLines.length * 4
  }
  if (data.customerPhone) {
    doc.text(`โทร: ${data.customerPhone}`, custX, custY)
    custY += 4
  }
  if (data.customerEmail) {
    doc.text(`อีเมล: ${data.customerEmail}`, custX, custY)
    custY += 4
  }
  if (data.eventLocation) {
    doc.text(`สถานที่จัดงาน: ${data.eventLocation}`, custX, custY)
    custY += 4
  }
  if (data.eventDate) {
    doc.text(`วันที่จัดงาน: ${data.eventDate}`, custX, custY)
    custY += 4
  }
  if (data.guestCount) {
    doc.text(`จำนวนคน: ${data.guestCount} คน`, custX, custY)
    custY += 4
  }

  y = Math.max(shopY, custY) + 8

  // Items table
  const colWidths = [10, 40, 45, 20, 25, 30]
  const headers = ['#', 'รายการ', 'รายละเอียด', 'จำนวน', 'ราคา/หน่วย', 'รวม (บาท)']
  
  // Table header
  doc.setFillColor(...green)
  doc.rect(margin, y, contentWidth, 7, 'F')
  
  doc.setFontSize(9)
  doc.setFont('Sarabun', 'bold')
  doc.setTextColor(255, 255, 255)
  
  let xPos = margin + 2
  headers.forEach((header, i) => {
    const align = i === 0 ? 'center' : (i >= 4 ? 'right' : 'left')
    const textX = align === 'center' ? xPos + colWidths[i] / 2 : (align === 'right' ? xPos + colWidths[i] - 2 : xPos)
    doc.text(header, textX, y + 5, { align: align as 'left' | 'center' | 'right' })
    xPos += colWidths[i]
  })
  
  y += 7

  // Table rows
  doc.setFont('Sarabun', 'normal')
  data.items.forEach((item, i) => {
    const rowHeight = 7
    const bgColor = i % 2 === 0 ? [255, 255, 255] : [248, 250, 248]
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
    doc.rect(margin, y, contentWidth, rowHeight, 'F')
    
    doc.setTextColor(...darkGray)
    xPos = margin + 2
    
    // Row number
    doc.text(String(i + 1), xPos + colWidths[0] / 2, y + 5, { align: 'center' })
    xPos += colWidths[0]
    
    // Name
    doc.text(item.name || '', xPos, y + 5)
    xPos += colWidths[1]
    
    // Detail
    doc.text(item.detail || '', xPos, y + 5)
    xPos += colWidths[2]
    
    // Quantity
    doc.text(item.quantityLabel || String(item.quantity), xPos + colWidths[3] / 2, y + 5, { align: 'center' })
    xPos += colWidths[3]
    
    // Unit price
    doc.text(fmtNum(item.unitPrice), xPos + colWidths[4] - 2, y + 5, { align: 'right' })
    xPos += colWidths[4]
    
    // Total
    doc.text(fmtNum(item.quantity * item.unitPrice), xPos + colWidths[5] - 2, y + 5, { align: 'right' })
    
    // Bottom border
    doc.setDrawColor(229, 231, 235)
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight)
    
    y += rowHeight
  })

  y += 5

  // Menu categories section
  if (data.menuCategories && data.menuCategories.some(c => c.category || c.items)) {
    doc.setFontSize(11)
    doc.setFont('Sarabun', 'bold')
    doc.setTextColor(...green)
    doc.text('รายการเมนูอาหาร', margin, y)
    y += 6
    
    // Menu table header
    doc.setFillColor(240, 244, 240)
    doc.rect(margin, y, contentWidth, 6, 'F')
    doc.setFontSize(9)
    doc.setTextColor(...green)
    doc.text('หมวด', margin + 2, y + 4)
    doc.text('รายการเมนู', margin + 42, y + 4)
    y += 6
    
    // Menu rows
    doc.setFont('Sarabun', 'normal')
    doc.setTextColor(...darkGray)
    data.menuCategories.filter(c => c.category || c.items).forEach(cat => {
      doc.text(cat.category || '', margin + 2, y + 4)
      const menuLines = doc.splitTextToSize(cat.items || '', contentWidth - 45)
      doc.text(menuLines, margin + 42, y + 4)
      const rowH = Math.max(6, menuLines.length * 4 + 2)
      doc.setDrawColor(229, 231, 235)
      doc.line(margin, y + rowH, pageWidth - margin, y + rowH)
      y += rowH
    })
    y += 5
  }

  // Payment and Summary section
  const summaryBoxWidth = 70
  const summaryX = pageWidth - margin - summaryBoxWidth
  
  // Payment terms on left
  doc.setFontSize(10)
  doc.setFont('Sarabun', 'bold')
  doc.setTextColor(...green)
  doc.text('เงื่อนไขการชำระเงิน', margin, y)
  y += 5
  
  doc.setFontSize(9)
  doc.setFont('Sarabun', 'normal')
  doc.setTextColor(...gray)
  
  const depositAmount = data.depositPercent ? Math.round(data.grandTotal * (data.depositPercent / 100) * 100) / 100 : 0
  const remainingAmount = data.grandTotal - depositAmount
  
  let paymentY = y
  if (data.depositPercent) {
    doc.text(`- มัดจำ ${data.depositPercent}% : ${fmtNum(depositAmount)} บาท ก่อนวันงาน`, margin, paymentY)
    paymentY += 4
    doc.text(`- ชำระเงินส่วนที่เหลือ ${fmtNum(remainingAmount)} บาท ในวันจัดงาน`, margin, paymentY)
    paymentY += 4
  } else {
    doc.text('- ชำระเงินในวันจัดงาน', margin, paymentY)
    paymentY += 4
  }
  if (data.minGuests) {
    doc.text(`- ราคานี้สำหรับขั้นต่ำ ${data.minGuests} คน`, margin, paymentY)
    paymentY += 4
  }
  if (data.paymentNotes) {
    doc.text(`- ${data.paymentNotes}`, margin, paymentY)
    paymentY += 4
  }

  // Summary box on right
  const boxY = y - 5
  doc.setDrawColor(209, 213, 219)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(summaryX, boxY, summaryBoxWidth, 35, 2, 2, 'FD')
  
  let sumY = boxY + 8
  doc.setTextColor(...darkGray)
  doc.text('ราคารวม', summaryX + 5, sumY)
  doc.text(`${fmtNum(data.subtotal)} บาท`, summaryX + summaryBoxWidth - 5, sumY, { align: 'right' })
  sumY += 6
  
  if (data.vatRate > 0) {
    doc.text(`VAT ${data.vatRate}%`, summaryX + 5, sumY)
    doc.text(`${fmtNum(data.vat)} บาท`, summaryX + summaryBoxWidth - 5, sumY, { align: 'right' })
    sumY += 6
  }
  
  // Total line
  doc.setDrawColor(...green)
  doc.setLineWidth(0.5)
  doc.line(summaryX + 5, sumY, summaryX + summaryBoxWidth - 5, sumY)
  sumY += 6
  
  doc.setFont('Sarabun', 'bold')
  doc.setTextColor(...green)
  doc.text('ยอดรวมสุทธิ', summaryX + 5, sumY)
  doc.text(`${fmtNum(data.grandTotal)} บาท`, summaryX + summaryBoxWidth - 5, sumY, { align: 'right' })

  y = Math.max(paymentY, boxY + 40) + 15

  // Signatures
  const sigWidth = 60
  const sigGap = 40
  const sig1X = margin + 20
  const sig2X = pageWidth - margin - sigWidth - 20

  doc.setDrawColor(156, 163, 175)
  doc.setLineWidth(0.3)
  
  // Signature lines
  doc.line(sig1X, y + 25, sig1X + sigWidth, y + 25)
  doc.line(sig2X, y + 25, sig2X + sigWidth, y + 25)
  
  doc.setFontSize(9)
  doc.setFont('Sarabun', 'normal')
  doc.setTextColor(...gray)
  doc.text('ผู้เสนอราคา (ร้านอาหาร)', sig1X + sigWidth / 2, y + 30, { align: 'center' })
  doc.text('ผู้อนุมัติ (ลูกค้า)', sig2X + sigWidth / 2, y + 30, { align: 'center' })

  y += 40

  // Footer
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text('Madre Cafe & Restaurant | ร้านอาหาร ตำราแม่', pageWidth / 2, y + 5, { align: 'center' })

  // Return buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
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
    const pdfBuffer = await generatePDF({
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

    const base64Pdf = pdfBuffer.toString('base64')
    return NextResponse.json({ pdf: base64Pdf, quotationNumber })

  } catch (error) {
    console.error('[CATERING PDF ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF', details: String(error) }, { status: 500 })
  }
}
