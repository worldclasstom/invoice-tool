import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import fontkit from '@pdf-lib/fontkit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      date,
      notes,
      items,
      subtotal,
      tax,
      total,
    } = body

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`

    // Save invoice to database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        date: new Date(date).toISOString(),
        notes: notes || null,
        subtotal,
        tax,
        total,
        status: 'issued',
        user_id: user.id,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Save line items
    if (items?.length > 0) {
      const lineItems = items.map((item: { description: string; quantity: number; unitPrice: number; amount: number }) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      }))

      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems)

      if (itemsError) throw itemsError
    }

    // Create a ledger entry
    await supabase.from('ledger_entries').insert({
      entry_date: new Date(date).toISOString().split('T')[0],
      description: `Invoice ${invoiceNumber} - ${customerName}`,
      entry_type: 'income',
      category: 'invoices',
      amount: total,
      payment_method: null,
      reference_type: 'invoice',
      reference_id: invoice.id,
      user_id: user.id,
    })

    // Load Noto Sans Thai font
    const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansThai-Regular.ttf')
    const fontBytes = fs.readFileSync(fontPath)

    // Generate PDF
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const page = pdfDoc.addPage([612, 792])
    const { width, height } = page.getSize()
    const thaiFont = await pdfDoc.embedFont(fontBytes)

    page.drawText('Madre Cafe & Restaurant', {
      x: 50,
      y: height - 50,
      size: 24,
      font: thaiFont,
    })

    page.drawText('4001 Phaya Khan, Mueang Phatthalung, Phatthalung 93000', {
      x: 50,
      y: height - 70,
      size: 10,
      font: thaiFont,
    })

    let currentY = height - 100
    page.drawText(`Invoice: ${invoiceNumber}`, {
      x: 50, y: currentY, size: 12, font: thaiFont,
    })

    const thaiDate = new Date(date).toLocaleDateString('th-TH', { dateStyle: 'long' })
    page.drawText(`Date: ${thaiDate}`, {
      x: 50, y: currentY - 20, size: 12, font: thaiFont,
    })

    // Customer info
    currentY -= 60
    page.drawText('Bill To:', { x: 50, y: currentY, size: 12, font: thaiFont })
    page.drawText(customerName, { x: 50, y: currentY - 18, size: 12, font: thaiFont })
    if (customerEmail) page.drawText(customerEmail, { x: 50, y: currentY - 36, size: 10, font: thaiFont })
    if (customerPhone) page.drawText(customerPhone, { x: 50, y: currentY - 52, size: 10, font: thaiFont })

    // Items table
    let y = currentY - 80
    const cols = [50, 300, 370, 450]

    page.drawText('Description', { x: cols[0], y, size: 11, font: thaiFont })
    page.drawText('Qty', { x: cols[1], y, size: 11, font: thaiFont })
    page.drawText('Price', { x: cols[2], y, size: 11, font: thaiFont })
    page.drawText('Amount', { x: cols[3], y, size: 11, font: thaiFont })
    y -= 18

    items.forEach((item: { description: string; quantity: number; unitPrice: number }) => {
      page.drawText(item.description, { x: cols[0], y, size: 11, font: thaiFont })
      page.drawText(item.quantity.toString(), { x: cols[1], y, size: 11, font: thaiFont })
      page.drawText(`${item.unitPrice.toFixed(2)}`, { x: cols[2], y, size: 11, font: thaiFont })
      page.drawText(`${(item.quantity * item.unitPrice).toFixed(2)}`, { x: cols[3], y, size: 11, font: thaiFont })
      y -= 18
    })

    y -= 18
    page.drawText('Subtotal:', { x: cols[2], y, size: 12, font: thaiFont })
    page.drawText(`${subtotal.toFixed(2)}`, { x: cols[3], y, size: 12, font: thaiFont })
    y -= 18
    page.drawText('Total:', { x: cols[2], y, size: 14, font: thaiFont })
    page.drawText(`${total.toFixed(2)} THB`, { x: cols[3], y, size: 14, font: thaiFont })

    if (notes) {
      y -= 36
      page.drawText('Notes:', { x: 50, y, size: 11, font: thaiFont })
      y -= 16
      page.drawText(notes, { x: 50, y, size: 11, font: thaiFont })
    }

    const pdfBytes = await pdfDoc.save()

    return NextResponse.json({
      invoice,
      pdf: Buffer.from(pdfBytes).toString('base64'),
    })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
