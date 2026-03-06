import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, Document, Page, View, Text, Image, Font, StyleSheet } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'

// Register Thai font
Font.register({
  family: 'Kanit',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Kanit-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(process.cwd(), 'public/fonts/Kanit-Medium.ttf'), fontWeight: 'bold' },
  ],
})

// Disable hyphenation to prevent word breaking
Font.registerHyphenationCallback(word => [word])

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

// Styles
const styles = StyleSheet.create({
  page: { fontFamily: 'Kanit', fontSize: 9, padding: 40, color: '#1f1f1f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: { width: 50, height: 50, marginRight: 10 },
  headerTitle: { flexDirection: 'column' },
  brandName: { fontSize: 13, fontWeight: 'bold', color: '#2e7a4d' },
  brandNameThai: { fontSize: 9, color: '#595959', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#2e7a4d' },
  subtitle: { fontSize: 8, color: '#8c8c8c', marginTop: 2 },
  qnumber: { fontSize: 8, color: '#595959', marginTop: 3 },
  date: { fontSize: 8, color: '#8c8c8c', marginTop: 2 },
  divider: { height: 2, backgroundColor: '#2e7a4d', marginVertical: 10 },
  thinDivider: { height: 0.5, backgroundColor: '#d1d1d1', marginVertical: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 12 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: '#2e7a4d', marginBottom: 4 },
  infoName: { fontSize: 9, color: '#1f1f1f', marginBottom: 2 },
  infoText: { fontSize: 8, color: '#595959', marginBottom: 2 },
  table: { marginVertical: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#2e7a4d', padding: 5 },
  tableHeaderText: { color: '#ffffff', fontSize: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.3, borderBottomColor: '#d1d1d1' },
  tableRowAlt: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.3, borderBottomColor: '#d1d1d1', backgroundColor: '#f7faf7' },
  tableCell: { fontSize: 8, color: '#1f1f1f' },
  tableCellMuted: { fontSize: 8, color: '#595959' },
  colNo: { width: 25 },
  colName: { width: 130 },
  colDetail: { width: 110, paddingRight: 5 },
  colQty: { width: 60 },
  colPrice: { width: 70 },
  colTotal: { width: 80, textAlign: 'right' },
  menuSection: { marginVertical: 10 },
  menuHeader: { flexDirection: 'row', backgroundColor: '#f0f5f0', padding: 5 },
  menuRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.3, borderBottomColor: '#d1d1d1' },
  menuCategory: { width: 120 },
  menuItems: { flex: 1 },
  summaryBox: { alignSelf: 'flex-end', width: 210, backgroundColor: '#f0f5f0', padding: 10, marginVertical: 10, borderWidth: 0.5, borderColor: '#d1d1d1' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 9, color: '#595959' },
  summaryValue: { fontSize: 9, color: '#1f1f1f' },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#2e7a4d', paddingTop: 6, marginTop: 4 },
  summaryTotalLabel: { fontSize: 11, fontWeight: 'bold', color: '#2e7a4d' },
  summaryTotalValue: { fontSize: 11, fontWeight: 'bold', color: '#2e7a4d' },
  paymentSection: { marginVertical: 10 },
  paymentTitle: { fontSize: 10, fontWeight: 'bold', color: '#2e7a4d', marginBottom: 6 },
  paymentText: { fontSize: 8, color: '#595959', marginBottom: 3 },
  signatureSection: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, marginBottom: 20 },
  signatureBox: { alignItems: 'center' },
  signatureLine: { width: 150, borderBottomWidth: 0.8, borderBottomColor: '#d1d1d1', marginBottom: 8 },
  signatureLabel: { fontSize: 8, color: '#8c8c8c' },
  footer: { position: 'absolute', bottom: 25, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: '#d1d1d1', paddingTop: 8 },
  footerText: { fontSize: 7, color: '#8c8c8c', textAlign: 'center' },
})

interface Item {
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
  items: Item[]
  menuCategories: MenuCategory[]
  vatPercent: number
  depositPercent: number
  minGuests: number
  paymentNotes: string
  quotationNumber: string
  subtotal: number
  vat: number
  grandTotal: number
}

