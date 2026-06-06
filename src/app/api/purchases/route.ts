import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';

// GET /api/purchases — List purchases with filters, or single purchase by ?id=xxx
export async function GET(req: NextRequest) {
  const auth = await requirePermission('purchases:view');
  if (!auth.success) return auth.response;

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
    console.error('GET /api/purchases error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/purchases — Create purchase with items
export async function POST(req: NextRequest) {
  const auth = await requirePermission('purchases:create');
  if (!auth.success) return auth.response;

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
    const purchase = await db.$transaction(async (tx) => {
      // Create purchase
      const newPurchase = await tx.purchase.create({
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
            create: await Promise.all((items || []).map(async (item: any, idx: number) => {
              // Find materialId by name, unit and project
              let materialId = null;
              if (item.materialName && item.unit) {
                const material = await tx.material.findFirst({
                  where: {
                    name: item.materialName,
                    unit: item.unit,
                    projectId: projectId,
                  },
                });
                if (material) {
                  materialId = material.id ?? null;
                }
              }
              
              return {
                materialId,
                materialName: item.materialName,
                quantity: Number(item.quantity),
                unit: item.unit,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
              };
            })),
          },
        },
        include: { items: true, supplier: true, project: true },
      });

      // Create warehouse transactions for each item
      for (const item of newPurchase.items) {
        if (item.materialId) {
          await tx.transaction.create({
            data: {
              type: 'PURCHASE',
              materialId: item.materialId,
              projectId: projectId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              purchaseId: newPurchase.id,
              supplierId: supplierId,
              warehouseConfirmed: false,
              date: new Date(),
            },
          });
        }
      }

      return newPurchase;
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('POST /api/purchases error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/purchases — Update purchase
export async function PUT(req: NextRequest) {
  const auth = await requirePermission('purchases:edit');
  if (!auth.success) return auth.response;

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
      // Use a transaction to delete old items, update transactions, and create new ones
      const result = await db.$transaction(async (tx) => {
        // Get old items to update stock if needed
        const oldItems = await tx.purchaseItem.findMany({
          where: { purchaseId: id },
        });

        // Delete old transactions related to this purchase
        await tx.transaction.deleteMany({
          where: { purchaseId: id },
        });

        // Delete old items
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

        // Update purchase with new items
        const updatedPurchase = await tx.purchase.update({
          where: { id },
          data: {
            ...updateData,
            items: {
              create: await Promise.all(items.map(async (item: any) => {
                let materialId = null;
                const finalProjectId = projectId || existing.projectId;
                
                if (item.materialName && item.unit) {
                  const material = await tx.material.findFirst({
                    where: {
                      name: item.materialName,
                      unit: item.unit,
                      projectId: finalProjectId,
                    },
                  });
                  if (material) {
                    materialId = material.id ?? null;
                  }
                }
                
                return {
                  materialId,
                  materialName: item.materialName,
                  quantity: Number(item.quantity),
                  unit: item.unit,
                  unitPrice: Number(item.unitPrice),
                  totalPrice: Number(item.totalPrice),
                };
              })),
            },
          },
          include: { items: true },
        });

        // Create new transactions for new items
        for (const item of updatedPurchase.items) {
          if (item.materialId) {
            await tx.transaction.create({
              data: {
                type: 'PURCHASE',
                materialId: item.materialId,
                projectId: projectId || existing.projectId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                purchaseId: id,
                supplierId: supplierId || existing.supplierId,
                warehouseConfirmed: false,
                date: new Date(),
              },
            });
          }
        }

        return updatedPurchase;
      });

      const finalPurchase = await db.purchase.findUnique({
        where: { id },
        include: { items: true, supplier: true, project: true },
      });

      return NextResponse.json(finalPurchase);
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
    console.error('PUT /api/purchases error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/purchases — Delete purchase
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission('purchases:delete');
  if (!auth.success) return auth.response;

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

    // Delete in transaction to clean up related records
    await db.$transaction(async (tx) => {
      // Delete transactions related to this purchase
      await tx.transaction.deleteMany({
        where: { purchaseId: id },
      });
      
      // Delete purchase (cascade will delete items)
      await tx.purchase.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'خرید با موفقیت حذف شد' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('DELETE /api/purchases error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}