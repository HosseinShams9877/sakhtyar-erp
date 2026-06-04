import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Clear existing data (order matters for foreign keys)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('🗑️  Clearing existing data...');
  await prisma.reminderLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.deliveryConfirmation.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.approvalLog.deleteMany();
  await prisma.workflowConfig.deleteMany();
  await prisma.customFieldValue.deleteMany();
  await prisma.customField.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userProject.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.project.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.material.deleteMany();
  await prisma.materialCategory.deleteMany();

 
  // ────────────────────────────────────────────────────────────────────────────
  // 4. Create Roles
  // ────────────────────────────────────────────────────────────────────────────
  console.log('👥 Creating roles...');
  const roles = await Promise.all([
    prisma.role.create({ data: { name: 'SUPER_MANAGER', label: 'مدیر کل پروژه‌ها', description: 'بالاترین سطح دسترسی', color: '#7c3aed', isSystem: true, priority: 1 } }),
    prisma.role.create({ data: { name: 'PROJECT_MANAGER', label: 'مدیر پروژه', description: 'کنترل پروژه خودش', color: '#2563eb', isSystem: true, priority: 2 } }),
    prisma.role.create({ data: { name: 'PURCHASER', label: 'مسئول خرید', description: 'ثبت خرید و مدیریت تامین‌کنندگان', color: '#d97706', isSystem: true, priority: 3 } }),
    prisma.role.create({ data: { name: 'WAREHOUSE_KEEPER', label: 'انباردار', description: 'تایید تحویل مصالح', color: '#059669', isSystem: true, priority: 4 } }),
    prisma.role.create({ data: { name: 'ADMIN', label: 'ادمین سیستم', description: 'مدیریت فنی سیستم', color: '#dc2626', isSystem: true, priority: 5 } }),
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Create Users
  // ────────────────────────────────────────────────────────────────────────────
  console.log('👤 Creating users...');
  const usersData = [
    { name: 'احمد توکلی', nationalCode: '1234567890', mobile: '09121234567', email: 'admin@sakhtyar.ir', phone: '03112345678', roleId: roles[0].id },
    { name: 'حسن نوری', nationalCode: '1234567891', mobile: '09122345678', email: 'pm@sakhtyar.ir', phone: '03122345678', roleId: roles[1].id },
    { name: 'رضا کریمی', nationalCode: '1234567892', mobile: '09123456789', email: 'buyer@sakhtyar.ir', phone: '03133456789', roleId: roles[2].id },
    { name: 'علی حسینی', nationalCode: '1234567893', mobile: '09124567890', email: 'warehouse@sakhtyar.ir', phone: '03144567890', roleId: roles[3].id },
    { name: 'مریم احمدی', nationalCode: '1234567894', mobile: '09125678901', email: 'sysadmin@sakhtyar.ir', phone: '03155678901', roleId: roles[4].id },
  ];

  const users = await Promise.all(
    usersData.map(async (u) => {
      const hashedPassword = await bcrypt.hash(u.mobile, 12);
      return prisma.user.create({
        data: {
          name: u.name,
          nationalCode: u.nationalCode,
          mobile: u.mobile,
          email: u.email,
          password: hashedPassword,
          phone: u.phone,
          isActive: true,
          roleId: u.roleId,
        },
      });
    })
  );

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Create Projects
  // ────────────────────────────────────────────────────────────────────────────
  console.log('🏗️ Creating projects...');
  const projects = await Promise.all([
    prisma.project.create({ data: { name: 'برج الهیه', code: 'PRJ-001', location: 'اصفهان، الهیه', status: 'active', budget: 5000000000, managerId: users[1].id } }),
    prisma.project.create({ data: { name: 'ویلای لواسان', code: 'PRJ-002', location: 'لواسان، تهران', status: 'active', budget: 2000000000, managerId: users[1].id } }),
    prisma.project.create({ data: { name: 'مجتمع تجاری سعادت‌آباد', code: 'PRJ-003', location: 'تهران، سعادت‌آباد', status: 'active', budget: 8000000000, purchaseResponsibleId: users[2].id } }),
    prisma.project.create({ data: { name: 'بیمارستان ولیعصر', code: 'PRJ-004', location: 'کرج، ولیعصر', status: 'on_hold', budget: 12000000000, warehouseKeeperId: users[3].id } }),
  ]);

  // ────────────────────────────────────────────────────────────────────────────
// 2. Create Material Categories (بعد از projects)
// ────────────────────────────────────────────────────────────────────────────
console.log('📦 Creating material categories...');
await prisma.materialCategory.createMany({
  data: [
    { name: 'آهن‌آلات', description: 'میلگرد، تیرآهن، ورق و نبشی' },
    { name: 'سیمان', description: 'سیمان تیپ ۲ و تیپ ۵' },
    { name: 'شن و ماسه', description: 'شن شسته، ماسه، نخود سنگی' },
    { name: 'عایق', description: 'عایق حرارتی، رطوبتی و صوتی' },
    { name: 'آجر و بلوک', description: 'آجر نما، آجر فرش، بلوک سیمانی' },
    { name: 'شیمیایی', description: 'رنگ، رزین، چسب ساختمانی' },
  ],
});

const materialCategory = await prisma.materialCategory.findMany();

// ────────────────────────────────────────────────────────────────────────────
// 3. Create Materials (با projectId معتبر)
// ────────────────────────────────────────────────────────────────────────────
console.log('📦 Creating materials...');

const materialsData = [
  // پروژه برج الهیه (projects[0].id)
  { name: 'میلگرد ساده ۱۶', code: 'MAT-001', categoryId: materialCategory.find(c => c.name === 'آهن‌آلات')!.id, unit: 'KILOGRAM', minStock: 500, projectId: projects[0].id },
  { name: 'میلگرد آجدار ۲۰', code: 'MAT-002', categoryId: materialCategory.find(c => c.name === 'آهن‌آلات')!.id, unit: 'KILOGRAM', minStock: 300, projectId: projects[0].id },
  { name: 'میلگرد آجدار ۲۵', code: 'MAT-003', categoryId: materialCategory.find(c => c.name === 'آهن‌آلات')!.id, unit: 'KILOGRAM', minStock: 200, projectId: projects[0].id },
  { name: 'تیرآهن INP ۱۴', code: 'MAT-004', categoryId: materialCategory.find(c => c.name === 'آهن‌آلات')!.id, unit: 'KILOGRAM', minStock: 100, projectId: projects[0].id },
  { name: 'ورق سیاه ۶ میل', code: 'MAT-005', categoryId: materialCategory.find(c => c.name === 'آهن‌آلات')!.id, unit: 'KILOGRAM', minStock: 500, projectId: projects[0].id },
  { name: 'نبشی ۵۰', code: 'MAT-006', categoryId: materialCategory.find(c => c.name === 'آهن‌آلات')!.id, unit: 'KILOGRAM', minStock: 200, projectId: projects[0].id },
  { name: 'سیمان تیپ ۲', code: 'MAT-007', categoryId: materialCategory.find(c => c.name === 'سیمان')!.id, unit: 'TON', minStock: 50, projectId: projects[0].id },
  { name: 'سیمان تیپ ۵', code: 'MAT-008', categoryId: materialCategory.find(c => c.name === 'سیمان')!.id, unit: 'TON', minStock: 20, projectId: projects[0].id },
  
  // پروژه ویلای لواسان (projects[1].id)
  { name: 'شن شسته', code: 'MAT-009', categoryId: materialCategory.find(c => c.name === 'شن و ماسه')!.id, unit: 'TON', minStock: 100, projectId: projects[1].id },
  { name: 'ماسه شسته', code: 'MAT-010', categoryId: materialCategory.find(c => c.name === 'شن و ماسه')!.id, unit: 'TON', minStock: 80, projectId: projects[1].id },
  { name: 'نخود سنگی', code: 'MAT-011', categoryId: materialCategory.find(c => c.name === 'شن و ماسه')!.id, unit: 'TON', minStock: 50, projectId: projects[1].id },
  
  // پروژه مجتمع تجاری (projects[2].id)
  { name: 'عایق پشم سنگ', code: 'MAT-012', categoryId: materialCategory.find(c => c.name === 'عایق')!.id, unit: 'SQUARE_METER', minStock: 200, projectId: projects[2].id },
  { name: 'عایق فوم پلی‌اتیلن', code: 'MAT-013', categoryId: materialCategory.find(c => c.name === 'عایق')!.id, unit: 'SQUARE_METER', minStock: 100, projectId: projects[2].id },
  
  // پروژه بیمارستان (projects[3].id)
  { name: 'آجر نما هفت‌رنگ', code: 'MAT-014', categoryId: materialCategory.find(c => c.name === 'آجر و بلوک')!.id, unit: 'NUMBER', minStock: 5000, projectId: projects[3].id },
  { name: 'بلوک سیمانی ۲۰', code: 'MAT-015', categoryId: materialCategory.find(c => c.name === 'آجر و بلوک')!.id, unit: 'NUMBER', minStock: 3000, projectId: projects[3].id },
];

for (const material of materialsData) {
  try {
    await prisma.material.create({ data: material });
    console.log(`✅ Created: ${material.name} for project ${material.projectId}`);
  } catch (error) {
    console.error(`❌ Failed: ${material.name}`, error);
  }
}

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Create Suppliers
  // ────────────────────────────────────────────────────────────────────────────
  console.log('🏪 Creating suppliers...');
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { companyName: 'آهن‌فروشی مرکزی', contactName: 'محمد رضایی', phone: '۰۹۱۲۳۴۵۶۷۸۹', address: 'اصفهان، خیابان آهن‌گران، پلاک ۱۲' } }),
    prisma.supplier.create({ data: { companyName: 'سیمان اصفهان', contactName: 'علی محمدی', phone: '۰۹۱۳۱۲۳۴۵۶۷', address: 'اصفهان، شهرک صنعتی، فاز ۲' } }),
    prisma.supplier.create({ data: { companyName: 'شن و ماسه پارس', contactName: 'حسین کریمی', phone: '۰۹۱۴۵۶۷۸۹۰۱۲', address: 'اصفهان، جاده نجف‌آباد، کیلومتر ۵' } }),
    prisma.supplier.create({ data: { companyName: 'عایق‌کاری نوین', contactName: 'رضا احمدی', phone: '۰۹۱۵۶۷۸۹۰۱۲۳', address: 'تهران، شهرک صنعتی شمس‌آباد' } }),
    prisma.supplier.create({ data: { companyName: 'آجر و بلوک بهشتی', contactName: 'مهدی حسینی', phone: '۰۹۱۶۷۸۹۰۱۲۳۴', address: 'اصفهان، جاده خمینی‌شهر' } }),
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // 8. Helper functions for dates
  // ────────────────────────────────────────────────────────────────────────────
  const today = new Date();
  const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
  const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  // ────────────────────────────────────────────────────────────────────────────
  // 9. Create Purchases
  // ────────────────────────────────────────────────────────────────────────────
  console.log('📄 Creating purchases...');

  const p1 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-001', projectId: projects[0].id, supplierId: suppliers[0].id,
      purchaseDate: daysAgo(20), dueDate: daysAgo(5), totalAmount: 45000000, paidAmount: 0, status: 'overdue',
      description: 'خرید میلگرد و تیرآهن برای اسکلت برج',
      items: { create: [{ materialName: 'میلگرد ساده ۱۶', quantity: 2000, unit: 'کیلوگرم', unitPrice: 12000, totalPrice: 24000000 }, { materialName: 'تیرآهن INP ۱۴', quantity: 500, unit: 'کیلوگرم', unitPrice: 28000, totalPrice: 14000000 }, { materialName: 'میلگرد آجدار ۲۰', quantity: 500, unit: 'کیلوگرم', unitPrice: 14000, totalPrice: 7000000 }] },
    },
  });

  const p2 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-002', projectId: projects[1].id, supplierId: suppliers[1].id,
      purchaseDate: daysAgo(15), dueDate: daysAgo(2), totalAmount: 28000000, paidAmount: 10000000, status: 'partial',
      description: 'سیمان تیپ ۲ برای فونداسیون ویلا',
      items: { create: [{ materialName: 'سیمان تیپ ۲', quantity: 200, unit: 'تن', unitPrice: 120000, totalPrice: 24000000 }, { materialName: 'سیمان تیپ ۵', quantity: 20, unit: 'تن', unitPrice: 200000, totalPrice: 4000000 }] },
    },
  });

  const p3 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-003', projectId: projects[0].id, supplierId: suppliers[2].id,
      purchaseDate: daysAgo(10), dueDate: today, totalAmount: 15000000, paidAmount: 0, status: 'pending',
      description: 'شن و ماسه برای بتن‌ریزی طبقه سوم',
      items: { create: [{ materialName: 'شن شسته', quantity: 100, unit: 'تن', unitPrice: 80000, totalPrice: 8000000 }, { materialName: 'ماسه شسته', quantity: 70, unit: 'تن', unitPrice: 70000, totalPrice: 4900000 }, { materialName: 'نخود سنگی', quantity: 30, unit: 'تن', unitPrice: 70000, totalPrice: 2100000 }] },
    },
  });

  const p4 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-004', projectId: projects[2].id, supplierId: suppliers[0].id,
      purchaseDate: daysAgo(7), dueDate: daysFromNow(2), totalAmount: 62000000, paidAmount: 0, status: 'pending',
      description: 'ورق و نبشی برای سقف مجتمع',
      items: { create: [{ materialName: 'ورق سیاه ۶ میل', quantity: 3000, unit: 'کیلوگرم', unitPrice: 15000, totalPrice: 45000000 }, { materialName: 'نبشی ۵۰', quantity: 800, unit: 'کیلوگرم', unitPrice: 18000, totalPrice: 14400000 }, { materialName: 'میلگرد آجدار ۲۵', quantity: 200, unit: 'کیلوگرم', unitPrice: 13000, totalPrice: 2600000 }] },
    },
  });

  const p5 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-005', projectId: projects[3].id, supplierId: suppliers[3].id,
      purchaseDate: daysAgo(5), dueDate: daysFromNow(5), totalAmount: 35000000, paidAmount: 0, status: 'pending',
      description: 'عایق حرارتی و رطوبتی برای دیوارهای بیمارستان',
      items: { create: [{ materialName: 'عایق پشم سنگ', quantity: 500, unit: 'مترمربع', unitPrice: 45000, totalPrice: 22500000 }, { materialName: 'عایق فوم پلی‌اتیلن', quantity: 200, unit: 'مترمربع', unitPrice: 55000, totalPrice: 11000000 }, { materialName: 'نوار درزگیر', quantity: 50, unit: 'رول', unitPrice: 30000, totalPrice: 1500000 }] },
    },
  });

  const p6 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-006', projectId: projects[1].id, supplierId: suppliers[4].id,
      purchaseDate: daysAgo(3), dueDate: daysFromNow(10), totalAmount: 18500000, paidAmount: 0, status: 'pending',
      description: 'آجر نما و بلوک سیمانی برای دیوارچینی',
      items: { create: [{ materialName: 'آجر نما هفت‌رنگ', quantity: 5000, unit: 'عدد', unitPrice: 2500, totalPrice: 12500000 }, { materialName: 'بلوک سیمانی ۲۰', quantity: 2000, unit: 'عدد', unitPrice: 3000, totalPrice: 6000000 }] },
    },
  });

  const p7 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-007', projectId: projects[0].id, supplierId: suppliers[1].id,
      purchaseDate: daysAgo(30), dueDate: daysAgo(10), totalAmount: 12000000, paidAmount: 12000000, status: 'paid',
      description: 'سیمان برای ستون‌های طبقه اول و دوم',
      items: { create: [{ materialName: 'سیمان تیپ ۲', quantity: 100, unit: 'تن', unitPrice: 120000, totalPrice: 12000000 }] },
    },
  });

  const p8 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-008', projectId: projects[2].id, supplierId: suppliers[2].id,
      purchaseDate: daysAgo(2), dueDate: daysFromNow(14), totalAmount: 9500000, paidAmount: 0, status: 'pending',
      description: 'شن بادی و ماسه بادی برای ملات',
      items: { create: [{ materialName: 'شن بادی', quantity: 60, unit: 'تن', unitPrice: 75000, totalPrice: 4500000 }, { materialName: 'ماسه بادی', quantity: 50, unit: 'تن', unitPrice: 65000, totalPrice: 3250000 }, { materialName: 'خاک رس', quantity: 20, unit: 'تن', unitPrice: 87500, totalPrice: 1750000 }] },
    },
  });

  const p9 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-009', projectId: projects[3].id, supplierId: suppliers[0].id,
      purchaseDate: daysAgo(30), dueDate: daysAgo(10), totalAmount: 78000000, paidAmount: 20000000, status: 'overdue',
      description: 'آهن‌آلات اسکلت فلزی بیمارستان',
      items: { create: [{ materialName: 'میلگرد آجدار ۲۸', quantity: 3000, unit: 'کیلوگرم', unitPrice: 16000, totalPrice: 48000000 }, { materialName: 'ورق سیاه ۱۰ میل', quantity: 1000, unit: 'کیلوگرم', unitPrice: 18000, totalPrice: 18000000 }, { materialName: 'قوطی ۱۶', quantity: 600, unit: 'کیلوگرم', unitPrice: 20000, totalPrice: 12000000 }] },
    },
  });

  const p10 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-010', projectId: projects[1].id, supplierId: suppliers[3].id,
      purchaseDate: daysAgo(4), dueDate: daysFromNow(3), totalAmount: 8000000, paidAmount: 0, status: 'pending',
      description: 'عایق صوتی برای دیوارهای داخلی ویلا',
      items: { create: [{ materialName: 'عایق فوم آکوستیک', quantity: 150, unit: 'مترمربع', unitPrice: 40000, totalPrice: 6000000 }, { materialName: 'ژئوممبران', quantity: 100, unit: 'مترمربع', unitPrice: 20000, totalPrice: 2000000 }] },
    },
  });

  const p11 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-011', projectId: projects[2].id, supplierId: suppliers[4].id,
      purchaseDate: daysAgo(25), dueDate: daysAgo(7), totalAmount: 22000000, paidAmount: 5000000, status: 'overdue',
      description: 'بلوک سیمانی و آجر فرش برای مجتمع',
      items: { create: [{ materialName: 'بلوک سیمانی ۱۵', quantity: 3000, unit: 'عدد', unitPrice: 3500, totalPrice: 10500000 }, { materialName: 'آجر فرش', quantity: 5000, unit: 'عدد', unitPrice: 2300, totalPrice: 11500000 }] },
    },
  });

  const p12 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'INV-1404-012', projectId: projects[0].id, supplierId: suppliers[4].id,
      purchaseDate: daysAgo(1), dueDate: daysFromNow(25), totalAmount: 16000000, paidAmount: 0, status: 'pending',
      description: 'آجر نما و بلوک برای دیوارچینی طبقه چهارم',
      items: { create: [{ materialName: 'آجر نما ماشینی', quantity: 4000, unit: 'عدد', unitPrice: 2200, totalPrice: 8800000 }, { materialName: 'بلوک سیمانی ۲۰', quantity: 1800, unit: 'عدد', unitPrice: 4000, totalPrice: 7200000 }] },
    },
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 10. Create Payments
  // ────────────────────────────────────────────────────────────────────────────
  console.log('💰 Creating payments...');
  await prisma.payment.create({ data: { purchaseId: p7.id, amount: 12000000, paymentDate: daysAgo(12), note: 'پرداخت کامل فاکتور سیمان طبقه اول' } });
  await prisma.payment.create({ data: { purchaseId: p2.id, amount: 10000000, paymentDate: daysAgo(5), note: 'پیش‌پرداخت سیمان فونداسیون ویلا' } });
  await prisma.payment.create({ data: { purchaseId: p9.id, amount: 20000000, paymentDate: daysAgo(15), note: 'پیش‌پرداخت آهن‌آلات بیمارستان' } });
  await prisma.payment.create({ data: { purchaseId: p11.id, amount: 5000000, paymentDate: daysAgo(8), note: 'بخشی از بدهی بلوک و آجر مجتمع' } });

  // ────────────────────────────────────────────────────────────────────────────
  // 11. Create Delivery Confirmations
  // ────────────────────────────────────────────────────────────────────────────
  console.log('🚚 Creating delivery confirmations...');
  await prisma.deliveryConfirmation.create({ data: { purchaseId: p7.id, projectId: projects[0].id, deliveryDate: daysAgo(28), confirmedBy: 'احمد توکلی', notes: 'تحویل در محل پروژه برج الهیه - طبقه اول و دوم' } });
  await prisma.deliveryConfirmation.create({ data: { purchaseId: p2.id, projectId: projects[1].id, deliveryDate: daysAgo(13), confirmedBy: 'حسن نوری', notes: 'تحویل در کارگاه ویلا - انبار سیمان' } });

  // ────────────────────────────────────────────────────────────────────────────
  // 12. Create Workflow Configs
  // ────────────────────────────────────────────────────────────────────────────
  console.log('⚙️ Creating workflow configs...');
  await prisma.workflowConfig.createMany({
    data: [
      { projectId: projects[0].id, stepOrder: 1, stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
      { projectId: projects[0].id, stepOrder: 2, stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      { projectId: projects[0].id, stepOrder: 3, stepName: 'تایید انباردار', requiredRole: 'WAREHOUSE_KEEPER', isRequired: false },
      { projectId: projects[1].id, stepOrder: 1, stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
      { projectId: projects[1].id, stepOrder: 2, stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      { projectId: projects[2].id, stepOrder: 1, stepName: 'بررسی خرید', requiredRole: 'PURCHASER', isRequired: true },
      { projectId: projects[2].id, stepOrder: 2, stepName: 'تایید نهایی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      { projectId: projects[3].id, stepOrder: 1, stepName: 'بررسی خرید', requiredRole: 'PURCHASER', isRequired: true },
      { projectId: projects[3].id, stepOrder: 2, stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
      { projectId: projects[3].id, stepOrder: 3, stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      { projectId: projects[3].id, stepOrder: 4, stepName: 'تایید انباردار', requiredRole: 'WAREHOUSE_KEEPER', isRequired: true },
    ],
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 13. Create User-Project Access
  // ────────────────────────────────────────────────────────────────────────────
  console.log('🔗 Creating user-project access...');
  await prisma.userProject.createMany({
    data: [
      { userId: users[1].id, projectId: projects[0].id, role: 'manager' },
      { userId: users[1].id, projectId: projects[1].id, role: 'manager' },
      { userId: users[2].id, projectId: projects[0].id, role: 'viewer' },
      { userId: users[2].id, projectId: projects[1].id, role: 'viewer' },
      { userId: users[2].id, projectId: projects[2].id, role: 'viewer' },
      { userId: users[2].id, projectId: projects[3].id, role: 'viewer' },
      { userId: users[3].id, projectId: projects[0].id, role: 'viewer' },
      { userId: users[3].id, projectId: projects[1].id, role: 'viewer' },
    ],
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 14. Create Notifications
  // ────────────────────────────────────────────────────────────────────────────
  console.log('🔔 Creating notifications...');
  await prisma.notification.createMany({
    data: [
      { userId: users[0].id, title: 'فاکتور سررسید گذشته', message: 'فاکتور INV-1404-001 آهن‌فروشی مرکزی ۵ روز از سررسید گذشته است', type: 'error' },
      { userId: users[0].id, title: 'فاکتور سررسید امروز', message: 'فاکتور INV-1404-003 شن و ماسه پارس امروز سررسید است', type: 'warning' },
      { userId: users[0].id, title: 'درخواست تایید فاکتور', message: 'فاکتور INV-1404-004 نیاز به تایید شما دارد', type: 'info' },
      { userId: users[1].id, title: 'بدهی پروژه', message: 'مجموع بدهی پروژه برج الهیه: ۷۳ میلیون ریال', type: 'warning' },
      { userId: users[1].id, title: 'تحویل مصالح', message: 'تحویل سیمان برای پروژه ویلای لواسان ثبت شد', type: 'success' },
      { userId: users[2].id, title: 'فاکتور جدید', message: 'فاکتور INV-1404-005 توسط مدیر پروژه ارسال شده', type: 'info' },
      { userId: users[3].id, title: 'تحویل در انتظار', message: 'تحویل مصالح برای پروژه برج الهیه در انتظار تایید', type: 'info' },
    ],
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 15. Create System Settings
  // ────────────────────────────────────────────────────────────────────────────
  console.log('⚙️ Creating system settings...');
  await prisma.systemSetting.createMany({
    data: [
      { key: 'company_name', value: 'ساخت‌یار', category: 'general', label: 'نام شرکت', type: 'text', isPublic: true },
      { key: 'alert_days_before_due', value: '7', category: 'alert', label: 'روز قبل از سررسید برای هشدار', type: 'number', isPublic: false },
      { key: 'alert_days_urgent', value: '3', category: 'alert', label: 'روز قبل از سررسید (فوری)', type: 'number', isPublic: false },
      { key: 'default_payment_method', value: 'CASH', category: 'general', label: 'روش پرداخت پیش‌فرض', type: 'select', options: '["CASH","CHECK","CREDIT"]', isPublic: true },
      { key: 'theme', value: 'light', category: 'appearance', label: 'پوسته', type: 'select', options: '["light","dark","system"]', isPublic: true },
      { key: 'currency', value: 'ریال', category: 'general', label: 'واحد پول', type: 'text', isPublic: true },
      { key: 'enable_workflow', value: 'true', category: 'workflow', label: 'فعال‌سازی ورک‌فلو تایید', type: 'boolean', isPublic: false },
      { key: 'enable_email_notification', value: 'false', category: 'notification', label: 'ارسال ایمیل هشدار', type: 'boolean', isPublic: false },
    ],
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 16. Create Alerts
  // ────────────────────────────────────────────────────────────────────────────
  console.log('⚠️ Creating alerts...');
  await prisma.alert.createMany({
    data: [
      { title: 'سررسید گذشته', message: 'فاکتور INV-1404-001 آهن‌فروشی مرکزی ۵ روز از سررسید گذشته', type: 'danger', category: 'due_date', triggerDate: daysAgo(5), projectId: projects[0].id, purchaseId: p1.id, userId: users[0].id },
      { title: 'سررسید امروز', message: 'فاکتور INV-1404-003 شن و ماسه پارس امروز سررسید است', type: 'warning', category: 'due_date', triggerDate: today, projectId: projects[0].id, purchaseId: p3.id, userId: users[0].id },
      { title: 'موجودی کم', message: 'موجودی سیمان تیپ ۲ به حداقل رسیده', type: 'warning', category: 'low_stock', triggerDate: today },
      { title: 'پرداخت معوقه', message: 'بدهی بیمارستان ولیعصر به آهن‌فروشی مرکزی ۵۸ میلیون ریال', type: 'danger', category: 'payment', triggerDate: daysAgo(10), projectId: projects[3].id, purchaseId: p9.id, userId: users[0].id },
    ],
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 17. Create Custom Fields
  // ────────────────────────────────────────────────────────────────────────────
  console.log('📝 Creating custom fields...');
  await prisma.customField.createMany({
    data: [
      { entity: 'purchase', fieldName: 'contract_number', label: 'شماره قرارداد', type: 'text', required: false, sortOrder: 1 },
      { entity: 'purchase', fieldName: 'payment_method', label: 'نوع پرداخت', type: 'select', options: '["نقدی","چکی","اعتباری"]', required: true, sortOrder: 2 },
      { entity: 'supplier', fieldName: 'economic_code', label: 'کد اقتصادی', type: 'text', required: false, sortOrder: 1 },
      { entity: 'supplier', fieldName: 'supplier_type', label: 'نوع تامین‌کننده', type: 'select', options: '["عمده‌فروش","خرده‌فروش","تولیدکننده"]', required: false, sortOrder: 2 },
      { entity: 'project', fieldName: 'contract_amount', label: 'مبلغ قرارداد', type: 'number', required: false, sortOrder: 1 },
      { entity: 'project', fieldName: 'employer_name', label: 'نام کارفرما', type: 'text', required: true, sortOrder: 2 },
      { entity: 'delivery', fieldName: 'vehicle_plate', label: 'پلاک خودرو', type: 'text', required: false, sortOrder: 1 },
      { entity: 'delivery', fieldName: 'driver_name', label: 'نام راننده', type: 'text', required: false, sortOrder: 2 },
    ],
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });