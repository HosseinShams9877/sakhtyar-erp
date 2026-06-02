// ─── PDF Export - خرید (فاکتور) ───
// بازنویسی شده با Purchase به جای Invoice
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { formatDate } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه خرید الزامی است' },
        { status: 400 }
      );
    }

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        project: true,
        items: true,
        payments: true,
        delivery: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'خرید یافت نشد' },
        { status: 404 }
      );
    }

    // ساخت PDF با PDFKit
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Purchase ${purchase.invoiceNumber}`,
        Author: 'سامانه مدیریت بدهی و سررسید',
        Subject: `خرید شماره ${purchase.invoiceNumber}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // ─── هدر ───
    doc.fontSize(20).font('Helvetica-Bold').text('PURCHASE INVOICE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text('Debt & Due-Date Management System', { align: 'center' });
    doc.moveDown(0.5);

    // خط جداکننده
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // ─── اطلاعات خرید ───
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      partial: 'Partial',
      paid: 'Paid',
      overdue: 'Overdue',
    };

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`Invoice No: ${purchase.invoiceNumber}`, 50, doc.y, { continued: true });
    doc.text(`Date: ${formatDate(purchase.purchaseDate)}`, { align: 'right' });
    doc.font('Helvetica');
    doc.text(`Status: ${statusMap[purchase.status] || purchase.status}`, 50, doc.y, { continued: true });
    doc.text(`Supplier: ${purchase.supplier?.companyName || 'N/A'}`, { align: 'right' });
    doc.text(`Project: ${purchase.project.name}`, 50, doc.y, { continued: true });
    doc.text(`Location: ${purchase.project.location}`, { align: 'right' });
    doc.text(`Due Date: ${formatDate(purchase.dueDate)}`, 50, doc.y, { continued: true });
    const remaining = purchase.totalAmount - purchase.paidAmount;
    doc.text(`Remaining: ${remaining.toLocaleString()} IRR`, { align: 'right' });
    doc.moveDown(1);

    // ─── جدول اقلام ───
    if (purchase.items.length > 0) {
      doc.font('Helvetica-Bold').fontSize(10);
      const tableTop = doc.y;
      const colWidths = [30, 150, 80, 80, 80, 75];
      const headers = ['#', 'Material', 'Quantity', 'Unit Price', 'Total Price', 'Unit'];

      let x = 50;
      doc.rect(50, tableTop - 5, 495, 20).fill('#f0f0f0').stroke();
      headers.forEach((header, i) => {
        doc.fillColor('#333333').text(header, x, tableTop, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(9);

      purchase.items.forEach((item, idx) => {
        const rowY = doc.y;
        x = 50;
        doc.fillColor('#333333');
        doc.text(`${idx + 1}`, x, rowY, { width: colWidths[0] });
        x += colWidths[0];
        doc.text(item.materialName, x, rowY, { width: colWidths[1] });
        x += colWidths[1];
        doc.text(item.quantity.toLocaleString(), x, rowY, { width: colWidths[2], align: 'right' });
        x += colWidths[2];
        doc.text(item.unitPrice.toLocaleString(), x, rowY, { width: colWidths[3], align: 'right' });
        x += colWidths[3];
        doc.text(item.totalPrice.toLocaleString(), x, rowY, { width: colWidths[4], align: 'right' });
        x += colWidths[4];
        doc.text(item.unit, x, rowY, { width: colWidths[5] });

        doc.moveDown(0.3);

        // خط بین ردیف‌ها
        if (idx < purchase.items.length - 1) {
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();
          doc.moveDown(0.3);
        }
      });
      doc.moveDown(0.5);
    }

    // ─── جمع کل ───
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#333333').stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`Total Amount:`, 300, doc.y, { continued: true, width: 120, align: 'left' });
    doc.text(`${purchase.totalAmount.toLocaleString()} IRR`, { width: 125, align: 'right' });
    doc.font('Helvetica').fontSize(10);
    doc.text(`Paid Amount:`, 300, doc.y, { continued: true, width: 120, align: 'left' });
    doc.text(`${purchase.paidAmount.toLocaleString()} IRR`, { width: 125, align: 'right' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Remaining:`, 300, doc.y, { continued: true, width: 120, align: 'left' });
    doc.text(`${remaining.toLocaleString()} IRR`, { width: 125, align: 'right' });

    // ─── تأیید تحویل ───
    if (purchase.delivery) {
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Delivery confirmed by: ${purchase.delivery.confirmedBy}`, 50);
      doc.text(`Delivery date: ${formatDate(purchase.delivery.deliveryDate)}`, 50);
      if (purchase.delivery.notes) {
        doc.text(`Notes: ${purchase.delivery.notes}`, 50);
      }
    }

    // ─── توضیحات ───
    if (purchase.description) {
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Description: ${purchase.description}`, 50);
    }

    // ─── پاورقی ───
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8).fillColor('#999999');
    doc.text('Generated by Debt & Due-Date Management System', { align: 'center' });
    doc.text(`Generated at: ${formatDate(new Date())} ${new Date().toLocaleTimeString('fa-IR')}`, { align: 'center' });

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="purchase-${purchase.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
