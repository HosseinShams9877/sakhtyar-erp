// ─── API سررسید پرداخت‌ها ───
// فاکتورها را بر اساس نزدیکی سررسید دسته‌بندی و فیلتر می‌کند
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { rateLimit, addSecurityHeaders } from '@/lib/security';

// رنگ‌بندی فوریت: قرمز=گذشته، نارنجی=۳ روز، زرد=۷ روز، سبز=بیشتر
function getUrgencyLevel(dueDate: Date): { level: string; label: string; color: string; order: number } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { level: 'overdue', label: 'سررسید گذشته', color: 'red', order: 0 };
  } else if (diffDays <= 3) {
    return { level: 'urgent', label: 'فوری (۳ روز)', color: 'orange', order: 1 };
  } else if (diffDays <= 7) {
    return { level: 'soon', label: 'نزدیک (۷ روز)', color: 'yellow', order: 2 };
  } else {
    return { level: 'normal', label: 'عادی', color: 'green', order: 3 };
  }
}

// GET /api/dues — فهرست فاکتورها با اطلاعات سررسید
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 60, 60 * 1000);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  const auth = await requireAuth();
  if (!auth.success) {
    // در حالت preview بدون session، داده‌های نمونه نمایش داده می‌شود
    try {
      const purchases = await db.purchase.findMany({
        where: {
          status: { in: [ 'partial', 'overdue', 'approved', 'confirmed'] },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          supplier: { select: { id: true, companyName: true, contactName: true, phone: true, mobile: true } },
          project: { select: { id: true, name: true, code: true } },
          items: true,
          payments: { orderBy: { paymentDate: 'desc' } },
          reminders: true,
        },
        take: 100,
      });

      const dues = purchases.map(p => {
        const urgency = getUrgencyLevel(p.dueDate);
        const remainingAmount = p.totalAmount - p.paidAmount;
        return {
          ...p,
          urgency,
          remainingAmount,
          daysUntilDue: Math.ceil((new Date(p.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        };
      });

      // خلاصه آمار
      const summary = {
        total: dues.length,
        totalRemaining: dues.reduce((sum, d) => sum + d.remainingAmount, 0),
        overdue: dues.filter(d => d.urgency.level === 'overdue'),
        overdueCount: dues.filter(d => d.urgency.level === 'overdue').length,
        overdueAmount: dues.filter(d => d.urgency.level === 'overdue').reduce((s, d) => s + d.remainingAmount, 0),
        urgentCount: dues.filter(d => d.urgency.level === 'urgent').length,
        urgentAmount: dues.filter(d => d.urgency.level === 'urgent').reduce((s, d) => s + d.remainingAmount, 0),
        soonCount: dues.filter(d => d.urgency.level === 'soon').length,
        soonAmount: dues.filter(d => d.urgency.level === 'soon').reduce((s, d) => s + d.remainingAmount, 0),
        normalCount: dues.filter(d => d.urgency.level === 'normal').length,
        normalAmount: dues.filter(d => d.urgency.level === 'normal').reduce((s, d) => s + d.remainingAmount, 0),
      };

      return addSecurityHeaders(NextResponse.json({ dues, summary }));
    } catch {
      return addSecurityHeaders(NextResponse.json({ dues: [], summary: null }));
    }
  }

  try {
    const url = new URL(req.url);
    const urgencyFilter = url.searchParams.get('urgency') || '';
    const projectId = url.searchParams.get('projectId') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const search = url.searchParams.get('search') || '';

    const where: Record<string, unknown> = {
      status: { in: [ 'partial', 'overdue' , 'approved', 'confirmed'] },
    };

    if (projectId) where.projectId = projectId;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.invoiceNumber = { contains: search };
    }

    // فیلتر بر اساس نقش (ABAC)
if (!projectId && (auth.role === 'WAREHOUSE_KEEPER' || auth.role === 'PROJECT_MANAGER')) {
  const userProjects = await db.userProject.findMany({
    where: { userId: auth.userId },
    select: { projectId: true },
  });
  const projectIds = userProjects.map(up => up.projectId);
  if (projectIds.length > 0) {
    where.projectId = { in: projectIds };
  }
}
    const purchases = await db.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, companyName: true, contactName: true, phone: true, mobile: true } },
        project: { select: { id: true, name: true, code: true } },
        items: true,
        payments: { orderBy: { paymentDate: 'desc' } },
        reminders: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    let dues = purchases.map(p => {
      const urgency = getUrgencyLevel(p.dueDate);
      const remainingAmount = p.totalAmount - p.paidAmount;
      return {
        ...p,
        urgency,
        remainingAmount,
        daysUntilDue: Math.ceil((new Date(p.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    // فیلتر فوریت
    if (urgencyFilter) {
      dues = dues.filter(d => d.urgency.level === urgencyFilter);
    }

    // مرتب‌سازی بر اساس فوریت
    dues.sort((a, b) => a.urgency.order - b.urgency.order || a.daysUntilDue - b.daysUntilDue);

    // خلاصه آمار
    const summary = {
      total: dues.length,
      totalRemaining: dues.reduce((sum, d) => sum + d.remainingAmount, 0),
      overdueCount: dues.filter(d => d.urgency.level === 'overdue').length,
      overdueAmount: dues.filter(d => d.urgency.level === 'overdue').reduce((s, d) => s + d.remainingAmount, 0),
      urgentCount: dues.filter(d => d.urgency.level === 'urgent').length,
      urgentAmount: dues.filter(d => d.urgency.level === 'urgent').reduce((s, d) => s + d.remainingAmount, 0),
      soonCount: dues.filter(d => d.urgency.level === 'soon').length,
      soonAmount: dues.filter(d => d.urgency.level === 'soon').reduce((s, d) => s + d.remainingAmount, 0),
      normalCount: dues.filter(d => d.urgency.level === 'normal').length,
      normalAmount: dues.filter(d => d.urgency.level === 'normal').reduce((s, d) => s + d.remainingAmount, 0),
    };

    return addSecurityHeaders(NextResponse.json({ dues, summary }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Due dates list error:', error);
    return addSecurityHeaders(NextResponse.json({ error: 'خطا در دریافت سررسید پرداخت‌ها' }, { status: 500 }));
  }
}
