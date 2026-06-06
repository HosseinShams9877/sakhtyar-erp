const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // پیدا کردن کاربر مسئول خرید (رضا کریمی)
  const purchaser = await prisma.user.findFirst({
    where: { name: 'رضا کریمی' },
    select: { id: true, name: true }
  });
  
  if (!purchaser) {
    console.log('❌ کاربر مسئول خرید یافت نشد');
    return;
  }
  
  console.log(`👤 مسئول خرید: ${purchaser.name} (${purchaser.id})`);
  console.log('');
  
  // همه نوتیفیکیشن‌های این کاربر
  const notifications = await prisma.notification.findMany({
    where: { userId: purchaser.id },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`📋 تعداد کل نوتیفیکیشن‌ها: ${notifications.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('عنوان نوتیفیکیشن‌ها:');
  console.log('');
  
  const titles = new Set();
  
  notifications.forEach((n, idx) => {
    console.log(`${idx + 1}. "${n.title}"`);
    titles.add(n.title);
  });
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('عنوان‌های یکتا (Unique titles):');
  titles.forEach(t => console.log(`   - "${t}"`));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });