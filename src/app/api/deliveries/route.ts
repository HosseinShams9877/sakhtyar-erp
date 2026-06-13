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
  
  const auth = await requirePermission('deliveries:confirm');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { deliveryId, confirmedBy, image, notes, items: bodyItems , imageUrl} = body;

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

    const discrepancies: { materialName: string; quantity: number; actualQuantity: number; note?: string }[] = [];

    const result = await db.$transaction(async (tx) => {
      const delivery = await tx.deliveryConfirmation.create({
        data: {
          purchaseId: deliveryId,
          projectId: purchase.projectId,
          deliveryDate: new Date(),
          confirmedBy,
          notes: notes || null,
        },
      });

      await tx.purchase.update({
        where: { id: deliveryId },
        data: { status: 'delivered' },
      });

      for (const item of purchase.items) {
        const bodyItem = bodyItems?.find((bi: any) => 
          bi.materialId === item.materialId || bi.materialName === item.materialName
        );
        
        const actualQuantity = bodyItem?.actualQuantity ?? item.quantity;
        const discrepancyNote = bodyItem?.discrepancy ?? null;
        
        // ثبت مغایرت فقط برای نوتیفیکیشن
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
            // ✅ آپدیت موجودی با مقدار فاکتور (همان item.quantity)
            await tx.material.update({
              where: { id: material.id },
              data: { stock: { increment: item.quantity } },
            });

            // ✅ ثبت تراکنش با مقدار فاکتور و actualQuantity (برای نمایش در جزئیات)
            await tx.transaction.create({
              data: {
                type: 'DELIVERY',
                materialId: material.id,
                projectId: purchase.projectId,
                supplierId: purchase.supplierId, 
                quantity: item.quantity,           // مقدار فاکتور (برای محاسبه موجودی)
                actualQuantity: actualQuantity,    // مقدار واقعی (فقط برای نمایش و مغایرت)
                discrepancy: discrepancyNote,      // توضیح مغایرت
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,       // مبلغ کل فاکتور
                purchaseId: deliveryId,
                warehouseConfirmed: true,
                date: new Date(),
                userId: auth.userId,
                imageUrl: imageUrl,
              },
            });
          }
        }
      }

      return delivery;
    });

    // ارسال نوتیفیکیشن در صورت وجود مغایرت
// ارسال نوتیفیکیشن در صورت وجود مغایرت
if (discrepancies.length > 0) {
  const projectManager = await db.projectMember.findFirst({
    where: {
      projectId: purchase.projectId,
      role: {
        name: 'PROJECT_MANAGER'
      }
    },
    include: {
      user: true,
      role: true
    }
  });

  if (projectManager) {
    const discrepancyList = discrepancies.map(d => 
      `${d.materialName}: فاکتور ${d.quantity} - تحویل ${d.actualQuantity}${d.note ? ` (${d.note})` : ''}`
    ).join('، ');
    
    await db.notification.create({
      data: {
        userId: projectManager.userId,
        roleId: projectManager.roleId,
        title: '⚠️ مغایرت در تحویل کالا',
        message: `فاکتور ${purchase.invoiceNumber} از ${purchase.supplier?.companyName} دارای مغایرت است. موارد: ${discrepancyList}`,
        type: 'warning',
        link: `/invoices/${deliveryId}`,
        projectId: purchase.projectId,
      },
    });
  }
} else {
  // ✅ اگر مغایرتی وجود نداشت، نوتیفیکیشن تحویل موفق بفرست
  const projectManager = await db.projectMember.findFirst({
    where: {
      projectId: purchase.projectId,
      role: {
        name: 'PROJECT_MANAGER'
      }
    },
    include: {
      user: true,
      role: true
    }
  });

  if (projectManager) {
    await db.notification.create({
      data: {
        userId: projectManager.userId,
        roleId: projectManager.roleId,
        title: '✅ تحویل کالا ثبت شد',
        message: `فاکتور ${purchase.invoiceNumber} از ${purchase.supplier?.companyName} با موفقیت تحویل شد.`,
        type: 'success',
        link: `/invoices/${deliveryId}`,
        projectId: purchase.projectId,
      },
    });
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