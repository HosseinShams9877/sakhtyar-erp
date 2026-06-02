import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper: get today's date as ISO date string (YYYY-MM-DD)
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper: add days to today and return ISO string
function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// GET /api/reminders/check — Smart Due Date Reminder Engine
export async function GET(_req: NextRequest) {
  try {
    const today = todayISO();
    const threeDaysLater = addDaysISO(3);
    const sevenDaysLater = addDaysISO(7);

    // Fetch all unpaid/partial/overdue purchases
    const purchases = await db.purchase.findMany({
      where: {
        status: { in: ['pending', 'partial', 'overdue'] },
      },
      include: {
        supplier: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        reminders: true,
      },
    });

    // Fetch existing reminders to avoid duplicates
    const existingReminders = await db.reminderLog.findMany({
      select: { purchaseId: true, reminderType: true },
    });

    const existingSet = new Set(
      existingReminders.map((r) => `${r.purchaseId}:${r.reminderType}`)
    );

    let newRemindersCount = 0;
    const newReminders: { purchaseId: string; reminderType: string; invoiceNumber: string }[] = [];

    // Process each purchase
    for (const purchase of purchases) {
      const dueDateStr = purchase.dueDate.toISOString().split('T')[0];
      const key7Day = `${purchase.id}:7_day`;
      const key3Day = `${purchase.id}:3_day`;
      const keyDueDay = `${purchase.id}:due_day`;
      const keyOverdue = `${purchase.id}:overdue`;

      // ─── Overdue check ───
      if (dueDateStr < today) {
        // Update purchase status to overdue
        if (purchase.status !== 'overdue') {
          await db.purchase.update({
            where: { id: purchase.id },
            data: { status: 'overdue' },
          });
        }

        // Create overdue reminder if not exists
        if (!existingSet.has(keyOverdue)) {
          await db.reminderLog.create({
            data: {
              purchaseId: purchase.id,
              reminderType: 'overdue',
            },
          });
          newRemindersCount++;
          newReminders.push({
            purchaseId: purchase.id,
            reminderType: 'overdue',
            invoiceNumber: purchase.invoiceNumber,
          });
        }
      }

      // ─── Due today check ───
      if (dueDateStr === today) {
        if (!existingSet.has(keyDueDay)) {
          await db.reminderLog.create({
            data: {
              purchaseId: purchase.id,
              reminderType: 'due_day',
            },
          });
          newRemindersCount++;
          newReminders.push({
            purchaseId: purchase.id,
            reminderType: 'due_day',
            invoiceNumber: purchase.invoiceNumber,
          });
        }
      }

      // ─── 3-day warning ───
      if (dueDateStr > today && dueDateStr <= threeDaysLater) {
        if (!existingSet.has(key3Day)) {
          await db.reminderLog.create({
            data: {
              purchaseId: purchase.id,
              reminderType: '3_day',
            },
          });
          newRemindersCount++;
          newReminders.push({
            purchaseId: purchase.id,
            reminderType: '3_day',
            invoiceNumber: purchase.invoiceNumber,
          });
        }
      }

      // ─── 7-day warning ───
      if (dueDateStr > today && dueDateStr <= sevenDaysLater) {
        if (!existingSet.has(key7Day)) {
          await db.reminderLog.create({
            data: {
              purchaseId: purchase.id,
              reminderType: '7_day',
            },
          });
          newRemindersCount++;
          newReminders.push({
            purchaseId: purchase.id,
            reminderType: '7_day',
            invoiceNumber: purchase.invoiceNumber,
          });
        }
      }
    }

    return NextResponse.json({
      message: 'بررسی سررسید انجام شد',
      newRemindersCount,
      newReminders,
      totalPurchasesChecked: purchases.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('Reminder check API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
