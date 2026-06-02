// ─── API هشدارها (لاگ یادآوری) ───
// بازنویسی شده با ReminderLog به جای Alert
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ─── GET /api/alerts ───
// List reminder logs with filters: purchaseId, reminderType
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const purchaseId = url.searchParams.get('purchaseId') || '';
    const reminderType = url.searchParams.get('reminderType') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const where: Record<string, unknown> = {};
    if (purchaseId) where.purchaseId = purchaseId;
    if (reminderType) where.reminderType = reminderType;

    const reminders = await db.reminderLog.findMany({
      where,
      include: {
        purchase: {
          include: {
            supplier: true,
            project: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(reminders);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Reminder list error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/alerts ───
// Create a new reminder log entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { purchaseId, reminderType } = body;

    if (!purchaseId || !reminderType) {
      return NextResponse.json(
        { error: 'شناسه خرید و نوع یادآوری الزامی است' },
        { status: 400 }
      );
    }

    const validTypes = ['7_day', '3_day', 'due_day', 'overdue'];
    if (!validTypes.includes(reminderType)) {
      return NextResponse.json(
        { error: 'نوع یادآوری نامعتبر است' },
        { status: 400 }
      );
    }

    // Verify purchase exists
    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) {
      return NextResponse.json(
        { error: 'خرید یافت نشد' },
        { status: 404 }
      );
    }

    const reminder = await db.reminderLog.create({
      data: {
        purchaseId,
        reminderType,
        sentAt: new Date(),
      },
      include: {
        purchase: {
          include: {
            supplier: true,
            project: true,
          },
        },
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Reminder create error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT /api/alerts ───
// Not implemented for ReminderLog
export async function PUT(_req: NextRequest) {
  return NextResponse.json(
    { error: 'این عملیات برای لاگ یادآوری پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}

// ─── DELETE /api/alerts ───
// Delete a reminder log by id
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه یادآوری الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.reminderLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'یادآوری یافت نشد' },
        { status: 404 }
      );
    }

    await db.reminderLog.delete({ where: { id } });

    return NextResponse.json({ message: 'یادآوری با موفقیت حذف شد' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Reminder delete error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
