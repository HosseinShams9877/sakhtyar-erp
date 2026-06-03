// scripts/sync-stock.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 شروع هماهنگ‌سازی موجودی مصالح...');

  const materials = await prisma.material.findMany();

  for (const material of materials) {
    const purchaseTransactions = await prisma.transaction.aggregate({
      where: {
        materialId: material.id,
        type: 'PURCHASE',
        warehouseConfirmed: true,
      },
      _sum: { quantity: true },
    });

    const consumptionTransactions = await prisma.transaction.aggregate({
      where: {
        materialId: material.id,
        type: 'CONSUMPTION',
        warehouseConfirmed: true,
      },
      _sum: { quantity: true },
    });

    const totalPurchased = purchaseTransactions._sum.quantity || 0;
    const totalConsumed = consumptionTransactions._sum.quantity || 0;
    const calculatedStock = totalPurchased - totalConsumed;

    await prisma.material.update({
      where: { id: material.id },
      data: { stock: calculatedStock },
    });

    console.log(`✅ ${material.name}: ${material.stock} → ${calculatedStock}`);
  }

  console.log('🎉 هماهنگ‌سازی با موفقیت انجام شد!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());