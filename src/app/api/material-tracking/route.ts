// ─── API رهگیری مصالح ───
// بازنویسی شده با PurchaseItem + DeliveryConfirmation
// به جای Material + Transaction + WarehouseStock
// پاسخ: "چه کالایی از کدام فروشگاه برای کدام پروژه و آیا تحویل داده شده؟"

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const materialName = url.searchParams.get('materialName') || '';

    // Build where clause for purchases
    const purchaseWhere: Record<string, unknown> = {};
    if (projectId) purchaseWhere.projectId = projectId;
    if (supplierId) purchaseWhere.supplierId = supplierId;

    // Fetch purchases with items, supplier, project, and delivery
    const purchases = await db.purchase.findMany({
      where: purchaseWhere,
      include: {
        items: true,
        supplier: true,
        project: true,
        delivery: true,
        payments: true,
      },
      orderBy: { purchaseDate: 'desc' },
      take: 200,
    });

    // Filter by material name if provided
    const filteredPurchases = materialName
      ? purchases.filter((p) =>
          p.items.some((item) =>
            item.materialName.toLowerCase().includes(materialName.toLowerCase())
          )
        )
      : purchases;

    // Build tracking summary: group by materialName per project
    const trackingMap = new Map<
      string,
      {
        materialName: string;
        unit: string;
        projectId: string;
        projectName: string;
        totalPurchasedQty: number;
        totalPurchasedAmount: number;
        totalDeliveredQty: number;
        deliveredCount: number;
        pendingDeliveryCount: number;
        totalPaid: number;
        suppliers: {
          supplierId: string;
          supplierName: string;
          totalQty: number;
          totalAmount: number;
        }[];
        lastPurchaseDate: string | null;
        lastDeliveryDate: string | null;
      }
    >();

    for (const purchase of filteredPurchases) {
      const isDelivered = purchase.delivery !== null;

      for (const item of purchase.items) {
        // Skip if material name filter is set and doesn't match
        if (
          materialName &&
          !item.materialName.toLowerCase().includes(materialName.toLowerCase())
        ) {
          continue;
        }

        const key = `${item.materialName}-${item.unit}-${purchase.projectId}`;
        const entry = trackingMap.get(key);

        const supplierInfo = {
          supplierId: purchase.supplierId,
          supplierName: purchase.supplier?.companyName || 'نامشخص',
          totalQty: item.quantity,
          totalAmount: item.totalPrice,
        };

        if (entry) {
          entry.totalPurchasedQty += item.quantity;
          entry.totalPurchasedAmount += item.totalPrice;
          if (isDelivered) {
            entry.totalDeliveredQty += item.quantity;
            entry.deliveredCount += 1;
          } else {
            entry.pendingDeliveryCount += 1;
          }
          entry.totalPaid += purchase.paidAmount;

          // Update supplier info
          const existingSupplier = entry.suppliers.find(
            (s) => s.supplierId === purchase.supplierId
          );
          if (existingSupplier) {
            existingSupplier.totalQty += item.quantity;
            existingSupplier.totalAmount += item.totalPrice;
          } else {
            entry.suppliers.push(supplierInfo);
          }

          // Update last dates
          const purchaseDate = new Date(purchase.purchaseDate);
          if (
            !entry.lastPurchaseDate ||
            purchaseDate > new Date(entry.lastPurchaseDate)
          ) {
            entry.lastPurchaseDate = purchaseDate.toISOString();
          }
          if (isDelivered && purchase.delivery) {
            const deliveryDate = new Date(purchase.delivery.deliveryDate);
            if (
              !entry.lastDeliveryDate ||
              deliveryDate > new Date(entry.lastDeliveryDate)
            ) {
              entry.lastDeliveryDate = deliveryDate.toISOString();
            }
          }
        } else {
          trackingMap.set(key, {
            materialName: item.materialName,
            unit: item.unit,
            projectId: purchase.projectId,
            projectName: purchase.project.name,
            totalPurchasedQty: item.quantity,
            totalPurchasedAmount: item.totalPrice,
            totalDeliveredQty: isDelivered ? item.quantity : 0,
            deliveredCount: isDelivered ? 1 : 0,
            pendingDeliveryCount: isDelivered ? 0 : 1,
            totalPaid: purchase.paidAmount,
            suppliers: [supplierInfo],
            lastPurchaseDate: new Date(purchase.purchaseDate).toISOString(),
            lastDeliveryDate:
              isDelivered && purchase.delivery
                ? new Date(purchase.delivery.deliveryDate).toISOString()
                : null,
          });
        }
      }
    }

    const summary = Array.from(trackingMap.values()).sort(
      (a, b) =>
        a.projectName.localeCompare(b.projectName) ||
        a.materialName.localeCompare(b.materialName)
    );

    // Fetch filters data
    const projects = await db.project.findMany({
      select: { id: true, name: true, location: true },
      orderBy: { name: 'asc' },
    });

    const suppliers = await db.supplier.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' },
    });

    // Get unique material names from all purchase items
    const allItems = await db.purchaseItem.findMany({
      select: { materialName: true },
      distinct: ['materialName'],
      orderBy: { materialName: 'asc' },
    });

    return NextResponse.json({
      summary,
      purchases: filteredPurchases.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        purchaseDate: p.purchaseDate,
        dueDate: p.dueDate,
        totalAmount: p.totalAmount,
        paidAmount: p.paidAmount,
        status: p.status,
        description: p.description,
        supplier: { id: p.supplier?.id || '', companyName: p.supplier?.companyName || 'نامشخص' },
        project: { id: p.project.id, name: p.project.name, location: p.project.location },
        items: p.items,
        delivery: p.delivery
          ? {
              id: p.delivery.id,
              deliveryDate: p.delivery.deliveryDate,
              confirmedBy: p.delivery.confirmedBy,
              notes: p.delivery.notes,
            }
          : null,
        paymentCount: p.payments.length,
      })),
      filters: {
        projects,
        suppliers,
        materials: allItems.map((i) => ({ name: i.materialName })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    console.error('Material tracking error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
