// ─── API موجودی / تحویل ───
// بازنویسی شده با Purchase + PurchaseItem + DeliveryConfirmation
// به جای Material + Transaction + WarehouseStock
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    const supplierId = url.searchParams.get('supplierId') || '';
    const status = url.searchParams.get('status') || '';

    // Build where clause for purchases
    const purchaseWhere: Record<string, unknown> = {};
    if (projectId) purchaseWhere.projectId = projectId;
    if (supplierId) purchaseWhere.supplierId = supplierId;
    if (status) purchaseWhere.status = status;

    // Fetch purchases with their items and delivery confirmations
    const purchases = await db.purchase.findMany({
      where: purchaseWhere,
      include: {
        supplier: true,
        project: true,
        items: true,
        delivery: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });

    // Build inventory data from purchase items and delivery confirmations
    const inventoryMap = new Map<string, {
      materialName: string;
      unit: string;
      totalPurchased: number;
      totalDelivered: number;
      totalAmount: number;
      purchases: number;
      delivered: number;
      pending: number;
    }>();

    for (const purchase of purchases) {
      const isDelivered = purchase.delivery !== null;

      for (const item of purchase.items) {
        const key = `${item.materialName}-${item.unit}`;
        const entry = inventoryMap.get(key);

        if (entry) {
          entry.totalPurchased += item.quantity;
          entry.totalAmount += item.totalPrice;
          entry.purchases += 1;
          if (isDelivered) {
            entry.totalDelivered += item.quantity;
            entry.delivered += 1;
          } else {
            entry.pending += 1;
          }
        } else {
          inventoryMap.set(key, {
            materialName: item.materialName,
            unit: item.unit,
            totalPurchased: item.quantity,
            totalDelivered: isDelivered ? item.quantity : 0,
            totalAmount: item.totalPrice,
            purchases: 1,
            delivered: isDelivered ? 1 : 0,
            pending: isDelivered ? 0 : 1,
          });
        }
      }
    }

    const inventory = Array.from(inventoryMap.values());

    // Fetch delivery confirmations for detailed view
    const deliveryWhere: Record<string, unknown> = {};
    if (projectId) deliveryWhere.projectId = projectId;

    const deliveries = await db.deliveryConfirmation.findMany({
      where: deliveryWhere,
      include: {
        purchase: {
          include: {
            supplier: true,
            items: true,
          },
        },
        project: true,
      },
      orderBy: { deliveryDate: 'desc' },
    });

    const summary = {
      totalMaterials: inventory.length,
      totalPurchases: purchases.length,
      deliveredPurchases: purchases.filter((p) => p.delivery !== null).length,
      pendingDeliveries: purchases.filter((p) => p.delivery === null).length,
      totalPurchaseAmount: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
    };

    return NextResponse.json({
      inventory,
      deliveries: deliveries.map((d) => ({
        id: d.id,
        deliveryDate: d.deliveryDate,
        confirmedBy: d.confirmedBy,
        notes: d.notes,
        project: d.project,
        purchase: {
          id: d.purchase.id,
          invoiceNumber: d.purchase.invoiceNumber,
          supplier: d.purchase.supplier,
          items: d.purchase.items,
        },
      })),
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
