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
    const { deliveryId, confirmedBy, image, notes, items: bodyItems } = body;

    // پیدا کردن فاکتور با آیتم‌ها
    const purchase = await db.purchase.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        projectId: true,
        supplierId: true,
        status: true,
        invoiceNumber: true,
        supplier: {
          select: { companyName: true }
        },
        items: {
          select: {
            id: true,
            materialId: true,
            materialName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            unit: true,
          }
        }
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'خرید یافت نشد' }, { status: 404 });
    }

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

    // ✅ لیست مغایرت‌ها برای نوتیفیکیشن (فقط برای اطلاع، بدون تغییر در موجودی)
    const discrepancies: { materialName: string; quantity: number; actualQuantity: number; note?: string }[] = [];

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

      // 3. به‌روزرسانی موجودی مصالح (با مقدار فاکتور، نه مقدار مغایرت)
      for (const item of purchase.items) {
        // ✅ پیدا کردن آیتم متناظر از body برای بررسی مغایرت (فقط برای نوتیفیکیشن)
        const bodyItem = bodyItems?.find((bi: any) => 
          bi.materialId === item.materialId || bi.materialName === item.materialName
        );
        
        const actualQuantity = bodyItem?.actualQuantity ?? item.quantity;
        const discrepancyNote = bodyItem?.discrepancy ?? null;
        
        // ✅ اگر مغایرت وجود داشت، ثبت کن برای نوتیفیکیشن (بدون تغییر در منطق اصلی)
        if (actualQuantity !== item.quantity) {
          discrepancies.push({
            materialName: item.materialName,
            quantity: item.quantity,
            actualQuantity: actualQuantity,
            note: discrepancyNote || undefined,
          });
        }
        
        let materialId = item.materialId;
        
        if (!materialId) {
          const materialByName = await tx.material.findFirst({
            where: {
              name: item.materialName,
              projectId: purchase.projectId,
            },
          });
          if (materialByName) {
            materialId = materialByName.id;
          }
        }
        
        if (materialId) {
          const material = await tx.material.findUnique({
            where: { id: materialId },
          });

          if (material) {
            // ✅ آپدیت موجودی با مقدار فاکتور (نه مقدار واقعی)
            await tx.material.update({
              where: { id: material.id },
              data: { stock: { increment: item.quantity } },  // ← مقدار فاکتور
            });

            // ثبت تراکنش انبار با مقدار فاکتور
            await tx.transaction.create({
              data: {
                type: 'DELIVERY',
                materialId: material.id,
                projectId: purchase.projectId,
                supplierId: purchase.supplierId, 
                quantity: item.quantity,  // ← مقدار فاکتور
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                purchaseId: deliveryId,
                warehouseConfirmed: true,
                date: new Date(),
                userId: auth.userId,
              },
            });
          }
        }
      }

      return delivery;
    });

    // ✅ 4. ارسال نوتیفیکیشن در صورت وجود مغایرت (فقط اطلاع‌رسانی)
    if (discrepancies.length > 0) {
      // پیدا کردن مدیر پروژه
      const projectManager = await db.projectMember.findFirst({
        where: {
          projectId: purchase.projectId,
          role: {
            name: 'PROJECT_MANAGER'
          }
        },
        include: {
          user: true
        }
      });

      if (projectManager) {
        const discrepancyList = discrepancies.map(d => 
          `${d.materialName}: فاکتور ${d.quantity} - تحویل ${d.actualQuantity}${d.note ? ` (${d.note})` : ''}`
        ).join('، ');
        
        await db.notification.create({
          data: {
            userId: projectManager.userId,
            title: '⚠️ مغایرت در تحویل کالا',
            message: `فاکتور ${purchase.invoiceNumber} از ${purchase.supplier?.companyName} دارای مغایرت است. موارد: ${discrepancyList}`,
            type: 'warning',
            link: `/invoices/${deliveryId}`,
          },
        });
        
        console.log('✅ نوتیفیکیشن مغایرت برای مدیر پروژه ارسال شد');
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تحویل با موفقیت ثبت شد و موجودی انبار به‌روز شد',
      delivery: result,
      discrepancies: discrepancies.length > 0 ? discrepancies : undefined
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('POST /api/deliveries error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}