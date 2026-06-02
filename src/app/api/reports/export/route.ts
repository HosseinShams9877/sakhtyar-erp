// ─── گزارش‌ها - خروجی متن ───
// بازنویسی شده با مدل‌های موجود: Project, Supplier, Purchase, PurchaseItem, Payment
import { rateLimit, addSecurityHeaders, createSafeErrorResponse } from '@/lib/security';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { formatDate } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  try {
    const type = req.nextUrl.searchParams.get('type') || 'summary';
    let content = '';

    if (type === 'transactions') {
      const purchases = await db.purchase.findMany({
        include: {
          supplier: true,
          project: true,
          items: true,
          payments: true,
        },
        orderBy: { purchaseDate: 'desc' },
        take: 100,
      });

      content = [
        'گزارش خریدها و پرداخت‌ها - سامانه مدیریت مصالح عمرانی',
        '═══════════════════════════════════════',
        ...purchases.map(p =>
          `${formatDate(p.purchaseDate)} | فاکتور ${p.invoiceNumber} | ${p.supplier?.companyName || 'نامشخص'} | پروژه: ${p.project.name} | مبلغ: ${p.totalAmount.toLocaleString('fa-IR')} ریال | وضعیت: ${p.status} | پرداخت: ${p.paidAmount.toLocaleString('fa-IR')} ریال`
        ),
      ].join('\n');
    } else if (type === 'inventory') {
      const items = await db.purchaseItem.findMany({
        distinct: ['materialName'],
        select: { materialName: true, unit: true },
      });

      content = [
        'گزارش مصالح - سامانه مدیریت مصالح عمرانی',
        '═══════════════════════════════════════',
        ...items.map(i => `${i.materialName} | واحد: ${i.unit}`),
      ].join('\n');
    } else {
      const [totalProjects, totalSuppliers, totalPurchases] = await Promise.all([
        db.project.count(),
        db.supplier.count(),
        db.purchase.count(),
      ]);

      const purchaseAgg = await db.purchase.aggregate({
        _sum: { totalAmount: true, paidAmount: true },
      });

      content = [
        'گزارش خلاصه - سامانه مدیریت مصالح عمرانی',
        '═════════════════════════',
        `پروژه‌ها: ${totalProjects}`,
        `تامین‌کنندگان: ${totalSuppliers}`,
        `خریدها: ${totalPurchases}`,
        `مجموع خرید: ${(purchaseAgg._sum.totalAmount || 0).toLocaleString('fa-IR')} ریال`,
        `مجموع پرداخت: ${(purchaseAgg._sum.paidAmount || 0).toLocaleString('fa-IR')} ریال`,
        `بدهی کل: ${((purchaseAgg._sum.totalAmount || 0) - (purchaseAgg._sum.paidAmount || 0)).toLocaleString('fa-IR')} ریال`,
        `تاریخ تولید: ${formatDate(new Date())}`,
      ].join('\n');
    }

    const encoder = new TextEncoder();
    return new NextResponse(encoder.encode(content), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${type}-${Date.now()}.txt"`,
      },
    });
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}
