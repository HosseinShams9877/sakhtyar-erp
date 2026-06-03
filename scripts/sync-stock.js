// scripts/fix-transactions.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // حذف تراکنش CONSUMPTION برای سیمان تیپ ۲ (تکراری)
  const result = await prisma.transaction.deleteMany({
    where: {
      materialId: 'cmpvpyx8w005ui67g88tn7vyj',
      type: 'CONSUMPTION',
      quantity: 40
    }
  });
  
  console.log(`✅ ${result.count} تراکنش CONSUMPTION حذف شد`);
  
  // حالا stock را دوباره محاسبه کن
  const material = await prisma.material.findUnique({
    where: { id: 'cmpvpyx8w005ui67g88tn7vyj' }
  });
  
  console.log(`📦 سیمان تیپ ۲: stock جدید = ${material.stock}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());