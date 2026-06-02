// ─── API نوتیفیکیشن‌های زنگوله ───
// هشدارهای سررسید خریدها — بدون نیاز به احراز هویت (نسخه ساده)
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/bell-notifications — دریافت نوتیفیکیشن‌های فعال
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0];
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    // خریدهای غیرپرداخت‌شده
    const purchases = await db.purchase.findMany({
      where: { status: { not: 'paid' } },
      include: {
        supplier: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const notifications: any[] = [];
    let unreadCount = 0;

    for (const p of purchases) {
      const dueDateStr = p.dueDate.toISOString().split('T')[0];
      const remaining = p.totalAmount - p.paidAmount;
      if (remaining <= 0) continue;

      let type = '';
      let level = '';
      let message = '';

      if (dueDateStr < today) {
        const daysOverdue = Math.ceil((new Date(today).getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24));
        type = 'overdue';
        level = 'red';
        message = `فاکتور ${p.invoiceNumber} — ${daysOverdue} روز معوق`;
        unreadCount++;
      } else if (dueDateStr === today) {
        type = 'due_today';
        level = 'red';
        message = `فاکتور ${p.invoiceNumber} — سررسید امروز`;
        unreadCount++;
      } else if (dueDateStr <= threeDaysStr) {
        type = '3_day';
        level = 'orange';
        message = `فاکتور ${p.invoiceNumber} — کمتر از ۳ روز مانده`;
        unreadCount++;
      } else if (dueDateStr <= sevenDaysStr) {
        type = '7_day';
        level = 'yellow';
        message = `فاکتور ${p.invoiceNumber} — کمتر از ۷ روز مانده`;
      } else {
        continue; // عادی‌ها نوتیفیکیشن نمی‌خواهند
      }

      notifications.push({
        id: `${p.id}_${type}`,
        type,
        level,
        message,
        purchaseId: p.id,
        invoiceNumber: p.invoiceNumber,
        projectName: p.project?.name,
        supplierName: p.supplier?.companyName,
        remainingAmount: remaining,
        dueDate: p.dueDate,
        createdAt: p.dueDate,
      });
    }

    // مرتب‌سازی: قرمز اول، بعد نارنجی، بعد زرد
    const levelOrder = { red: 0, orange: 1, yellow: 2 };
    notifications.sort((a, b) => {
      const la = levelOrder[a.level as keyof typeof levelOrder] ?? 3;
      const lb = levelOrder[b.level as keyof typeof levelOrder] ?? 3;
      if (la !== lb) return la - lb;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return NextResponse.json({
      notifications: notifications.slice(0, limit),
      unreadCount,
      totalCount: notifications.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('Bell notifications API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
