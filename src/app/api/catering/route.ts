import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import React from 'react'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import path from 'path'
import fs from 'fs'

// Register Thai fonts
const fontPath = path.join(process.cwd(), 'public', 'fonts')
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(fontPath, 'Sarabun-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(fontPath, 'Sarabun-SemiBold.ttf'), fontWeight: 'bold' },
  ],
})

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

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#4a7c59',
  },
  logo: {
    width: 50,
    height: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandInfo: {
    marginLeft: 10,
  },
  brandName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a7c59',
  },
  brandNameThai: {
    fontSize: 10,
    color: '#6b7280',
  },
  headerRight: {
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4a7c59',
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  infoColumn: {
    flex: 1,
    paddingRight: 15,
  },
  infoColumnRight: {
    flex: 1,
    paddingLeft: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4a7c59',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
  },
  infoText: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 2,
  },
  infoBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4a7c59',
    padding: 6,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: 5,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: 5,
    backgroundColor: '#f8faf8',
  },
  col1: { width: '6%', textAlign: 'center' },
  col2: { width: '24%' },
  col3: { width: '28%' },
  col4: { width: '12%', textAlign: 'center' },
  col5: { width: '15%', textAlign: 'right' },
  col6: { width: '15%', textAlign: 'right' },
  cellText: {
    fontSize: 9,
    color: '#1f2937',
  },
  menuSection: {
    marginBottom: 15,
  },
  menuHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f0',
    padding: 5,
  },
  menuHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4a7c59',
  },
  menuRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: 5,
  },
  menuCol1: { width: '25%' },
  menuCol2: { width: '75%' },
  bottomSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  paymentTerms: {
    flex: 1,
    paddingRight: 20,
  },
  summaryBox: {
    width: 180,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    borderRadius: 4,
    backgroundColor: '#fafafa',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 9,
    color: '#374151',
  },
  summaryDivider: {
    borderTopWidth: 1,
    borderTopColor: '#4a7c59',
    marginVertical: 5,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4a7c59',
  },
  summaryTotalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4a7c59',
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    marginBottom: 20,
  },
  signatureBlock: {
    alignItems: 'center',
    width: 150,
  },
  signatureLine: {
    width: 120,
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    marginBottom: 5,
    marginTop: 40,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  footer: {
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

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

function QuotationPDF({ data }: { data: QuotationData }) {
  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
  const depositAmount = data.depositPercent ? Math.round(data.grandTotal * (data.depositPercent / 100) * 100) / 100 : 0
  const remainingAmount = data.grandTotal - depositAmount

  // Check if logo exists
  const logoPath = path.join(process.cwd(), 'public', 'images', 'madre-logo.png')
  const logoExists = fs.existsSync(logoPath)

  return React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, { style: styles.headerLeft },
          logoExists && React.createElement(Image, { style: styles.logo, src: logoPath }),
          React.createElement(View, { style: styles.brandInfo },
            React.createElement(Text, { style: styles.brandName }, 'Madre Cafe & Restaurant'),
            React.createElement(Text, { style: styles.brandNameThai }, 'ร้านอาหาร ตำราแม่')
          )
        ),
        React.createElement(View, { style: styles.headerRight },
          React.createElement(Text, { style: styles.title }, 'ใบเสนอราคา'),
          React.createElement(Text, { style: styles.subtitle }, 'Catering Quotation'),
          React.createElement(Text, { style: styles.subtitle }, `เลขที่: ${data.quotationNumber}`),
          React.createElement(Text, { style: styles.subtitle }, `วันที่: ${today}`)
        )
      ),

      // Info Section
      React.createElement(View, { style: styles.infoSection },
        // Shop Info
        React.createElement(View, { style: styles.infoColumn },
          React.createElement(Text, { style: styles.sectionTitle }, 'ข้อมูลร้านค้า'),
          data.shopName && React.createElement(Text, { style: styles.infoBold }, data.shopName),
          data.quoterName && React.createElement(Text, { style: styles.infoText }, `ผู้เสนอราคา: ${data.quoterName}`),
          data.taxId && React.createElement(Text, { style: styles.infoText }, `เลขประจำตัวผู้เสียภาษี: ${data.taxId}`),
          data.shopAddress && React.createElement(Text, { style: styles.infoText }, data.shopAddress),
          data.shopPhone && React.createElement(Text, { style: styles.infoText }, `โทร: ${data.shopPhone}`),
          data.shopEmail && React.createElement(Text, { style: styles.infoText }, `อีเมล: ${data.shopEmail}`)
        ),
        // Customer Info
        React.createElement(View, { style: styles.infoColumnRight },
          React.createElement(Text, { style: styles.sectionTitle }, 'ข้อมูลลูกค้า / งาน'),
          data.customerName && React.createElement(Text, { style: styles.infoBold }, data.customerName),
          data.customerAddress && React.createElement(Text, { style: styles.infoText }, data.customerAddress),
          data.customerPhone && React.createElement(Text, { style: styles.infoText }, `โทร: ${data.customerPhone}`),
          data.customerEmail && React.createElement(Text, { style: styles.infoText }, `อีเมล: ${data.customerEmail}`),
          data.eventLocation && React.createElement(Text, { style: styles.infoText }, `สถานที่จัดงาน: ${data.eventLocation}`),
          data.eventDate && React.createElement(Text, { style: styles.infoText }, `วันที่จัดงาน: ${data.eventDate}`),
          data.guestCount && React.createElement(Text, { style: styles.infoText }, `จำนวนคน: ${data.guestCount} คน`)
        )
      ),

      // Items Table
      React.createElement(View, { style: styles.table },
        // Table Header
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col1] }, '#'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col2] }, 'รายการ'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col3] }, 'รายละเอียด'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col4] }, 'จำนวน'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col5] }, 'ราคา/หน่วย'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col6] }, 'รวม (บาท)')
        ),
        // Table Rows
        ...data.items.map((item, i) =>
          React.createElement(View, { key: i, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
            React.createElement(Text, { style: [styles.cellText, styles.col1] }, String(i + 1)),
            React.createElement(Text, { style: [styles.cellText, styles.col2] }, item.name || ''),
            React.createElement(Text, { style: [styles.cellText, styles.col3] }, item.detail || ''),
            React.createElement(Text, { style: [styles.cellText, styles.col4] }, item.quantityLabel || String(item.quantity)),
            React.createElement(Text, { style: [styles.cellText, styles.col5] }, fmtNum(item.unitPrice)),
            React.createElement(Text, { style: [styles.cellText, styles.col6] }, fmtNum(item.quantity * item.unitPrice))
          )
        )
      ),

      // Menu Categories
      data.menuCategories && data.menuCategories.some(c => c.category || c.items) &&
        React.createElement(View, { style: styles.menuSection },
          React.createElement(Text, { style: styles.sectionTitle }, 'รายการเมนูอาหาร'),
          React.createElement(View, { style: styles.menuHeader },
            React.createElement(Text, { style: [styles.menuHeaderText, styles.menuCol1] }, 'หมวด'),
            React.createElement(Text, { style: [styles.menuHeaderText, styles.menuCol2] }, 'รายการเมนู')
          ),
          ...data.menuCategories.filter(c => c.category || c.items).map((cat, i) =>
            React.createElement(View, { key: i, style: styles.menuRow },
              React.createElement(Text, { style: [styles.cellText, styles.menuCol1] }, cat.category || ''),
              React.createElement(Text, { style: [styles.cellText, styles.menuCol2] }, cat.items || '')
            )
          )
        ),

      // Bottom Section - Payment Terms & Summary
      React.createElement(View, { style: styles.bottomSection },
        // Payment Terms
        React.createElement(View, { style: styles.paymentTerms },
          React.createElement(Text, { style: styles.sectionTitle }, 'เงื่อนไขการชำระเงิน'),
          data.depositPercent > 0 && React.createElement(Text, { style: styles.infoText }, `- มัดจำ ${data.depositPercent}% : ${fmtNum(depositAmount)} บาท ก่อนวันงาน`),
          data.depositPercent > 0 && React.createElement(Text, { style: styles.infoText }, `- ชำระเงินส่วนที่เหลือ ${fmtNum(remainingAmount)} บาท ในวันจัดงาน`),
          data.depositPercent === 0 && React.createElement(Text, { style: styles.infoText }, '- ชำระเงินในวันจัดงาน'),
          data.minGuests > 0 && React.createElement(Text, { style: styles.infoText }, `- ราคานี้สำหรับขั้นต่ำ ${data.minGuests} คน`),
          data.paymentNotes && React.createElement(Text, { style: styles.infoText }, `- ${data.paymentNotes}`)
        ),
        // Summary Box
        React.createElement(View, { style: styles.summaryBox },
          React.createElement(View, { style: styles.summaryRow },
            React.createElement(Text, { style: styles.summaryLabel }, 'ราคารวม'),
            React.createElement(Text, { style: styles.summaryValue }, `${fmtNum(data.subtotal)} บาท`)
          ),
          data.vatRate > 0 && React.createElement(View, { style: styles.summaryRow },
            React.createElement(Text, { style: styles.summaryLabel }, `VAT ${data.vatRate}%`),
            React.createElement(Text, { style: styles.summaryValue }, `${fmtNum(data.vat)} บาท`)
          ),
          React.createElement(View, { style: styles.summaryDivider }),
          React.createElement(View, { style: styles.summaryTotal },
            React.createElement(Text, { style: styles.summaryTotalLabel }, 'ยอดรวมสุทธิ'),
            React.createElement(Text, { style: styles.summaryTotalValue }, `${fmtNum(data.grandTotal)} บาท`)
          )
        )
      ),

      // Signatures
      React.createElement(View, { style: styles.signatures },
        React.createElement(View, { style: styles.signatureBlock },
          React.createElement(View, { style: styles.signatureLine }),
          React.createElement(Text, { style: styles.signatureLabel }, 'ผู้เสนอราคา (ร้านอาหาร)')
        ),
        React.createElement(View, { style: styles.signatureBlock },
          React.createElement(View, { style: styles.signatureLine }),
          React.createElement(Text, { style: styles.signatureLabel }, 'ผู้อนุมัติ (ลูกค้า)')
        )
      ),

      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, 'Madre Cafe & Restaurant | ร้านอาหาร ตำราแม่')
      )
    )
  )
}

async function generatePDF(data: QuotationData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(QuotationPDF, { data }) as any
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
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
