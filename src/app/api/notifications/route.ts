import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

// ─── API نوتیفیکیشن ───
// ترکیب نوتیفیکیشن‌های ذخیره‌شده + هشدارهای زنده سررسید

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const today = todayISO();
    const threeDaysLater = addDaysISO(3);
    const weekLater = addDaysISO(7);

    // ─── نوتیفیکیشن‌های ذخیره‌شده ───
    const storedNotifications = await db.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // ─── هشدارهای زنده سررسید ───
    const unpaidPurchases = await db.purchase.findMany({
      where: { status: { not: 'paid' } },
      include: {
        supplier: { select: { companyName: true } },
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    const liveNotifications: any[] = [];

    for (const p of unpaidPurchases) {
      const dueDateStr = p.dueDate.toISOString().split('T')[0];
      const remaining = p.totalAmount - p.paidAmount;
      if (remaining <= 0) continue;

      if (dueDateStr < today) {
        // سررسید گذشته
        const daysOverdue = Math.floor((new Date(today).getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24));
        liveNotifications.push({
          id: `overdue-${p.id}`,
          title: 'سررسید گذشته',
          message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysOverdue} روز معوقه — مبلغ: ${remaining.toLocaleString('fa-IR')} تومان`,
          type: 'error',
          isRead: false,
          link: `/invoices`,
          createdAt: p.dueDate.toISOString(),
        });
      } else if (dueDateStr <= threeDaysLater) {
        // سررسید ≤ ۳ روز
        const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        liveNotifications.push({
          id: `urgent-${p.id}`,
          title: 'سررسید نزدیک',
          message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft === 0 ? 'امروز' : `${daysLeft} روز مانده`} — مبلغ: ${remaining.toLocaleString('fa-IR')} تومان`,
          type: 'warning',
          isRead: false,
          link: `/invoices`,
          createdAt: new Date().toISOString(),
        });
      } else if (dueDateStr <= weekLater) {
        // سررسید ≤ ۷ روز
        const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        liveNotifications.push({
          id: `upcoming-${p.id}`,
          title: 'یادآوری سررسید',
          message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft} روز مانده تا سررسید — پروژه: ${p.project?.name || 'نامشخص'}`,
          type: 'info',
          isRead: false,
          link: `/invoices`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // ─── ترکیب نوتیفیکیشن‌ها ───
    const allNotifications = [
      ...liveNotifications,
      ...storedNotifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = allNotifications.filter(n => !n.isRead).length;

    return NextResponse.json({ notifications: allNotifications.slice(0, 50), unreadCount });
  } catch (error: any) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();

    // علامت‌گذاری همه به عنوان خوانده‌شده
    if (body.markAllRead) {
      await db.notification.updateMany({
        where: { userId: auth.userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    // علامت‌گذاری یک نوتیفیکیشن
    if (body.notificationId) {
      // فقط نوتیفیکیشن‌های ذخیره‌شده در DB قابل آپدیت هستند
      try {
        await db.notification.update({
          where: { id: body.notificationId },
          data: { isRead: true },
        });
      } catch {
        // نوتیفیکیشن زنده (overdue-xxx, urgent-xxx) — نادیده گرفته می‌شود
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: ایجاد نوتیفیکیشن جدید ───
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { title, message, type, link } = body;

    const notification = await db.notification.create({
      data: {
        userId: auth.userId,
        title: title || 'نوتیفیکیشن',
        message: message || '',
        type: type || 'info',
        link: link || null,
      },
    });

    return NextResponse.json({ notification });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
