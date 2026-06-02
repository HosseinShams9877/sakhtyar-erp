import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/payments — List payments, optionally filtered by purchaseId
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const purchaseId = url.searchParams.get('purchaseId') || '';

    const where: Record<string, string> = {};
    if (purchaseId) where.purchaseId = purchaseId;

    const payments = await db.payment.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        purchase: {
          include: {
            supplier: { select: { id: true, companyName: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json(payments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/payments — Create payment and update purchase status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { purchaseId, amount, paymentDate, note } = body;

    if (!purchaseId || amount === undefined) {
      return NextResponse.json(
        { error: 'شناسه خرید و مبلغ پرداخت الزامی است' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (numericAmount <= 0) {
      return NextResponse.json(
        { error: 'مبلغ پرداخت باید بیشتر از صفر باشد' },
        { status: 400 }
      );
    }

    // Check purchase exists
    const purchase = await db.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      return NextResponse.json(
        { error: 'خرید یافت نشد' },
        { status: 404 }
      );
    }

    // Create payment and update purchase in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the payment
      const payment = await tx.payment.create({
        data: {
          purchaseId,
          amount: numericAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          note: note || null,
        },
        include: {
          purchase: {
            include: {
              supplier: { select: { id: true, companyName: true } },
              project: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Update purchase paidAmount
      const newPaidAmount = purchase.paidAmount + numericAmount;

      // Determine new status
      let newStatus = purchase.status;
      if (newPaidAmount >= purchase.totalAmount) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return { payment, newPaidAmount, newStatus };
    });

    return NextResponse.json(
      {
        payment: result.payment,
        purchaseUpdate: {
          paidAmount: result.newPaidAmount,
          status: result.newStatus,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
