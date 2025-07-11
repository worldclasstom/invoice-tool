import { NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    } = body;

    // Generate invoice number (you might want to make this more sophisticated)
    const invoiceNumber = `INV-${Date.now()}`;

    // Create invoice in database
    // const invoice = await prisma.invoice.create({
    //   data: {
    //     invoiceNumber,
    //     customerName,
    //     customerEmail,
    //     customerPhone,
    //     dueDate: new Date(dueDate),
    //     notes,
    //     subtotal,
    //     tax,
    //     total,
    //     items: {
    //       create: items.map((item: any) => ({
    //         description: item.description,
    //         quantity: item.quantity,
    //         unitPrice: item.unitPrice,
    //         amount: item.amount,
    //       })),
    //     },
    //   },
    //   include: {
    //     items: true,
    //   },
    // });

    // Load Noto Sans Thai font
    const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansThai-Regular.ttf');
    const fontBytes = fs.readFileSync(fontPath);

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = page.getSize();
    const thaiFont = await pdfDoc.embedFont(fontBytes);

    // Add content to PDF
    page.drawText('Madre Cafe & Restaurant', {
      x: 50,
      y: height - 50,
      size: 24,
      font: thaiFont,
    });

    page.drawText(`Invoice #: ${invoiceNumber}`, {
      x: 50,
      y: height - 80,
      size: 12,
      font: thaiFont,
    });

    page.drawText(`Date: ${new Date(date).toLocaleDateString('en-GB')}`, {
      x: 50,
      y: height - 100,
      size: 12,
      font: thaiFont,
    });

    // Customer information
    page.drawText('Bill To:', {
      x: 50,
      y: height - 160,
      size: 12,
      font: thaiFont,
    });

    page.drawText(customerName, {
      x: 50,
      y: height - 180,
      size: 12,
      font: thaiFont,
    });

    if (customerEmail) {
      page.drawText(customerEmail, {
        x: 50,
        y: height - 200,
        size: 12,
        font: thaiFont,
      });
    }

    if (customerPhone) {
      page.drawText(customerPhone, {
        x: 50,
        y: height - 220,
        size: 12,
        font: thaiFont,
      });
    }

    // Items table
    let y = height - 280;
    const lineHeight = 20;
    const columns = [50, 250, 350, 450, 550];

    // Table headers
    page.drawText('Description', { x: columns[0], y, size: 12, font: thaiFont });
    page.drawText('Qty', { x: columns[1], y, size: 12, font: thaiFont });
    page.drawText('Price', { x: columns[2], y, size: 12, font: thaiFont });
    page.drawText('Amount', { x: columns[3], y, size: 12, font: thaiFont });

    y -= lineHeight;

    // Table rows
    items.forEach((item: any) => {
      page.drawText(item.description, { x: columns[0], y, size: 12, font: thaiFont });
      page.drawText(item.quantity.toString(), { x: columns[1], y, size: 12, font: thaiFont });
      page.drawText(`$${item.unitPrice.toFixed(2)}`, { x: columns[2], y, size: 12, font: thaiFont });
      page.drawText(`$${item.amount.toFixed(2)}`, { x: columns[3], y, size: 12, font: thaiFont });
      y -= lineHeight;
    });

    // Totals
    y -= lineHeight;
    page.drawText('Subtotal:', { x: columns[2], y, size: 12, font: thaiFont });
    page.drawText(`$${subtotal.toFixed(2)}`, { x: columns[3], y, size: 12, font: thaiFont });

    y -= lineHeight;
    page.drawText('Tax (7%):', { x: columns[2], y, size: 12, font: thaiFont });
    page.drawText(`$${tax.toFixed(2)}`, { x: columns[3], y, size: 12, font: thaiFont });

    y -= lineHeight;
    page.drawText('Total:', { x: columns[2], y, size: 12, font: thaiFont });
    page.drawText(`$${total.toFixed(2)}`, { x: columns[3], y, size: 12, font: thaiFont });

    // Notes
    if (notes) {
      y -= lineHeight * 2;
      page.drawText('Notes:', { x: 50, y, size: 12, font: thaiFont });
      y -= lineHeight;
      page.drawText(notes, { x: 50, y, size: 12, font: thaiFont });
    }

    // Add thank you message at the bottom
    const thankYouText = 'Thank you for your business!';
    const thankYouFontSize = 14;
    const thankYouWidth = thaiFont.widthOfTextAtSize(thankYouText, thankYouFontSize);
    const thankYouX = (width - thankYouWidth) / 2;
    const thankYouY = 40;
    page.drawText(thankYouText, {
      x: thankYouX,
      y: thankYouY,
      size: thankYouFontSize,
      font: thaiFont,
    });

    const pdfBytes = await pdfDoc.save();

    // Return both the invoice data and PDF
    return NextResponse.json({
      // invoice,
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