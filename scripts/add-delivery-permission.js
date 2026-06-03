// scripts/add-delivery-permission.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 در حال بررسی مجوز deliveries:confirm برای انباردار...');

  // 1. پیدا کردن نقش WAREHOUSE_KEEPER
  const warehouseRole = await prisma.role.findFirst({
    where: { name: 'WAREHOUSE_KEEPER' }
  });

  if (!warehouseRole) {
    console.error('❌ نقش WAREHOUSE_KEEPER یافت نشد!');
    return;
  }

  console.log(`✅ نقش پیدا شد: ${warehouseRole.name} (${warehouseRole.id})`);

  // 2. بررسی وجود مجوز
  const existingPermission = await prisma.rolePermission.findFirst({
    where: {
      roleId: warehouseRole.id,
      resource: 'deliveries',
      action: 'confirm'
    }
  });

  if (existingPermission) {
    console.log('ℹ️ مجوز deliveries:confirm قبلاً وجود دارد!');
    return;
  }

  // 3. اضافه کردن مجوز
  const permission = await prisma.rolePermission.create({
    data: {
      roleId: warehouseRole.id,
      resource: 'deliveries',
      action: 'confirm',
      scope: 'project'
    }
  });

  console.log('✅ مجوز deliveries:confirm با موفقیت به انباردار اضافه شد!');
  console.log(`   ID: ${permission.id}`);
  console.log(`   Resource: ${permission.resource}`);
  console.log(`   Action: ${permission.action}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 اتصال به دیتابیس قطع شد');
  });