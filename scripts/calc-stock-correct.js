// scripts/calc-stock-correct.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 محاسبه مجدد stock از تراکنش‌ها (روش صحیح)...\n');

  const materials = await prisma.material.findMany();

  for (const material of materials) {
    // مجموع خریدها (افزایش موجودی)
    const purchases = await prisma.transaction.aggregate({
      where: {
        materialId: material.id,
        type: 'PURCHASE',
      },
      _sum: { quantity: true },
    });

    // مجموع تحویل‌ها (کاهش موجودی)
    const deliveries = await prisma.transaction.aggregate({
      where: {
        materialId: material.id,
        type: 'DELIVERY',
      },
      _sum: { quantity: true },
    });

    // مجموع مصرف‌ها (کاهش موجودی)
    const consumptions = await prisma.transaction.aggregate({
      where: {
        materialId: material.id,
        type: 'CONSUMPTION',
      },
      _sum: { quantity: true },
    });

    const totalPurchased = purchases._sum.quantity || 0;
    const totalDelivered = deliveries._sum.quantity || 0;
    const totalConsumed = consumptions._sum.quantity || 0;
    const newStock = totalPurchased - totalDelivered - totalConsumed;

    await prisma.material.update({
      where: { id: material.id },
      data: { stock: newStock },
    });

    console.log(`📦 ${material.name}: PURCHASE=${totalPurchased}, DELIVERY=${totalDelivered}, CONSUMPTION=${totalConsumed} → stock=${newStock}`);
  }

  console.log('\n🎉 محاسبه مجدد کامل شد!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());