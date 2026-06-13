// ─── API تراکنش‌ها ───
// تراکنش‌های انبار برای محاسبه موجودی
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('transactions:view');
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    const materialId = url.searchParams.get('materialId') || '';
    const type = url.searchParams.get('type') || '';
    

    // شرط جستجو
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (materialId) {
      where.materialId = materialId;
    }

    if (type) {
      where.type = type;
    }

    // ✅ دریافت تراکنش‌های انبار از جدول Transaction
    const transactions = await db.transaction.findMany({
      where,
      include: {
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
            code: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        supplier: {
          select: {
            id: true,
            companyName: true,
          }
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error in GET /api/transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('transactions:create');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { type, materialId, projectId, quantity, unitPrice, description, supplierId, purchaseId } = body;

    if (!type || !materialId || !projectId || !quantity) {
      return NextResponse.json({ error: 'فیلدهای الزامی تکمیل نشده' }, { status: 400 });
    }

    // محاسبه totalPrice
    const totalPrice = (unitPrice || 0) * quantity;

    // ایجاد تراکنش
    const transaction = await db.transaction.create({
      data: {
        type,
        materialId,
        projectId,
        quantity,
        unitPrice: unitPrice || 0,
        totalPrice,
        description,
        supplierId,
        purchaseId,
        date: new Date(),
      },
      include: {
        material: true,
        project: true,
      },
    });

    // ✅ به‌روزرسانی stock در جدول Material
    if (type === 'PURCHASE') {
      await db.material.update({
        where: { id: materialId },
        data: { stock: { increment: quantity } }
      });
    } else if (type === 'CONSUMPTION') {
      await db.material.update({
        where: { id: materialId },
        data: { stock: { decrement: quantity } }
      });
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('transactions:edit');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { id, warehouseConfirmed, actualQuantity, discrepancy, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'شناسه تراکنش الزامی است' }, { status: 400 });
    }

    // دریافت تراکنش قبلی
    const oldTransaction = await db.transaction.findUnique({
      where: { id },
    });

    if (!oldTransaction) {
      return NextResponse.json({ error: 'تراکنش یافت نشد' }, { status: 404 });
    }

    // به‌روزرسانی تراکنش
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        warehouseConfirmed,
        actualQuantity,
        discrepancy,
        imageUrl,
      },
    });

    // ✅ اگر تأیید تحویل است و مقدار واقعی متفاوت است، stock را اصلاح کن
    if (warehouseConfirmed && oldTransaction.type === 'PURCHASE' && actualQuantity) {
      const diff = actualQuantity - oldTransaction.quantity;
      if (diff !== 0) {
        await db.material.update({
          where: { id: oldTransaction.materialId },
          data: { stock: { increment: diff } }
        });
      }
    }

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error('Error in PUT /api/transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission('transactions:delete');
  if (!auth.success) return auth.response;

  return NextResponse.json(
    { error: 'حذف تراکنش مستقیم پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}