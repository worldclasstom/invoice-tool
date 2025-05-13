import { NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      dueDate,
      notes,
      items,
      subtotal,
      tax,
      total,
    } = body;

    // Generate invoice number (you might want to make this more sophisticated)
    const invoiceNumber = `INV-${Date.now()}`;

    // Create invoice in database
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerName,
        customerEmail,
        customerPhone,
        dueDate: new Date(dueDate),
        notes,
        subtotal,
        tax,
        total,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add content to PDF
    page.drawText('Madre Restaurant', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
    });

    page.drawText(`Invoice #: ${invoiceNumber}`, {
      x: 50,
      y: height - 80,
      size: 12,
      font,
    });

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 100,
      size: 12,
      font,
    });

    page.drawText(`Due Date: ${new Date(dueDate).toLocaleDateString()}`, {
      x: 50,
      y: height - 120,
      size: 12,
      font,
    });

    // Customer information
    page.drawText('Bill To:', {
      x: 50,
      y: height - 160,
      size: 12,
      font: boldFont,
    });

    page.drawText(customerName, {
      x: 50,
      y: height - 180,
      size: 12,
      font,
    });

    if (customerEmail) {
      page.drawText(customerEmail, {
        x: 50,
        y: height - 200,
        size: 12,
        font,
      });
    }

    if (customerPhone) {
      page.drawText(customerPhone, {
        x: 50,
        y: height - 220,
        size: 12,
        font,
      });
    }

    // Items table
    let y = height - 280;
    const lineHeight = 20;
    const columns = [50, 250, 350, 450, 550];

    // Table headers
    page.drawText('Description', { x: columns[0], y, size: 12, font: boldFont });
    page.drawText('Qty', { x: columns[1], y, size: 12, font: boldFont });
    page.drawText('Price', { x: columns[2], y, size: 12, font: boldFont });
    page.drawText('Amount', { x: columns[3], y, size: 12, font: boldFont });

    y -= lineHeight;

    // Table rows
    items.forEach((item: any) => {
      page.drawText(item.description, { x: columns[0], y, size: 12, font });
      page.drawText(item.quantity.toString(), { x: columns[1], y, size: 12, font });
      page.drawText(`$${item.unitPrice.toFixed(2)}`, { x: columns[2], y, size: 12, font });
      page.drawText(`$${item.amount.toFixed(2)}`, { x: columns[3], y, size: 12, font });
      y -= lineHeight;
    });

    // Totals
    y -= lineHeight;
    page.drawText('Subtotal:', { x: columns[2], y, size: 12, font: boldFont });
    page.drawText(`$${subtotal.toFixed(2)}`, { x: columns[3], y, size: 12, font });

    y -= lineHeight;
    page.drawText('Tax (8.25%):', { x: columns[2], y, size: 12, font: boldFont });
    page.drawText(`$${tax.toFixed(2)}`, { x: columns[3], y, size: 12, font });

    y -= lineHeight;
    page.drawText('Total:', { x: columns[2], y, size: 12, font: boldFont });
    page.drawText(`$${total.toFixed(2)}`, { x: columns[3], y, size: 12, font });

    // Notes
    if (notes) {
      y -= lineHeight * 2;
      page.drawText('Notes:', { x: 50, y, size: 12, font: boldFont });
      y -= lineHeight;
      page.drawText(notes, { x: 50, y, size: 12, font });
    }

    const pdfBytes = await pdfDoc.save();

    // Return both the invoice data and PDF
    return NextResponse.json({
      invoice,
      pdf: Buffer.from(pdfBytes).toString('base64'),
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
} 