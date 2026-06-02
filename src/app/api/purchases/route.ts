import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/purchases — List purchases with filters, or single purchase by ?id=xxx
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const projectId = url.searchParams.get('projectId') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const status = url.searchParams.get('status') || '';

    // Single purchase detail
    if (id) {
      const purchase = await db.purchase.findUnique({
        where: { id },
        include: {
          items: true,
          supplier: true,
          project: true,
          delivery: true,
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });

      if (!purchase) {
        return NextResponse.json(
          { error: 'خرید یافت نشد' },
          { status: 404 }
        );
      }

      return NextResponse.json(purchase);
    }

    // Build filter
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const purchases = await db.purchase.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        items: true,
        supplier: { select: { id: true, companyName: true, contactName: true, phone: true } },
        project: { select: { id: true, name: true, location: true } },
        delivery: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(purchases);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/purchases — Create purchase with items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      invoiceNumber,
      projectId,
      supplierId,
      purchaseDate,
      dueDate,
      totalAmount,
      description,
      invoiceImage,
      items,
    } = body;

    // Validation
    if (!invoiceNumber || !projectId || !supplierId || !purchaseDate || !dueDate || totalAmount === undefined) {
      return NextResponse.json(
        { error: 'شماره فاکتور، پروژه، تامین‌کننده، تاریخ خرید، سررسید و مبلغ کل الزامی است' },
        { status: 400 }
      );
    }

    // Check invoice number uniqueness
    const existingInvoice = await db.purchase.findUnique({
      where: { invoiceNumber },
    });
    if (existingInvoice) {
      return NextResponse.json(
        { error: 'شماره فاکتور تکراری است' },
        { status: 409 }
      );
    }

    // Validate project and supplier exist
    const [projectExists, supplierExists] = await Promise.all([
      db.project.findUnique({ where: { id: projectId } }),
      db.supplier.findUnique({ where: { id: supplierId } }),
    ]);

    if (!projectExists) {
      return NextResponse.json({ error: 'پروژه یافت نشد' }, { status: 404 });
    }
    if (!supplierExists) {
      return NextResponse.json({ error: 'تامین‌کننده یافت نشد' }, { status: 404 });
    }

    // Create purchase with items in a transaction
    const purchase = await db.purchase.create({
      data: {
        invoiceNumber,
        projectId,
        supplierId,
        purchaseDate: new Date(purchaseDate),
        dueDate: new Date(dueDate),
        totalAmount: Number(totalAmount),
        paidAmount: 0,
        status: 'pending',
        description: description || null,
        invoiceImage: invoiceImage || null,
        items: {
          create: (items || []).map((item: { materialName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }) => ({
            materialName: item.materialName,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
        },
      },
      include: {
        items: true,
        supplier: true,
        project: true,
      },
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/purchases — Update purchase
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      invoiceNumber,
      projectId,
      supplierId,
      purchaseDate,
      dueDate,
      totalAmount,
      status,
      description,
      invoiceImage,
      items,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه خرید الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.purchase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'خرید یافت نشد' },
        { status: 404 }
      );
    }

    // Check invoice number uniqueness if changed
    if (invoiceNumber && invoiceNumber !== existing.invoiceNumber) {
      const duplicate = await db.purchase.findUnique({
        where: { invoiceNumber },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'شماره فاکتور تکراری است' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseDate);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (totalAmount !== undefined) updateData.totalAmount = Number(totalAmount);
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (invoiceImage !== undefined) updateData.invoiceImage = invoiceImage;

    // If items provided, replace them
    if (items && Array.isArray(items)) {
      // Use a transaction to delete old items and create new ones
      const purchase = await db.$transaction(async (tx) => {
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

        return tx.purchase.update({
          where: { id },
          data: {
            ...updateData,
            items: {
              create: items.map((item: { materialName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }) => ({
                materialName: item.materialName,
                quantity: Number(item.quantity),
                unit: item.unit,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
              })),
            },
          },
          include: {
            items: true,
            supplier: true,
            project: true,
          },
        });
      });

      return NextResponse.json(purchase);
    }

    const purchase = await db.purchase.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        supplier: true,
        project: true,
      },
    });

    return NextResponse.json(purchase);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/purchases — Delete purchase
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه خرید الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.purchase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'خرید یافت نشد' },
        { status: 404 }
      );
    }

    await db.purchase.delete({ where: { id } });

    return NextResponse.json({ message: 'خرید با موفقیت حذف شد' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
