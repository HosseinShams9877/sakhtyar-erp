// scripts/show-data.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('📊 ===== مصالح (Material) =====\n');
  const materials = await prisma.material.findMany({
    select: { id: true, name: true, code: true, stock: true, unit: true, projectId: true }
  });
  console.table(materials);

  console.log('\n📊 ===== فاکتورها (Purchase) =====\n');
  const purchases = await prisma.purchase.findMany({
    select: { id: true, invoiceNumber: true, projectId: true, supplierId: true, totalAmount: true, status: true }
  });
  console.table(purchases);

  console.log('\n📊 ===== اقلام فاکتور (PurchaseItem) =====\n');
  const items = await prisma.purchaseItem.findMany({
    select: { 
      id: true, 
      purchaseId: true, 
      materialId: true,      // ✅ اضافه کن
      materialName: true, 
      quantity: true, 
      unit: true 
    }
  });
  console.table(items);

  console.log('\n📊 ===== تراکنش‌های تحویل (Transaction) =====\n');
  const transactions = await prisma.transaction.findMany({
    where: { type: 'DELIVERY' },
    select: { id: true, type: true, materialId: true, quantity: true, warehouseConfirmed: true, purchaseId: true, createdAt: true }
  });
  console.table(transactions);

  // ✅ اضافه کن: بررسی تطابق materialId بین PurchaseItem و Material
  console.log('\n📊 ===== بررسی تطابق materialId =====\n');
  const itemsWithMaterial = await prisma.purchaseItem.findMany({
    where: { materialId: { not: null } },
    select: { id: true, materialId: true, materialName: true, quantity: true }
  });
  console.log(`تعداد آیتم‌هایی که materialId دارند: ${itemsWithMaterial.length}`);
  console.table(itemsWithMaterial);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());