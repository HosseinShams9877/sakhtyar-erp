// ─── API انبار / موجودی ───
// موجودی از Material + Transaction استخراج می‌شود
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('warehouse:view');
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';

    if (!projectId) {
      return NextResponse.json(
        { error: 'شناسه پروژه الزامی است' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: 'پروژه یافت نشد' },
        { status: 404 }
      );
    }

    // دریافت مصالح پروژه
    const materials = await db.material.findMany({
      where: { projectId },
      include: {
        category: true,
      },
      orderBy: { name: 'asc' }
    });

    // دریافت همه تراکنش‌های تأیید شده پروژه
    const allTransactions = await db.transaction.findMany({
      where: {
        projectId,
        warehouseConfirmed: true,
      },
    });

    // ساخت موجودی انبار با محاسبه صحیح
    const stocks = materials.map((material, idx) => {
      // فیلتر تراکنش‌های مربوط به این مصالح
      const materialTransactions = allTransactions.filter(t => t.materialId === material.id);
      
      // محاسبه افزایش‌ها (PURCHASE)
      const totalPurchased = materialTransactions
        .filter(t => t.type === 'PURCHASE')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      // محاسبه کاهش‌ها (DELIVERY + CONSUMPTION)
      const totalDelivered = materialTransactions
        .filter(t => t.type === 'DELIVERY')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      const totalConsumed = materialTransactions
        .filter(t => t.type === 'CONSUMPTION')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      // موجودی نهایی
      const quantity = totalPurchased - totalDelivered - totalConsumed;
      
      return {
        id: `stock-${idx}`,
        projectId,
        materialId: material.id,
        materialName: material.name,
        unit: material.unit,
        minStock: material.minStock,
        quantity: Math.max(0, quantity),
        reservedQuantity: 0,
        availableQuantity: Math.max(0, quantity),
        totalPurchased: totalPurchased,
        totalDelivered: totalDelivered,
        totalConsumed: totalConsumed,
        pendingDelivery: 0,
        category: material.category?.name,
        project: { id: project.id, name: project.name, location: project.location },
      };
    });

    return NextResponse.json(stocks);
    
  } catch (error: any) {
    console.error('Warehouse stock list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('warehouse:create');
  if (!auth.success) return auth.response;
  
  return NextResponse.json(
    { error: 'ثبت مستقیم موجودی انبار پشتیبانی نمی‌شود — از تأیید تحویل استفاده کنید (/api/deliveries)' },
    { status: 501 }
  );
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('warehouse:create');
  if (!auth.success) return auth.response;
  
  return NextResponse.json(
    { error: 'ویرایش مستقیم موجودی انبار پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}