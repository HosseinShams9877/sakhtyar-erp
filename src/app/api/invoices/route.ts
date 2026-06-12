// ─── API خریدها (فاکتورها) ───
// SECURITY: احراز هویت + اعتبارسنجی ورودی + فیلتر بر اساس نقش
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/api-auth';
import { rateLimit, addSecurityHeaders } from '@/lib/security';

// ─── GET /api/invoices ───
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 60, 60 * 1000);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  const auth = await requireAuth();
  
  // گرفتن پارامترها از URL
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
// ─── دریافت یک فاکتور خاص با ID ───
if (id) {
  try {
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        project: true,
        items: true,
        payments: true,
        delivery: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    
    if (!purchase) {
      return addSecurityHeaders(NextResponse.json({ error: 'فاکتور یافت نشد' }, { status: 404 }));
    }
    
    // ✅ جداگانه تراکنش‌های DELIVERY را از جدول Transaction بگیر
    const transactions = await db.transaction.findMany({
      where: {
        purchaseId: id,
        type: 'DELIVERY',
      },
      select: {
        materialId: true,
        actualQuantity: true,
        discrepancy: true,
        quantity: true,
      },
    });
    
    // اضافه کردن مغایرت به آیتم‌ها
    const itemsWithDiscrepancy = purchase.items.map(item => {
      const relatedTransaction = transactions.find(t => t.materialId === item.materialId);
      const hasDiscrepancy = relatedTransaction?.actualQuantity !== undefined && 
                             relatedTransaction.actualQuantity !== item.quantity;
      
      return {
        ...item,
        actualQuantity: relatedTransaction?.actualQuantity ?? null,
        discrepancy: relatedTransaction?.discrepancy ?? null,
        hasDiscrepancy: hasDiscrepancy,
      };
    });
    
    const result = {
      ...purchase,
      items: itemsWithDiscrepancy,
    };
    
    return addSecurityHeaders(NextResponse.json(result));
  } catch (error: unknown) {
    console.error('Get single invoice error:', error);
    return addSecurityHeaders(NextResponse.json({ error: 'خطا در دریافت فاکتور' }, { status: 500 }));
  }
}

  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '12');
  const skip = (page - 1) * pageSize;

  // ─── حالت بدون احراز هویت ───
  if (!auth.success) {
    try {
      const purchases = await db.purchase.findMany({
        where: { status: { not: 'draft' } },
        orderBy: { createdAt: 'desc' },
        include: { 
          supplier: { select: { id: true, companyName: true, contactName: true, phone: true } }, 
          project: { select: { id: true, name: true, location: true } }, 
          items: true, 
          payments: true, 
          delivery: true, 
          reminders: true 
        },
        skip,
        take: pageSize,
      });
      
      const total = await db.purchase.count({
        where: { status: { not: 'draft' } },
      });
      
      return addSecurityHeaders(NextResponse.json({ 
        purchases, 
        total, 
        page, 
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }));
    } catch {
      return addSecurityHeaders(NextResponse.json({ purchases: [], total: 0 }));
    }
  }

  // ─── حالت با احراز هویت ───
  try {
    const search = url.searchParams.get('search') || '';
    const projectId = url.searchParams.get('projectId') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const status = url.searchParams.get('status') || '';
    const type = url.searchParams.get('type') || '';

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.invoiceNumber = { contains: search };
    }
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    
    // فیلتر type
    if (type === 'corrective') {
      where.description = { contains: 'اصلاحی' };
    }

    // ─── فیلتر بر اساس نقش (ABAC) با در نظر گرفتن projectId از URL ───
    if (auth.role === 'WAREHOUSE_KEEPER' || auth.role === 'PROJECT_MANAGER') {
      const userProjects = await db.userProject.findMany({
        where: { userId: auth.userId },
        select: { projectId: true },
      });
      const projectIds = userProjects.map(up => up.projectId);
      
      // اگر projectId از URL آمده، بررسی کن که کاربر به آن دسترسی دارد
      if (projectId) {
        if (!projectIds.includes(projectId)) {
          return addSecurityHeaders(NextResponse.json({ 
            purchases: [], 
            total: 0, 
            page, 
            pageSize,
            totalPages: 0
          }));
        }
        where.projectId = projectId;
      } else {
        where.projectId = { in: projectIds };
      }
    } else {
      // برای نقش‌های دیگر (SUPER_MANAGER, ADMIN, PURCHASER)
      if (projectId) {
        where.projectId = projectId;
      }
    }

    // گرفتن کل تعداد برای صفحه‌بندی
    const total = await db.purchase.count({ where });
    
    // گرفتن داده‌ها با صفحه‌بندی
    const purchases = await db.purchase.findMany({
      where,
      include: {
        supplier: true,
        project: true,
        items: true,
        payments: true,
        delivery: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    return addSecurityHeaders(NextResponse.json({ 
      purchases, 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Purchase list error:', error);
    return addSecurityHeaders(NextResponse.json({ error: 'خطا در دریافت فاکتورها' }, { status: 500 }));
  }
}
// ─── POST /api/invoices ───
export async function POST(req: NextRequest) {
  const auth = await requirePermission('invoices:create');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const {
      invoiceNumber, projectId, supplierId, purchaseDate, dueDate,
      totalAmount, paidAmount, description, invoiceImageUrl, items,
      paymentMethod, settlementDate, taxAmount,
      pdfUrl, waybillUrl, deliveryReceiptUrl,
    } = body;

    // اعتبارسنجی ورودی
    if (!invoiceNumber || !projectId || !supplierId || !dueDate) {
      return NextResponse.json(
        { error: 'شماره فاکتور، پروژه، تأمین‌کننده و سررسید الزامی است' },
        { status: 400 }
      );
    }

    // جلوگیری از تزریق — طول ورودی‌ها
    if (invoiceNumber.length > 50 || (description && description.length > 2000)) {
      return NextResponse.json({ error: 'ورودی خیلی طولانی است' }, { status: 400 });
    }

    // بررسی یکتایی شماره فاکتور
    const existing = await db.purchase.findUnique({ where: { invoiceNumber } });
    if (existing) {
      return NextResponse.json({ error: 'شماره فاکتور تکراری است' }, { status: 400 });
    }

    // بررسی وجود پروژه
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'پروژه یافت نشد' }, { status: 404 });
    }

    // بررسی وجود تأمین‌کننده
    const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'تأمین‌کننده یافت نشد' }, { status: 404 });
    }

    // اعتبارسنجی اقلام
    const validItems = Array.isArray(items)
      ? items.filter((item: any) => item.materialName && item.quantity > 0 && item.unitPrice >= 0)
      : [];

    console.log('🔍 [CREATE INVOICE] validItems before create:', JSON.stringify(validItems, null, 2));
    
    // ایجاد فاکتور
    const purchase = await db.purchase.create({
      data: {
        invoiceNumber,
        projectId,
        supplierId,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        dueDate: new Date(dueDate),
        totalAmount: totalAmount || 0,
        paidAmount: paidAmount || 0,
        status: 'pending',
        description: description || null,
        invoiceImage: invoiceImageUrl  || null,
        createdById: auth.userId,
        paymentMethod: paymentMethod || null,
        settlementDate: settlementDate ? new Date(settlementDate) : null,
        taxAmount: taxAmount || 0,
        pdfUrl: pdfUrl || null,
        waybillUrl: waybillUrl || null,
        deliveryReceiptUrl: deliveryReceiptUrl || null,
        items: {
          create: validItems.map((item: any) => ({
            materialId: item.materialId || null,
            materialName: String(item.materialName).slice(0, 200),
            quantity: Number(item.quantity),
            unit: String(item.unit).slice(0, 30),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice || item.quantity * item.unitPrice),
          })),
        },
      },
      include: { supplier: true, project: true, items: true, payments: true, delivery: true },
    });

    // ✅ ارسال نوتیفیکیشن به مدیر پروژه
    const projectManager = await db.projectMember.findFirst({
      where: {
        projectId: projectId,
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
          title: '📄 فاکتور جدید نیاز به تایید دارد',
          message: `فاکتور شماره ${invoiceNumber} از ${supplier.companyName} ثبت شده و نیاز به تایید مدیر پروژه دارد.`,
          type: 'warning',
          link: `/invoices/${purchase.id}`,
          projectId: projectId,
        },
      });
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: unknown) {
    console.error('Purchase create error:', error);
    return NextResponse.json({ error: 'خطا در ایجاد فاکتور' }, { status: 500 });
  }
}
// ─── PUT /api/invoices ───
export async function PUT(req: NextRequest) {
  const auth = await requirePermission('invoices:edit');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { id, items, invoiceImageUrl, pdfUrl, waybillUrl, deliveryReceiptUrl, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'شناسه خرید الزامی است' }, { status: 400 });
    }

    const existing = await db.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      return NextResponse.json({ error: 'خرید یافت نشد' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    
    // فیلدهای اصلی
    if (rest.invoiceNumber !== undefined) updateData.invoiceNumber = rest.invoiceNumber;
    if (rest.projectId !== undefined) updateData.projectId = rest.projectId;
    if (rest.supplierId !== undefined) updateData.supplierId = rest.supplierId;
    if (rest.purchaseDate !== undefined) updateData.purchaseDate = rest.purchaseDate ? new Date(rest.purchaseDate) : new Date();
    if (rest.dueDate !== undefined) updateData.dueDate = rest.dueDate ? new Date(rest.dueDate) : new Date();
    if (rest.totalAmount !== undefined) updateData.totalAmount = rest.totalAmount;
    if (rest.paidAmount !== undefined) updateData.paidAmount = rest.paidAmount;
    if (rest.status !== undefined) updateData.status = rest.status;
    if (rest.description !== undefined) updateData.description = rest.description;
    if (invoiceImageUrl !== undefined) updateData.invoiceImage = invoiceImageUrl;
    
    // ✅ فیلدهای جدید - اضافه کن
    if (rest.paymentMethod !== undefined) updateData.paymentMethod = rest.paymentMethod;
    if (rest.settlementDate !== undefined) updateData.settlementDate = rest.settlementDate ? new Date(rest.settlementDate) : null;
    if (rest.taxAmount !== undefined) updateData.taxAmount = rest.taxAmount;
    if (pdfUrl !== undefined) updateData.pdfUrl = pdfUrl
    if (waybillUrl !== undefined) updateData.waybillUrl = waybillUrl;
    if (deliveryReceiptUrl !== undefined) updateData.deliveryReceiptUrl = deliveryReceiptUrl;

    if (items && Array.isArray(items)) {
      await db.purchaseItem.deleteMany({ where: { purchaseId: id } });
      updateData.items = {
        create: items.filter((item: any) => item.materialName && item.quantity > 0).map((item: any) => ({
          materialName: String(item.materialName).slice(0, 200),
          quantity: Number(item.quantity),
          unit: String(item.unit).slice(0, 30),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice || item.quantity * item.unitPrice),
        })),
      };
    }

    const purchase = await db.purchase.update({
      where: { id },
      data: updateData,
      include: { supplier: true, project: true, items: true, payments: true, delivery: true },
    });

    return NextResponse.json(purchase);
  } catch (error: unknown) {
    console.error('Purchase update error:', error);
    return NextResponse.json({ error: 'خطا در بروزرسانی فاکتور' }, { status: 500 });
  }
}

// ─── DELETE /api/invoices ───
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission('invoices:edit');
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'شناسه خرید الزامی است' }, { status: 400 });
    }

    const existing = await db.purchase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'خرید یافت نشد' }, { status: 404 });
    }

    // جلوگیری از حذف فاکتور پرداخت‌شده
    if (existing.status === 'paid') {
      return NextResponse.json({ error: 'فاکتور پرداخت‌شده قابل حذف نیست' }, { status: 400 });
    }

    await db.purchase.delete({ where: { id } });
    return NextResponse.json({ message: 'خرید با موفقیت حذف شد' });
  } catch (error: unknown) {
    console.error('Purchase delete error:', error);
    return NextResponse.json({ error: 'خطا در حذف فاکتور' }, { status: 500 });
  }
}
