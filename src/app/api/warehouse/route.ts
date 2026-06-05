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

  try {
    const body = await req.json();
    const { projectId, materialId, quantity, reservedQuantity, type = 'ADJUSTMENT', description } = body;

    if (!projectId || !materialId || quantity === undefined) {
      return NextResponse.json(
        { error: 'پروژه، مصالح و مقدار الزامی است' },
        { status: 400 }
      );
    }

    // بررسی وجود پروژه
    const project = await db.project.findUnique({
      where: { id: projectId }
    });
    if (!project) {
      return NextResponse.json(
        { error: 'پروژه یافت نشد' },
        { status: 404 }
      );
    }

    // بررسی وجود مصالح
    const material = await db.material.findUnique({
      where: { id: materialId }
    });
    if (!material) {
      return NextResponse.json(
        { error: 'مصالح یافت نشد' },
        { status: 404 }
      );
    }

    // ایجاد تراکنش جدید برای ثبت تغییر موجودی
    const transaction = await db.transaction.create({
      data: {
        type: 'ADJUSTMENT', // نوع تنظیم دستی
        quantity: parseFloat(quantity),
        materialId,
        projectId,
        description: description || `تغییر دستی موجودی توسط انباردار - مقدار: ${quantity}`,
        date: new Date(),
        warehouseConfirmed: true, // برای تنظیمات دستی، مستقیماً تأیید شده است
        // مقادیر پیش‌فرض برای فیلدهای اجباری
        unitPrice: 0,
        totalPrice: 0,
      },
    });

    // آپدیت موجودی در جدول Material (اگر فیلد stock دارید)
    await db.material.update({
      where: { id: materialId },
      data: {
        stock: {
          increment: parseFloat(quantity)
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      transaction,
      message: 'موجودی با موفقیت به‌روزرسانی شد' 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Warehouse update error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در ثبت موجودی' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('warehouse:create');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { projectId, materialId, quantity, description } = body;

    if (!projectId || !materialId || quantity === undefined) {
      return NextResponse.json(
        { error: 'پروژه، مصالح و مقدار الزامی است' },
        { status: 400 }
      );
    }

    // بررسی وجود پروژه
    const project = await db.project.findUnique({
      where: { id: projectId }
    });
    if (!project) {
      return NextResponse.json(
        { error: 'پروژه یافت نشد' },
        { status: 404 }
      );
    }

    // بررسی وجود مصالح
    const material = await db.material.findUnique({
      where: { id: materialId }
    });
    if (!material) {
      return NextResponse.json(
        { error: 'مصالح یافت نشد' },
        { status: 404 }
      );
    }

    // گرفتن موجودی فعلی از تراکنش‌ها
    const transactions = await db.transaction.findMany({
      where: {
        projectId,
        materialId,
        warehouseConfirmed: true,
      },
    });

    // محاسبه موجودی فعلی
    const currentStock = transactions.reduce((sum, tx) => {
      if (tx.type === 'PURCHASE' || tx.type === 'ADJUSTMENT_IN') {
        return sum + tx.quantity;
      } else if (tx.type === 'DELIVERY' || tx.type === 'CONSUMPTION' || tx.type === 'ADJUSTMENT_OUT') {
        return sum - tx.quantity;
      }
      return sum;
    }, 0);

    const newQuantity = parseFloat(quantity);
    const difference = newQuantity - currentStock;

    // اگر تفاوتی وجود داشت، یک تراکنش adjustment ثبت کن
    if (Math.abs(difference) > 0.001) {
      const adjustmentType = difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      
      await db.transaction.create({
        data: {
          type: adjustmentType,
          quantity: Math.abs(difference),
          materialId,
          projectId,
          description: description || `ویرایش موجودی از ${currentStock} به ${newQuantity} توسط انباردار`,
          date: new Date(),
          warehouseConfirmed: true,
          unitPrice: 0,
          totalPrice: 0,
        },
      });
    }

    // بروزرسانی فیلد stock در Material (اگر دارید)
    try {
      await db.material.update({
        where: { id: materialId },
        data: { stock: newQuantity }
      });
    } catch {
      // اگر فیلد stock وجود ندارد، نادیده بگیر
    }

    return NextResponse.json({ 
      success: true, 
      message: `موجودی با موفقیت به ${newQuantity} تغییر یافت`,
      oldStock: currentStock,
      newStock: newQuantity
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Warehouse update error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در ویرایش موجودی' },
      { status: 500 }
    );
  }
}