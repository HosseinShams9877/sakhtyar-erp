import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/api-auth';

// ─── GET /api/deliveries ───
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    const pending = url.searchParams.get('pending') === 'true';

    // ─── حالت pending: فاکتورهای پرداخت شده که هنوز تحویل نشده‌اند ───
    if (pending) {
      const where: any = {
        status: 'paid',           // فقط پرداخت شده‌ها
        delivery: null,           // هنوز تحویل ثبت نشده
      };
      
      if (projectId) {
        where.projectId = projectId;
      }

      const purchases = await db.purchase.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, companyName: true, contactName: true, phone: true }
          },
          project: {
            select: { id: true, name: true, location: true }
          },
          items: true,
        },
        orderBy: { purchaseDate: 'desc' },
      });
       

      // تبدیل به فرمت مورد نیاز انباردار
      const pendingDeliveries = purchases.map(purchase => ({
        id: purchase.id,
        invoiceNumber: purchase.invoiceNumber,
        supplierName: purchase.supplier.companyName,
        supplierContact: purchase.supplier.contactName,
        purchaseDate: purchase.purchaseDate,
        totalAmount: purchase.totalAmount,
        items: purchase.items.map(item => ({
          materialId: item.materialId,
          materialName: item.materialName,
          quantity: item.quantity,
          unit: item.unit,
        })),
        status: 'pending_delivery',
      }));

      return NextResponse.json({ deliveries: pendingDeliveries });
    }

    // ─── حالت عادی: تاریخچه تحویل‌های ثبت شده ───
    const deliveries = await db.deliveryConfirmation.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        purchase: {
          include: {
            supplier: { select: { id: true, companyName: true, contactName: true } },
            project: { select: { id: true, name: true, location: true } },
            items: true,
          },
        },
        project: { select: { id: true, name: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ history: deliveries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('GET /api/deliveries error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/deliveries ───
export async function POST(req: NextRequest) {
  console.log('🔍 POST /api/deliveries called');
  const auth = await requirePermission('deliveries:confirm');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { deliveryId, confirmedBy, image, notes } = body;

    // پیدا کردن فاکتور با آیتم‌ها
    const purchase = await db.purchase.findUnique({
      where: { id: deliveryId },
      include: { 
        items: true,
        project: { select: { id: true } }
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'خرید یافت نشد' }, { status: 404 });
    }
    console.log('🔍 purchase.projectId:', purchase.projectId);
    console.log('🔍 purchase.items:', purchase.items.map(i => ({
      id: i.id,
      materialId: i.materialId,
      materialName: i.materialName,
      quantity: i.quantity,
    })));

    if (purchase.status !== 'paid') {
      return NextResponse.json(
        { error: 'فاکتور هنوز پرداخت نشده است، قابل تحویل نیست' },
        { status: 400 }
      );
    }

    const existingDelivery = await db.deliveryConfirmation.findUnique({
      where: { purchaseId: deliveryId }
    });
    if (existingDelivery) {
      return NextResponse.json(
        { error: 'تحویل این خرید قبلاً تأیید شده است' },
        { status: 409 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // 1. ثبت تحویل
      const delivery = await tx.deliveryConfirmation.create({
        data: {
          purchaseId: deliveryId,
          projectId: purchase.projectId,
          deliveryDate: new Date(),
          confirmedBy,
          notes: notes || null,
        },
      });

      // 2. به‌روزرسانی وضعیت فاکتور
      await tx.purchase.update({
        where: { id: deliveryId },
        data: { status: 'delivered' },
      });

      // 3. ✅ به‌روزرسانی موجودی مصالح
      for (const item of purchase.items) {
        console.log('🔄 Processing item:', {
          id: item.id,
          materialId: item.materialId,
          materialName: item.materialName,
          quantity: item.quantity,
        });
        
        let materialId = item.materialId;
        
        // ✅ اگر materialId null بود، سعی کن با materialName پیدا کنی
        if (!materialId) {
          const materialByName = await tx.material.findFirst({
            where: {
              name: item.materialName,
              projectId: purchase.projectId,
            },
          });
          if (materialByName) {
            materialId = materialByName.id;
            console.log(`✅ Found material by name: ${item.materialName} -> ${materialId}`);
          } else {
            console.warn(`❌ Material not found by name: ${item.materialName}`);
          }
        }
        
        if (materialId) {
          const material = await tx.material.findUnique({
            where: { id: materialId },
          });

          if (material) {
            const updated = await tx.material.update({
              where: { id: material.id },
              data: { stock: { increment: item.quantity } },
            });
            console.log(`✅ Stock updated for ${material.name}: ${updated.stock}`);

            // ثبت تراکنش انبار
            await tx.transaction.create({
              data: {
                type: 'DELIVERY',
                materialId: material.id,
                projectId: purchase.projectId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                purchaseId: deliveryId,
                warehouseConfirmed: true,
                date: new Date(),
                userId: auth.userId,
              },
            });
          } else {
            console.warn(`⚠️ Material not found for id: ${materialId}`);
          }
        } else {
          console.warn(`⚠️ Cannot find material for: ${item.materialName}`);
        }
      }

      return delivery;
    });

    return NextResponse.json({ 
      success: true, 
      message: 'تحویل با موفقیت ثبت شد و موجودی انبار به‌روز شد',
      delivery: result 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('POST /api/deliveries error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}