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

    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: { project: true, supplier: true },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'فاکتور یافت نشد' }, { status: 404 });
    }

    // پیدا کردن نقش مسئول خرید
    const purchaser = await db.projectMember.findFirst({
      where: {
        projectId: purchase.projectId,
        role: { name: 'PURCHASER' }
      },
      include: { role: true }
    });

    const userRole = auth.role;
    let newStatus = purchase.status;

    switch (action) {
      case 'approve':
        if (userRole !== 'PROJECT_MANAGER' && userRole !== 'SUPER_MANAGER') {
          return NextResponse.json({ error: 'شما مجوز تایید فاکتور را ندارید' }, { status: 403 });
        }
        if (purchase.status !== 'pending') {
          return NextResponse.json({ error: 'فقط فاکتورهای در انتظار قابل تایید هستند' }, { status: 400 });
        }
        newStatus = 'approved';
        break;

      case 'reject':
        if (userRole !== 'PROJECT_MANAGER' && userRole !== 'SUPER_MANAGER') {
          return NextResponse.json({ error: 'شما مجوز رد فاکتور را ندارید' }, { status: 403 });
        }
        if (purchase.status !== 'pending') {
          return NextResponse.json({ error: 'فقط فاکتورهای در انتظار قابل رد هستند' }, { status: 400 });
        }
        newStatus = 'rejected';
        break;

      case 'settle':
        if (userRole !== 'SUPER_MANAGER') {
          return NextResponse.json({ error: 'فقط مدیر کل می‌تواند تسویه انجام دهد' }, { status: 403 });
        }
        if (purchase.status !== 'approved') {
          return NextResponse.json({ error: 'فاکتور باید ابتدا تایید شود' }, { status: 400 });
        }
        newStatus = 'paid';
        break;

      default:
        return NextResponse.json({ error: 'عملیات نامعتبر است' }, { status: 400 });
    }

    const updatedPurchase = await db.purchase.update({
      where: { id: purchaseId },
      data: { status: newStatus },
    });

    await db.approvalLog.create({
      data: {
        purchaseId,
        userId: auth.userId!,
        action: action,
        stepName: stepName || (action === 'approve' ? 'تایید مدیر پروژه' : action === 'reject' ? 'رد مدیر پروژه' : 'تسویه'),
        comment: comment || null,
      },
    });

    // نوتیفیکیشن با roleId و projectId
    if (action === 'approve') {
      await db.notification.create({
        data: {
          userId: purchase.createdById!,
          roleId: purchaser?.roleId,  // 👈 اضافه شد
          title: 'فاکتور تایید شد',
          message: `فاکتور ${purchase.invoiceNumber} توسط مدیر پروژه تایید شد`,
          type: 'success',
          link: `/invoices`,
          projectId: purchase.projectId,  // 👈 اضافه شد
        },
      });
    } else if (action === 'reject') {
      await db.notification.create({
        data: {
          userId: purchase.createdById!,
          roleId: purchaser?.roleId,  // 👈 اضافه شد
          title: 'فاکتور رد شد',
          message: `فاکتور ${purchase.invoiceNumber} رد شد. لطفاً اصلاح کنید.`,
          type: 'error',
          link: `/invoices`,
          projectId: purchase.projectId,  // 👈 اضافه شد
        },
      });
    }

    return NextResponse.json({
      purchase: updatedPurchase,
      message: action === 'approve' ? 'فاکتور تایید شد' : action === 'reject' ? 'فاکتور رد شد' : 'تسویه انجام شد',
    });
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json({ error: 'خطا در ثبت تایید' }, { status: 500 });
  }
}