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

    // ✅ دریافت مصالح پروژه به همراه تراکنش‌های خرید تأیید شده
    const materials = await db.material.findMany({
      where: { projectId },
      include: {
        category: true,
        transactions: {
          where: {
            type: 'PURCHASE',
            warehouseConfirmed: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // ✅ ساخت موجودی انبار از روی مصالح و تراکنش‌ها
    const stocks = materials.map((material, idx) => {
      // محاسبه مجموع مقدار خریدهای تأیید شده
      const totalPurchased = material.transactions.reduce((sum, t) => sum + t.quantity, 0);
      
      // TODO: مصرف و سایر تراکنش‌ها را هم باید محاسبه کنی
      const consumed = 0; // بعداً از تراکنش‌های CONSUMPTION محاسبه کن
      const quantity = totalPurchased - consumed;
      
      return {
        id: `stock-${idx}`,
        projectId,
        materialId: material.id,
        materialName: material.name,
        unit: material.unit,
        minStock: material.minStock,
        quantity: quantity,
        reservedQuantity: 0,
        availableQuantity: quantity,
        totalPurchased: totalPurchased,
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