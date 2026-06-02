// ─── API انبار / موجودی ───
// مدل WarehouseStock و Material حذف شده‌اند
// موجودی از PurchaseItem + DeliveryConfirmation استخراج می‌شود
// (تکرار /api/inventory با ساختار ساده‌تر)
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
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

    // Fetch purchases with items and deliveries for this project
    const purchases = await db.purchase.findMany({
      where: { projectId },
      include: {
        items: true,
        delivery: true,
        supplier: { select: { id: true, companyName: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    // Build stock entries from purchase items
    const stockMap = new Map<string, {
      materialName: string;
      unit: string;
      quantity: number;
      deliveredQuantity: number;
      reservedQuantity: number;
      supplierId: string;
      supplierName: string;
    }>();

    for (const purchase of purchases) {
      const isDelivered = purchase.delivery !== null;
      for (const item of purchase.items) {
        const key = `${item.materialName}-${item.unit}`;
        const entry = stockMap.get(key);
        if (entry) {
          entry.quantity += item.quantity;
          if (isDelivered) entry.deliveredQuantity += item.quantity;
        } else {
          stockMap.set(key, {
            materialName: item.materialName,
            unit: item.unit,
            quantity: item.quantity,
            deliveredQuantity: isDelivered ? item.quantity : 0,
            reservedQuantity: 0,
            supplierId: purchase.supplierId,
            supplierName: purchase.supplier?.companyName || 'نامشخص',
          });
        }
      }
    }

    const stocks = Array.from(stockMap.entries()).map(([key, val], idx) => ({
      id: `stock-${idx}`,
      projectId,
      materialId: key,
      materialName: val.materialName,
      unit: val.unit,
      quantity: val.deliveredQuantity,
      reservedQuantity: val.reservedQuantity,
      availableQuantity: val.deliveredQuantity - val.reservedQuantity,
      totalPurchased: val.quantity,
      pendingDelivery: val.quantity - val.deliveredQuantity,
      supplierId: val.supplierId,
      supplierName: val.supplierName,
      project: { id: project.id, name: project.name, location: project.location },
    }));

    return NextResponse.json(stocks);
  } catch (error: any) {
    console.error('Warehouse stock list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // مدل WarehouseStock حذف شده — ثبت موجودی از طریق تأیید تحویل
  return NextResponse.json(
    { error: 'ثبت مستقیم موجودی انبار پشتیبانی نمی‌شود — از تأیید تحویل استفاده کنید (/api/deliveries)' },
    { status: 501 }
  );
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(
    { error: 'ویرایش مستقیم موجودی انبار پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}
