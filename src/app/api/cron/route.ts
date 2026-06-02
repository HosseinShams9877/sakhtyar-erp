// ─── API زمان‌بندی شده (Cron) ───
// بروزرسانی خودکار وضعیت خریدهای سررسید گذشته و ایجاد یادآوری‌ها
// این مسیر باید توسط یک سرویس خارجی (مثل cron-job.org) هر ساعت فراخوانی شود

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET || 'erp-cron-secret-2024';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const results: string[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ۱. بروزرسانی خریدهای سررسید گذشته به overdue
    // Only update purchases that are not fully paid and have a dueDate in the past
    const overdueResult = await db.purchase.updateMany({
      where: {
        status: { in: ['pending', 'partial'] },
        dueDate: { lt: now },
      },
      data: { status: 'overdue' },
    });
    if (overdueResult.count > 0) {
      results.push(`${overdueResult.count} خرید به حالت سررسید‌شده تغییر یافت`);
    }

    // ۲. بروزرسانی خریدهای پرداخت‌شده
    // If paidAmount >= totalAmount, mark as paid
    const purchasesToCheck = await db.purchase.findMany({
      where: {
        status: { in: ['pending', 'partial', 'overdue'] },
      },
      include: { payments: true },
    });

    let paidCount = 0;
    for (const purchase of purchasesToCheck) {
      const totalPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid >= purchase.totalAmount && purchase.totalAmount > 0) {
        await db.purchase.update({
          where: { id: purchase.id },
          data: { status: 'paid', paidAmount: totalPaid },
        });
        paidCount++;
      }
    }
    if (paidCount > 0) {
      results.push(`${paidCount} خرید به حالت پرداخت‌شده تغییر یافت`);
    }

    // ۳. بررسی و ایجاد یادآوری‌ها (7_day, 3_day, due_day, overdue)
    const upcomingPurchases = await db.purchase.findMany({
      where: {
        status: { in: ['pending', 'partial'] },
      },
      include: {
        reminders: true,
        supplier: true,
        project: true,
      },
    });

    let remindersCreated = 0;

    for (const purchase of upcomingPurchases) {
      const dueDate = new Date(purchase.dueDate);
      const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const diffDays = Math.floor((dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determine which reminder types should be created based on days until due
      const neededReminders: Array<{ type: string; condition: boolean }> = [
        { type: '7_day', condition: diffDays <= 7 && diffDays > 3 },
        { type: '3_day', condition: diffDays <= 3 && diffDays > 0 },
        { type: 'due_day', condition: diffDays === 0 },
      ];

      for (const needed of neededReminders) {
        if (!needed.condition) continue;

        // Check if this reminder type was already sent
        const alreadySent = purchase.reminders.some(
          (r) => r.reminderType === needed.type
        );
        if (alreadySent) continue;

        await db.reminderLog.create({
          data: {
            purchaseId: purchase.id,
            reminderType: needed.type,
            sentAt: new Date(),
          },
        });
        remindersCreated++;
      }
    }

    // ۴. ایجاد یادآوری overdue برای خریدهایی که تازه سررسید گذشته‌اند
    const overduePurchases = await db.purchase.findMany({
      where: {
        status: 'overdue',
      },
      include: {
        reminders: true,
      },
    });

    for (const purchase of overduePurchases) {
      const alreadySent = purchase.reminders.some(
        (r) => r.reminderType === 'overdue'
      );
      if (!alreadySent) {
        await db.reminderLog.create({
          data: {
            purchaseId: purchase.id,
            reminderType: 'overdue',
            sentAt: new Date(),
          },
        });
        remindersCreated++;
      }
    }

    if (remindersCreated > 0) {
      results.push(`${remindersCreated} یادآوری ایجاد شد`);
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results: results.length > 0 ? results : ['هیچ تغییری لازم نبود'],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Cron error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
