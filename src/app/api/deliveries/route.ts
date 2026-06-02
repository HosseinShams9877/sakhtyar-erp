import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/deliveries — List delivery confirmations with purchase details
export async function GET(_req: NextRequest) {
  try {
    const deliveries = await db.deliveryConfirmation.findMany({
      include: {
        purchase: {
          include: {
            supplier: { select: { id: true, companyName: true, contactName: true } },
            project: { select: { id: true, name: true, location: true } },
            items: true,
          },
        },
        project: { select: { id: true, name: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(deliveries);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/deliveries — Create delivery confirmation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { purchaseId, projectId, deliveryDate, confirmedBy, notes } = body;

    if (!purchaseId || !projectId || !confirmedBy) {
      return NextResponse.json(
        { error: 'شناسه خرید، شناسه پروژه و نام تأییدکننده الزامی است' },
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

    // Check project exists
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: 'پروژه یافت نشد' },
        { status: 404 }
      );
    }

    // Check if delivery already confirmed for this purchase
    const existingDelivery = await db.deliveryConfirmation.findUnique({
      where: { purchaseId },
    });
    if (existingDelivery) {
      return NextResponse.json(
        { error: 'تحویل این خرید قبلاً تأیید شده است' },
        { status: 409 }
      );
    }

    // Create delivery confirmation and update purchase status
    const delivery = await db.$transaction(async (tx) => {
      const confirmation = await tx.deliveryConfirmation.create({
        data: {
          purchaseId,
          projectId,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          confirmedBy,
          notes: notes || null,
        },
        include: {
          purchase: {
            include: {
              supplier: true,
              project: true,
              items: true,
            },
          },
          project: true,
        },
      });

      // Mark purchase as delivered (change status from pending to delivered if still pending)
      if (purchase.status === 'pending') {
        await tx.purchase.update({
          where: { id: purchaseId },
          data: { status: 'delivered' },
        });
      }

      return confirmation;
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
