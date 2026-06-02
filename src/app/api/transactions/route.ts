// ─── API تراکنش‌ها ───
// مدل Transaction, WarehouseStock, Material حذف شده‌اند
// تراکنش‌ها از خریدها و پرداخت‌ها استخراج می‌شوند
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const type = url.searchParams.get('type') || '';

    // Build where clause for purchases
    const purchaseWhere: Record<string, unknown> = {};
    if (projectId) purchaseWhere.projectId = projectId;
    if (supplierId) purchaseWhere.supplierId = supplierId;

    // Fetch purchases as "purchase transactions"
    const purchases = await db.purchase.findMany({
      where: purchaseWhere,
      include: {
        supplier: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        items: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 100,
    });

    // Build transaction-like records from purchases and payments
    const transactions: any[] = [];

    for (const purchase of purchases) {
      // Filter by type
      if (type && type !== 'PURCHASE' && type !== 'PAYMENT') continue;

      if (!type || type === 'PURCHASE') {
        transactions.push({
          id: `purchase-${purchase.id}`,
          type: 'PURCHASE',
          date: purchase.purchaseDate,
          description: purchase.description || `فاکتور ${purchase.invoiceNumber}`,
          totalPrice: purchase.totalAmount,
          quantity: purchase.items.reduce((sum, i) => sum + i.quantity, 0),
          invoiceNumber: purchase.invoiceNumber,
          status: purchase.status,
          supplier: purchase.supplier,
          project: purchase.project,
          materialNames: purchase.items.map(i => i.materialName).join('، '),
        });
      }

      if (!type || type === 'PAYMENT') {
        for (const payment of purchase.payments) {
          transactions.push({
            id: `payment-${payment.id}`,
            type: 'PAYMENT',
            date: payment.paymentDate,
            description: payment.note || `پرداخت فاکتور ${purchase.invoiceNumber}`,
            totalPrice: payment.amount,
            quantity: 1,
            invoiceNumber: purchase.invoiceNumber,
            supplier: purchase.supplier,
            project: purchase.project,
          });
        }
      }
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // مدل Transaction حذف شده — ایجاد تراکنش از طریق خرید یا پرداخت
  return NextResponse.json(
    { error: 'تراکنش مستقل پشتیبانی نمی‌شود — از ثبت خرید یا پرداخت استفاده کنید' },
    { status: 501 }
  );
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(
    { error: 'تراکنش مستقل پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { error: 'تراکنش مستقل پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}
