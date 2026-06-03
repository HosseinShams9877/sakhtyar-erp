// scripts/check-data.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 بررسی دیتاهای سیمان تیپ ۲...\n');

  // 1. پیدا کردن سیمان تیپ ۲
  const material = await prisma.material.findFirst({
    where: { name: 'سیمان تیپ ۲' }
  });

  if (!material) {
    console.log('❌ سیمان تیپ ۲ یافت نشد!');
    return;
  }

  console.log(`📦 Material: ${material.name}`);
  console.log(`   ID: ${material.id}`);
  console.log(`   stock در جدول Material: ${material.stock}\n`);

  // 2. همه تراکنش‌های سیمان تیپ ۲
  const transactions = await prisma.transaction.findMany({
    where: { materialId: material.id },
    orderBy: { date: 'desc' }
  });

  console.log(`📋 تعداد تراکنش‌ها: ${transactions.length}\n`);

  let totalQuantity = 0;
  for (const tx of transactions) {
    console.log(`   - نوع: ${tx.type}, مقدار: ${tx.quantity}, تایید شده: ${tx.warehouseConfirmed}`);
    if (tx.type === 'PURCHASE') {
      totalQuantity += tx.quantity;
    } else if (tx.type === 'CONSUMPTION') {
      totalQuantity -= tx.quantity;
    }
  }

  console.log(`\n📊 مجموع موجودی از تراکنش‌ها: ${totalQuantity}`);
  console.log(`📊 stock در جدول Material: ${material.stock}`);
  console.log(`\n${totalQuantity === material.stock ? '✅ هماهنگ هستند' : '❌ هماهنگ نیستند'}`);

  // 3. بررسی PurchaseItem برای سیمان تیپ ۲
  const purchaseItems = await prisma.purchaseItem.findMany({
    where: { materialName: 'سیمان تیپ ۲' }
  });

  console.log(`\n📋 تعداد اقلام در PurchaseItem: ${purchaseItems.length}`);
  let purchaseItemTotal = 0;
  for (const item of purchaseItems) {
    purchaseItemTotal += item.quantity;
    console.log(`   - مقدار: ${item.quantity}, واحد: ${item.unit}`);
  }
  console.log(`📊 مجموع از PurchaseItem: ${purchaseItemTotal}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());