function QuotationDocument({ data }: { data: QuotationData }) {
  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
  const eventDateStr = data.eventDate 
    ? new Date(data.eventDate + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })
    : ''

  const depRate = Number(data.depositPercent) || 0
  const depAmount = depRate > 0 ? Math.round(data.grandTotal * (depRate / 100) * 100) / 100 : 0
  const remaining = data.grandTotal - depAmount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image style={styles.logo} src={path.join(process.cwd(), 'public/images/madre-logo.png')} />
            <View style={styles.headerTitle}>
              <Text style={styles.brandName}>Madre Cafe & Restaurant</Text>
              <Text style={styles.brandNameThai}>ร้านอาหาร ตำราแม่</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>ใบเสนอราคา</Text>
            <Text style={styles.subtitle}>Catering Quotation</Text>
            <Text style={styles.qnumber}>เลขที่ : {data.quotationNumber}</Text>
            <Text style={styles.date}>วันที่ : {today}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Shop & Customer Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>ข้อมูลร้านค้า</Text>
            {data.shopName && <Text style={styles.infoName}>{data.shopName}</Text>}
            {data.quoterName && <Text style={styles.infoText}>ผู้เสนอราคา: {data.quoterName}</Text>}
            {data.shopAddress && <Text style={styles.infoText}>{data.shopAddress}</Text>}
            {data.shopPhone && <Text style={styles.infoText}>โทร: {data.shopPhone}</Text>}
            {data.shopEmail && <Text style={styles.infoText}>อีเมล: {data.shopEmail}</Text>}
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>ข้อมูลลูกค้า / งาน</Text>
            {data.customerName && <Text style={styles.infoName}>{data.customerName}</Text>}
            {data.customerAddress && <Text style={styles.infoText}>{data.customerAddress}</Text>}
            {data.customerPhone && <Text style={styles.infoText}>โทร: {data.customerPhone}</Text>}
            {data.customerEmail && <Text style={styles.infoText}>อีเมล: {data.customerEmail}</Text>}
            {data.eventLocation && <Text style={styles.infoText}>สถานที่จัดงาน: {data.eventLocation}</Text>}
            {eventDateStr && <Text style={styles.infoText}>วันที่จัดงาน: {eventDateStr}</Text>}
            {data.guestCount && <Text style={styles.infoText}>จำนวนคน: {data.guestCount} คน</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNo]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colName]}>รายการ</Text>
            <Text style={[styles.tableHeaderText, styles.colDetail]}>รายละเอียด</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>จำนวน</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>ราคา/หน่วย</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>รวม (บาท)</Text>
          </View>
          {(data.items || []).map((item, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRowAlt : styles.tableRow}>
              <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
              <Text style={[styles.tableCellMuted, styles.colDetail]}>{item.detail}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantityLabel || item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{fmtBaht(item.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>{fmtBaht(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Menu Categories */}
        {data.menuCategories?.length > 0 && data.menuCategories.some(c => c.category || c.items) && (
          <View style={styles.menuSection}>
            <Text style={styles.paymentTitle}>รายการเมนูอาหาร</Text>
            <View style={styles.menuHeader}>
              <Text style={[styles.tableHeaderText, styles.menuCategory, { color: '#2e7a4d' }]}>หมวด</Text>
              <Text style={[styles.tableHeaderText, styles.menuItems, { color: '#2e7a4d' }]}>รายการเมนู</Text>
            </View>
            {data.menuCategories.filter(c => c.category || c.items).map((cat, i) => (
              <View key={i} style={styles.menuRow}>
                <Text style={[styles.tableCell, styles.menuCategory]}>{cat.category}</Text>
                <Text style={[styles.tableCellMuted, styles.menuItems]}>{cat.items}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ราคารวม</Text>
            <Text style={styles.summaryValue}>{fmtBaht(data.subtotal)} บาท</Text>
          </View>
          {data.vat > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT {data.vatPercent}%</Text>
              <Text style={styles.summaryValue}>{fmtBaht(data.vat)} บาท</Text>
            </View>
          )}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>ยอดรวมสุทธิ</Text>
            <Text style={styles.summaryTotalValue}>{fmtBaht(data.grandTotal)} บาท</Text>
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>เงื่อนไขการชำระเงิน</Text>
          {depRate > 0 && (
            <>
              <Text style={styles.paymentText}>- มัดจำ {data.depositPercent}% : {fmtBaht(depAmount)} บาท ก่อนวันงาน</Text>
              <Text style={styles.paymentText}>- ชำระเงินส่วนที่เหลือ {fmtBaht(remaining)} บาท ในวันจัดงาน</Text>
            </>
          )}
          {!depRate && <Text style={styles.paymentText}>- ชำระเงินในวันจัดงาน</Text>}
          {data.minGuests && <Text style={styles.paymentText}>- ราคานี้สำหรับขั้นต่ำ {data.minGuests} คน</Text>}
          {data.paymentNotes && <Text style={styles.paymentText}>- {data.paymentNotes}</Text>}
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>ผู้เสนอราคา (ร้านอาหาร)</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>ผู้อนุมัติ (ลูกค้า)</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Madre Cafe & Restaurant | ร้านอาหาร ตำราแม่</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const subtotal = (items ?? []).reduce(
      (s: number, i: Item) => s + i.quantity * i.unitPrice, 0,
    )
    const vatRate = Number(vatPercent) || 0
    const vat = vatRate > 0 ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0
    const grandTotal = subtotal + vat

    const quotationData: QuotationData = {
      shopName, quoterName, shopAddress, shopPhone, shopEmail,
      customerName, customerAddress, customerPhone, customerEmail,
      eventLocation, eventDate, guestCount,
      items: items || [],
      menuCategories: menuCategories || [],
      vatPercent: vatRate,
      depositPercent,
      minGuests,
      paymentNotes,
      quotationNumber,
      subtotal,
      vat,
      grandTotal,
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotationDocument, { data: quotationData })
    )

    return NextResponse.json({
      pdf: pdfBuffer.toString('base64'),
      quotationNumber,
      quotation: { subtotal, vat, grandTotal },
    })
  } catch (error) {
    console.error('Error creating catering quotation:', error)
    return NextResponse.json({ error: 'Failed to create quotation' }, { status: 500 })
  }
}
