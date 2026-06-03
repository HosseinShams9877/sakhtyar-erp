// scripts/sync-stock.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 شروع هماهنگ‌سازی موجودی مصالح...');

  // دریافت همه مصالح - استفاده از نام صحیح مدل
  const materials = await prisma.material.findMany();

  for (const material of materials) {
    // محاسبه مجموع تراکنش‌های خرید تأیید شده - استفاده از نام صحیح
    const purchaseTransactions = await prisma.transaction.aggregate({
      where: {
        materialId: material.id,
        type: 'PURCHASE',
        warehouseConfirmed: true,
      },
      _sum: {
        quantity: true,
      },
    });

    // محاسبه مجموع تراکنش‌های مصرف
    const consumptionTransactions = await prisma.transaction.aggregate({
      where: {
        materialId: material.id,
        type: 'CONSUMPTION',
        warehouseConfirmed: true,
      },
      _sum: {
        quantity: true,
      },
    });

    const totalPurchased = purchaseTransactions._sum.quantity || 0;
    const totalConsumed = consumptionTransactions._sum.quantity || 0;
    const calculatedStock = totalPurchased - totalConsumed;

    // به‌روزرسانی stock در جدول Material
    await prisma.material.update({
      where: { id: material.id },
      data: { stock: calculatedStock },
    });

    console.log(`✅ ${material.name}: stock قدیمی=${material.stock} → stock جدید=${calculatedStock}`);
  }

  console.log('🎉 هماهنگ‌سازی با موفقیت انجام شد!');
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });