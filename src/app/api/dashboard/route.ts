import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId'); // 👈 اضافه کن

    const today = todayISO();
    const threeDaysLater = addDaysISO(3);
    const weekLater = addDaysISO(7);
    const thirtyDaysLater = addDaysISO(30);

    // ─── شرط فیلتر پروژه ───
    const purchaseWhere: any = { status: { not: 'paid' } };
    if (projectId) {
      purchaseWhere.projectId = projectId;
    }

    // ─── تمام خریدهای فعال (غیر پرداخت‌شده) ───
    const allPurchases = await db.purchase.findMany({
      where: purchaseWhere, // 👈 استفاده از شرط
      include: {
        supplier: { select: { id: true, companyName: true, contactName: true, phone: true } },
        project: { select: { id: true, name: true, location: true } },
        items: true,
        payments: true,
        delivery: true,
        reminders: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    // ─── تمام خریدها (برای آمار کلی) ───
    const totalPurchasesWhere: any = {};
    if (projectId) {
      totalPurchasesWhere.projectId = projectId;
    }
    const totalPurchases = await db.purchase.findMany({
      where: totalPurchasesWhere, // 👈 استفاده از شرط
      include: {
        supplier: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // ─── آمار پروژه‌ها ───
    const projectsWhere = projectId ? { id: projectId } : {};
    const activeProjects = await db.project.count({ 
      where: { ...projectsWhere, status: 'active' } 
    });
    const totalProjects = await db.project.count({ where: projectsWhere });
    const totalSuppliers = await db.supplier.count();

    // ─── آمار کاربران ───
    const [activeUsers, totalUsers] = await Promise.all([
      db.user.count({ where: { isActive: true } }),
      db.user.count(),
    ]);

    // ─── طبقه‌بندی بر اساس سطح هشدار ───
    const red: typeof allPurchases = [];
    const orange: typeof allPurchases = [];
    const yellow: typeof allPurchases = [];
    const green: typeof allPurchases = [];

    for (const p of allPurchases) {
      const dueDateStr = p.dueDate.toISOString().split('T')[0];
      if (dueDateStr < today) {
        red.push(p);
      } else if (dueDateStr <= threeDaysLater) {
        orange.push(p);
      } else if (dueDateStr <= weekLater) {
        yellow.push(p);
      } else {
        green.push(p);
      }
    }

    const alertSummary = {
      red: red.length,
      orange: orange.length,
      yellow: yellow.length,
      green: green.length,
      total: allPurchases.length,
    };

    // ─── مبالغ بدهی بر اساس سطح هشدار ───
    const redAmount = red.reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);
    const orangeAmount = orange.reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);
    const yellowAmount = yellow.reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);
    const greenAmount = green.reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);

    // ─── کارت‌های آمار بدهی ───
    const todayDueAmount = allPurchases
      .filter(p => p.dueDate.toISOString().split('T')[0] === today)
      .reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);

    const weekDueAmount = allPurchases
      .filter(p => {
        const d = p.dueDate.toISOString().split('T')[0];
        return d >= today && d <= weekLater;
      })
      .reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);

    const overdueAmount = red.reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);
    const totalDebt = allPurchases.reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);
    const totalPaid = totalPurchases.reduce((s, p) => s + p.paidAmount, 0);
    const totalPurchaseAmount = totalPurchases.reduce((s, p) => s + p.totalAmount, 0);

    // ─── تامین‌کنندگان ───
    const supplierDebtMap = new Map<string, {
      id: string; companyName: string; contactName: string; phone: string;
      totalDebt: number; purchaseCount: number; overdueCount: number;
    }>();

    const allSuppliers = await db.supplier.findMany({
      select: { id: true, companyName: true, contactName: true, phone: true }
    });

    for (const supplier of allSuppliers) {
      supplierDebtMap.set(supplier.id, {
        id: supplier.id,
        companyName: supplier.companyName,
        contactName: supplier.contactName || '',
        phone: supplier.phone || '',
        totalDebt: 0,
        purchaseCount: 0,
        overdueCount: 0,
      });
    }

    for (const p of allPurchases) {
      const debt = p.totalAmount - p.paidAmount;
      const isOverdue = p.dueDate.toISOString().split('T')[0] < today;
      const existing = supplierDebtMap.get(p.supplierId);
      if (existing) {
        existing.totalDebt += debt;
        existing.purchaseCount++;
        if (isOverdue) existing.overdueCount++;
      }
    }

    const creditorSuppliers = Array.from(supplierDebtMap.values())
      .map(s => ({ ...s, totalDebt: Math.round(s.totalDebt * 100) / 100 }))
      .sort((a, b) => b.totalDebt - a.totalDebt);

    // ─── پروژه‌های بدهکار ───
    const projectDebtMap = new Map<string, {
      id: string; name: string; location: string;
      totalDebt: number; purchaseCount: number; overdueCount: number;
    }>();

    for (const p of allPurchases) {
      const debt = p.totalAmount - p.paidAmount;
      if (debt <= 0) continue;

      const isOverdue = p.dueDate.toISOString().split('T')[0] < today;
      const existing = projectDebtMap.get(p.projectId);
      if (existing) {
        existing.totalDebt += debt;
        existing.purchaseCount++;
        if (isOverdue) existing.overdueCount++;
      } else {
        projectDebtMap.set(p.projectId, {
          id: p.project.id,
          name: p.project.name,
          location: (p.project as any).location || '',
          totalDebt: debt,
          purchaseCount: 1,
          overdueCount: isOverdue ? 1 : 0,
        });
      }
    }

    const debtorProjects = Array.from(projectDebtMap.values())
      .map(p => ({ ...p, totalDebt: Math.round(p.totalDebt * 100) / 100 }))
      .sort((a, b) => b.totalDebt - a.totalDebt);

    // ─── خریدهای سررسید ۳۰ روز آینده ───
    const upcomingPurchases = allPurchases.filter(p => {
      const d = p.dueDate.toISOString().split('T')[0];
      return d >= today && d <= thirtyDaysLater;
    });

    const dueByDate = new Map<string, { pending: number; partial: number; overdue: number; total: number }>();
    for (const p of upcomingPurchases) {
      const dateStr = p.dueDate.toISOString().split('T')[0];
      const debt = p.totalAmount - p.paidAmount;
      const existing = dueByDate.get(dateStr);
      if (existing) {
        existing.total += debt;
        if (p.status === 'partial') existing.partial += debt;
        else existing.pending += debt;
      } else {
        dueByDate.set(dateStr, {
          total: debt,
          pending: p.status === 'partial' ? 0 : debt,
          partial: p.status === 'partial' ? debt : 0,
          overdue: 0,
        });
      }
    }

    const duePaymentsChart = Array.from(dueByDate.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── بدهی به تفکیک تامین‌کننده ───
    const vendorDebtChart = creditorSuppliers.slice(0, 8).map(s => ({
      vendor: s.companyName,
      amount: s.totalDebt,
      purchaseCount: s.purchaseCount,
      overdueCount: s.overdueCount,
    }));

    // ─── خریدهای اخیر ───
    const recentPurchasesWhere: any = {};
    if (projectId) {
      recentPurchasesWhere.projectId = projectId;
    }
    const recentPurchasesFromDb = await db.purchase.findMany({
      where: recentPurchasesWhere, // 👈 استفاده از شرط
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const recentPurchases = recentPurchasesFromDb.map(p => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      status: p.status,
      dueDate: p.dueDate,
      supplier: p.supplier,
      project: p.project,
    }));

    return NextResponse.json({
      alertSummary,
      alertAmounts: {
        red: Math.round(redAmount * 100) / 100,
        orange: Math.round(orangeAmount * 100) / 100,
        yellow: Math.round(yellowAmount * 100) / 100,
        green: Math.round(greenAmount * 100) / 100,
      },
      debtSummary: {
        totalDebt: Math.round(totalDebt * 100) / 100,
        todayDue: Math.round(todayDueAmount * 100) / 100,
        weekDue: Math.round(weekDueAmount * 100) / 100,
        overdue: Math.round(overdueAmount * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalPurchaseAmount: Math.round(totalPurchaseAmount * 100) / 100,
      },
      stats: {
        activeProjects,
        totalProjects,
        totalSuppliers,
        totalPurchases: totalPurchases.length,
        unpaidPurchases: allPurchases.length,
        activeUsers,
        totalUsers,
      },
      urgentPurchases: {
        red: red.slice(0, 10).map(formatPurchase),
        orange: orange.slice(0, 10).map(formatPurchase),
        yellow: yellow.slice(0, 10).map(formatPurchase),
      },
      creditorSuppliers,
      debtorProjects,
      duePaymentsChart,
      vendorDebtChart,
      recentPurchases,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatPurchase(p: any) {
  return {
    id: p.id,
    invoiceNumber: p.invoiceNumber,
    totalAmount: p.totalAmount,
    paidAmount: p.paidAmount,
    remainingAmount: Math.round((p.totalAmount - p.paidAmount) * 100) / 100,
    dueDate: p.dueDate,
    purchaseDate: p.purchaseDate,
    status: p.status,
    description: p.description,
    supplier: p.supplier,
    project: p.project,
    hasDelivery: !!p.delivery,
    itemsCount: p.items?.length || 0,
  };
}