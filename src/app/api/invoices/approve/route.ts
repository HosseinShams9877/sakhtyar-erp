// ─── API تایید/رد فاکتور (گردش کار چندمرحله‌ای) ───
// PROCUREMENT → PROJECT_MANAGER → SUPER_MANAGER
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

// وضعیت‌های مجاز گردش کار
const WORKFLOW_STATUS = {
  pending: { label: 'در انتظار بررسی', nextStatus: ['submitted'] },
  submitted: { label: 'ارسال‌شده به مدیر پروژه', nextStatus: ['approved', 'rejected'] },
  approved: { label: 'تاییدشده توسط مدیر پروژه', nextStatus: ['paid'] },
  rejected: { label: 'ردشده', nextStatus: ['pending'] },
  paid: { label: 'تسویه‌شده', nextStatus: [] },
} as const;

// POST /api/invoices/approve — تایید/رد فاکتور
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { purchaseId, action, comment, stepName } = body;

    if (!purchaseId || !action) {
      return NextResponse.json(
        { error: 'شناسه فاکتور و نوع عملیات الزامی است' },
        { status: 400 }
      );
    }

    // بررسی وجود فاکتور
    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        project: true,
        supplier: true,
        approvals: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'فاکتور یافت نشد' }, { status: 404 });
    }

    // بررسی مجوز بر اساس نقش و عملیات
    const userRole = auth.role;
    let newStatus = purchase.status;
    let auditAction = action;

    switch (action) {
      case 'submit':
        // مسئول خرید فاکتور را ارسال می‌کند
        if (userRole !== 'PURCHASER' && userRole !== 'SUPER_MANAGER') {
          return NextResponse.json({ error: 'فقط مسئول خرید می‌تواند فاکتور ارسال کند' }, { status: 403 });
        }
        if (purchase.status !== 'pending' && purchase.status !== 'rejected') {
          return NextResponse.json({ error: 'فاکتور در وضعیت قابل ارسال نیست' }, { status: 400 });
        }
        newStatus = 'submitted';
        break;

      case 'approve':
        // مدیر پروژه تایید می‌کند
        if (userRole !== 'PROJECT_MANAGER' && userRole !== 'SUPER_MANAGER') {
          return NextResponse.json({ error: 'فقط مدیر پروژه می‌تواند فاکتور تایید کند' }, { status: 403 });
        }
        if (purchase.status !== 'submitted') {
          return NextResponse.json({ error: 'فاکتور در وضعیت قابل تایید نیست' }, { status: 400 });
        }
        newStatus = 'approved';
        break;

      case 'reject':
        // مدیر پروژه رد می‌کند
        if (userRole !== 'PROJECT_MANAGER' && userRole !== 'SUPER_MANAGER') {
          return NextResponse.json({ error: 'فقط مدیر پروژه می‌تواند فاکتور رد کند' }, { status: 403 });
        }
        if (purchase.status !== 'submitted') {
          return NextResponse.json({ error: 'فاکتور در وضعیت قابل رد نیست' }, { status: 400 });
        }
        newStatus = 'rejected';
        break;

      case 'settle':
        // مدیر کل تسویه می‌کند
        if (userRole !== 'SUPER_MANAGER') {
          return NextResponse.json({ error: 'فقط مدیر کل می‌تواند تسویه انجام دهد' }, { status: 403 });
        }
        if (purchase.status !== 'approved') {
          return NextResponse.json({ error: 'فاکتور تایید نشده است' }, { status: 400 });
        }
        newStatus = 'paid';
        break;

      default:
        return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
    }

    // بروزرسانی وضعیت فاکتور
    const updatedPurchase = await db.purchase.update({
      where: { id: purchaseId },
      data: { status: newStatus },
      include: {
        supplier: true,
        project: true,
        items: true,
        approvals: true,
      },
    });

    // ثبت لاگ تایید
    await db.approvalLog.create({
      data: {
        purchaseId,
        userId: auth.userId!,
        action: auditAction,
        stepName: stepName || WORKFLOW_STATUS[newStatus as keyof typeof WORKFLOW_STATUS]?.label || newStatus,
        comment: comment || null,
      },
    });

    // ایجاد نوتیفیکیشن برای نقش بعدی
    if (newStatus === 'submitted') {
      // اطلاع به مدیران پروژه
      const projectManagers = await db.user.findMany({
        where: {
          role: { name: 'PROJECT_MANAGER' },
          projectAccess: { some: { projectId: purchase.projectId } },
          isActive: true,
        },
      });
      for (const pm of projectManagers) {
        await db.notification.create({
          data: {
            userId: pm.id,
            title: 'فاکتور نیازمند تایید',
            message: `فاکتور ${purchase.invoiceNumber} از ${purchase.supplier?.companyName || 'نامشخص'} نیازمند تایید شماست`,
            type: 'warning',
            link: `/invoices`,
          },
        });
      }
    } else if (newStatus === 'approved') {
      // اطلاع به مدیر کل
      const superManagers = await db.user.findMany({
        where: { role: { name: 'SUPER_MANAGER' }, isActive: true },
      });
      for (const sm of superManagers) {
        await db.notification.create({
          data: {
            userId: sm.id,
            title: 'فاکتور تایید شده',
            message: `فاکتور ${purchase.invoiceNumber} از ${purchase.supplier?.companyName || 'نامشخص'} تایید شده و آماده تسویه است`,
            type: 'info',
            link: `/invoices`,
          },
        });
      }
    }

    // ثبت لاگ ممیزی
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        action: action.toUpperCase(),
        entity: 'Purchase',
        entityId: purchaseId,
        details: JSON.stringify({ from: purchase.status, to: newStatus, comment }),
      },
    });

    return NextResponse.json({
      purchase: updatedPurchase,
      message: `وضعیت فاکتور به "${WORKFLOW_STATUS[newStatus as keyof typeof WORKFLOW_STATUS]?.label || newStatus}" تغییر کرد`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Approval error:', error);
    return NextResponse.json({ error: 'خطا در ثبت تایید' }, { status: 500 });
  }
}
