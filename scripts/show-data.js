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
    select: { id: true, purchaseId: true, materialName: true, quantity: true, unit: true }
  });
  console.table(items);

  console.log('\n📊 ===== تراکنش‌ها (Transaction) =====\n');
  const transactions = await prisma.transaction.findMany({
    select: { id: true, type: true, materialId: true, quantity: true, warehouseConfirmed: true }
  });
  console.table(transactions);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());