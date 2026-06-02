import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/security';

// GET /api/seed — Seed the database with realistic Persian test data
// SECURITY: فقط در محیط توسعه قابل دسترسی است
export async function GET(req: NextRequest) {
  // Rate limit — حداکثر ۳ بار در دقیقه
  const rl = rateLimit(req, 3, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 });
  }

  // جلوگیری از seed در محیط تولید
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'این عملیات در محیط تولید غیرفعال است' },
      { status: 403 }
    );
  }

  // توکن امنیتی — از حدس و سوءاستفاده جلوگیری می‌کند
  const token = req.nextUrl.searchParams.get('token');
  const validToken = process.env.SEED_TOKEN || 'seed-dev-2024';
  if (token !== validToken) {
    return NextResponse.json(
      { error: 'توکن امنیتی نامعتبر. /api/seed?token=seed-dev-2024' },
      { status: 403 }
    );
  }

  try {
    // ─── Clean up existing data (idempotent) ───
    // ترتیب حذف بر اساس وابستگی‌های کلید خارجی
    await db.reminderLog.deleteMany();
    await db.payment.deleteMany();
    await db.deliveryConfirmation.deleteMany();
    await db.purchaseItem.deleteMany();
    await db.approvalLog.deleteMany();
    await db.workflowConfig.deleteMany();
    await db.customFieldValue.deleteMany();
    await db.customField.deleteMany();
    await db.notification.deleteMany();
    await db.userProject.deleteMany();
    await db.purchase.deleteMany();
    // ─── Delete Transaction before Project/Supplier (FK dependency) ───
    await db.transaction.deleteMany();
    await db.supplier.deleteMany();
    await db.project.deleteMany();
    await db.rolePermission.deleteMany();
    await db.role.deleteMany();
    await db.user.deleteMany();

    // ─── Delete new model data ───
    await db.alert.deleteMany();
    await db.auditLog.deleteMany();
    await db.systemSetting.deleteMany();
    await db.material.deleteMany();
    await db.materialCategory.deleteMany();

    // ─── Create System Roles with Permissions ───
    const roles = await Promise.all([
      // ─── مدیر کل پروژه‌ها ───
      // بالاترین سطح دسترسی — کنترل کل پروژه‌ها، بدهی‌ها و وضعیت مالی
      db.role.create({
        data: {
          name: 'SUPER_MANAGER',
          label: 'مدیر کل پروژه‌ها',
          description: 'بالاترین سطح دسترسی — کنترل کل پروژه‌ها، بدهی‌ها و وضعیت مالی',
          color: '#7c3aed',
          isSystem: true,
          priority: 1,
          permissions: {
            create: [
              // مشاهده — همه پروژه‌ها، خریدها، تامین‌کنندگان، بدهی‌ها، سررسیدها، گزارشات کلان، وضعیت نقدینگی، هشدارها
              { resource: 'dashboard', action: 'view', scope: 'all' },
              { resource: 'projects', action: 'view', scope: 'all' },
              { resource: 'projects', action: 'create', scope: 'all' },
              { resource: 'projects', action: 'edit', scope: 'all' },
              { resource: 'invoices', action: 'view', scope: 'all' },
              { resource: 'invoices', action: 'create', scope: 'all' },
              { resource: 'invoices', action: 'edit', scope: 'all' },
              { resource: 'invoices', action: 'approve', scope: 'all' },
              { resource: 'invoices', action: 'delete', scope: 'all' },
              { resource: 'dues', action: 'view', scope: 'all' },
              { resource: 'vendors', action: 'view', scope: 'all' },
              { resource: 'vendors', action: 'create', scope: 'all' },
              { resource: 'vendors', action: 'edit', scope: 'all' },
              { resource: 'transactions', action: 'view', scope: 'all' },
              { resource: 'transactions', action: 'create', scope: 'all' },
              { resource: 'transactions', action: 'approve', scope: 'all' },
              { resource: 'warehouse', action: 'view', scope: 'all' },
              { resource: 'warehouse', action: 'create', scope: 'all' },
              { resource: 'reports', action: 'view', scope: 'all' },
              { resource: 'reports', action: 'export', scope: 'all' },
              { resource: 'materials', action: 'view', scope: 'all' },
              { resource: 'tracking', action: 'view', scope: 'all' },
              // عملیات — تایید نهایی پرداخت، مشاهده فاکتور، تغییر تسویه، مشاهده عملکرد کاربران
              { resource: 'users', action: 'view', scope: 'all' },
              { resource: 'users', action: 'create', scope: 'all' },
              { resource: 'users', action: 'edit', scope: 'all' },
              { resource: 'settings', action: 'view', scope: 'all' },
              { resource: 'settings', action: 'edit', scope: 'all' },
              { resource: 'permissions', action: 'manage', scope: 'all' },
              { resource: 'workflow', action: 'manage', scope: 'all' },
              { resource: 'audit', action: 'view', scope: 'all' },
            ],
          },
        },
      }),
      // ─── مدیر پروژه ───
      // کنترل پروژه خودش — فقط پروژه‌های خودش
      db.role.create({
        data: {
          name: 'PROJECT_MANAGER',
          label: 'مدیر پروژه',
          description: 'کنترل پروژه خودش — دسترسی محدود به پروژه‌های اختصاص‌یافته',
          color: '#2563eb',
          isSystem: true,
          priority: 2,
          permissions: {
            create: [
              // مشاهده — فقط پروژه‌های خودش
              { resource: 'dashboard', action: 'view', scope: 'project' },
              { resource: 'projects', action: 'view', scope: 'project' },
              { resource: 'projects', action: 'edit', scope: 'project' },
              { resource: 'invoices', action: 'view', scope: 'project' },
              { resource: 'invoices', action: 'create', scope: 'project' },
              { resource: 'invoices', action: 'approve', scope: 'project' },
              { resource: 'dues', action: 'view', scope: 'project' },
              { resource: 'vendors', action: 'view', scope: 'project' },
              { resource: 'transactions', action: 'view', scope: 'project' },
              { resource: 'warehouse', action: 'view', scope: 'project' },
              { resource: 'reports', action: 'view', scope: 'project' },
              { resource: 'materials', action: 'view', scope: 'project' },
              { resource: 'tracking', action: 'view', scope: 'project' },
              // ❌ پروژه‌های دیگر، تنظیمات سیستم، کاربران، گزارش مالی کل شرکت
            ],
          },
        },
      }),
      // ─── مسئول خرید ───
      // ثبت خرید و مدیریت تامین‌کنندگان — موبایل‌محور
      db.role.create({
        data: {
          name: 'PURCHASER',
          label: 'مسئول خرید',
          description: 'ثبت خرید و مدیریت تامین‌کنندگان — موبایل‌محور',
          color: '#d97706',
          isSystem: true,
          priority: 3,
          permissions: {
            create: [
              { resource: 'dashboard', action: 'view', scope: 'assigned' },
              { resource: 'invoices', action: 'view', scope: 'all' },
              { resource: 'invoices', action: 'create', scope: 'all' },
              { resource: 'invoices', action: 'edit', scope: 'own' },
              { resource: 'dues', action: 'view', scope: 'assigned' },
              { resource: 'vendors', action: 'view', scope: 'all' },
              { resource: 'vendors', action: 'create', scope: 'all' },
              { resource: 'vendors', action: 'edit', scope: 'all' },
              { resource: 'transactions', action: 'view', scope: 'assigned' },
              { resource: 'materials', action: 'view', scope: 'assigned' },
              // ❌ تنظیمات سیستم، مدیریت کاربران، اطلاعات مالی کلان
            ],
          },
        },
      }),
      // ─── انباردار ───
      // فوق‌العاده ساده — فقط تایید تحویل مصالح — کاملاً موبایل محور
      db.role.create({
        data: {
          name: 'WAREHOUSE_KEEPER',
          label: 'انباردار',
          description: 'فقط تایید تحویل مصالح — کاملاً موبایل محور',
          color: '#059669',
          isSystem: true,
          priority: 4,
          permissions: {
            create: [
              // فقط: تحویل‌های پروژه خودش، لیست خریدهای در انتظار تحویل، مشخصات کالاها
              { resource: 'dashboard', action: 'view', scope: 'assigned' },
              { resource: 'warehouse', action: 'view', scope: 'project' },
              { resource: 'warehouse', action: 'create', scope: 'project' },
              { resource: 'invoices', action: 'view', scope: 'project' },
              { resource: 'materials', action: 'view', scope: 'project' },
              { resource: 'tracking', action: 'view', scope: 'project' },
              // ❌ بدهی‌ها، سررسیدها، گزارشات مالی، تنظیمات، تامین‌کنندگان
            ],
          },
        },
      }),
      // ─── ادمین سیستم ───
      // مدیریت فنی سیستم — Desktop Professional
      db.role.create({
        data: {
          name: 'ADMIN',
          label: 'ادمین سیستم',
          description: 'مدیریت فنی سیستم، کاربران، نقش‌ها و تنظیمات',
          color: '#dc2626',
          isSystem: true,
          priority: 5,
          permissions: {
            create: [
              // مدیریتی — مدیریت کاربران، تعیین نقش‌ها، تنظیمات سیستم، نوتیفیکیشن، بکاپ، لاگ‌ها، ورک‌فلو
              { resource: 'dashboard', action: 'view', scope: 'all' },
              { resource: 'users', action: 'view', scope: 'all' },
              { resource: 'users', action: 'create', scope: 'all' },
              { resource: 'users', action: 'edit', scope: 'all' },
              { resource: 'users', action: 'delete', scope: 'all' },
              { resource: 'settings', action: 'view', scope: 'all' },
              { resource: 'settings', action: 'edit', scope: 'all' },
              { resource: 'reports', action: 'view', scope: 'all' },
              { resource: 'reports', action: 'export', scope: 'all' },
              { resource: 'permissions', action: 'manage', scope: 'all' },
              { resource: 'workflow', action: 'manage', scope: 'all' },
              { resource: 'audit', action: 'view', scope: 'all' },
              { resource: 'dues', action: 'view', scope: 'all' },
              // ❌ تایید مالی، تغییر تسویه‌ها (مگر با دسترسی ویژه)
            ],
          },
        },
      }),
    ]);

    // ─── Create Demo Users ───
    // نحوه ورود: کد ملی = یوزرنیم | شماره موبایل = پسورد
    // هر شخص هنگام تعریف، کد ملی و موبایلش به عنوان شناسه ورود تنظیم می‌شود
    const usersData = [
      { name: 'احمد توکلی',   nationalCode: '1234567890', mobile: '09121234567', email: 'admin@sakhtyar.ir',     phone: '03112345678', roleId: roles[0].id }, // مدیر کل
      { name: 'حسن نوری',     nationalCode: '1234567891', mobile: '09122345678', email: 'pm@sakhtyar.ir',        phone: '03122345678', roleId: roles[1].id }, // مدیر پروژه
      { name: 'رضا کریمی',    nationalCode: '1234567892', mobile: '09123456789', email: 'buyer@sakhtyar.ir',     phone: '03133456789', roleId: roles[2].id }, // مسئول خرید
      { name: 'علی حسینی',    nationalCode: '1234567893', mobile: '09124567890', email: 'warehouse@sakhtyar.ir', phone: '03144567890', roleId: roles[3].id }, // انباردار
      { name: 'مریم احمدی',   nationalCode: '1234567894', mobile: '09125678901', email: 'sysadmin@sakhtyar.ir',  phone: '03155678901', roleId: roles[4].id }, // ادمین سیستم
    ];

    const users = await Promise.all(
      usersData.map(async (u) => {
        // پسورد = هش شماره موبایل
        const hashedPassword = await bcrypt.hash(u.mobile, 12);
        return db.user.create({
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

    // ─── Create Projects ───
    const projects = await Promise.all([
      db.project.create({
        data: { name: 'برج الهیه', code: 'PRJ-001', location: 'اصفهان، الهیه', status: 'active', budget: 5000000000, managerId: users[1].id },
      }),
      db.project.create({
        data: { name: 'ویلای لواسان', code: 'PRJ-002', location: 'لواسان، تهران', status: 'active', budget: 2000000000, managerId: users[1].id },
      }),
      db.project.create({
        data: { name: 'مجتمع تجاری سعادت‌آباد', code: 'PRJ-003', location: 'تهران، سعادت‌آباد', status: 'active', budget: 8000000000, purchaseResponsibleId: users[2].id },
      }),
      db.project.create({
        data: { name: 'بیمارستان ولیعصر', code: 'PRJ-004', location: 'کرج، ولیعصر', status: 'on_hold', budget: 12000000000, warehouseKeeperId: users[3].id },
      }),
    ]);

    // ─── Create Suppliers ───
    const suppliers = await Promise.all([
      db.supplier.create({
        data: {
          companyName: 'آهن‌فروشی مرکزی',
          contactName: 'محمد رضایی',
          phone: '۰۹۱۲۳۴۵۶۷۸۹',
          address: 'اصفهان، خیابان آهن‌گران، پلاک ۱۲',
        },
      }),
      db.supplier.create({
        data: {
          companyName: 'سیمان اصفهان',
          contactName: 'علی محمدی',
          phone: '۰۹۱۳۱۲۳۴۵۶۷',
          address: 'اصفهان، شهرک صنعتی، فاز ۲',
        },
      }),
      db.supplier.create({
        data: {
          companyName: 'شن و ماسه پارس',
          contactName: 'حسین کریمی',
          phone: '۰۹۱۴۵۶۷۸۹۰۱۲',
          address: 'اصفهان، جاده نجف‌آباد، کیلومتر ۵',
        },
      }),
      db.supplier.create({
        data: {
          companyName: 'عایق‌کاری نوین',
          contactName: 'رضا احمدی',
          phone: '۰۹۱۵۶۷۸۹۰۱۲۳',
          address: 'تهران، شهرک صنعتی شمس‌آباد',
        },
      }),
      db.supplier.create({
        data: {
          companyName: 'آجر و بلوک بهشتی',
          contactName: 'مهدی حسینی',
          phone: '۰۹۱۶۷۸۹۰۱۲۳۴',
          address: 'اصفهان، جاده خمینی‌شهر',
        },
      }),
    ]);

    // ─── Helper: date offsets from today ───
    const today = new Date();
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d;
    };
    const daysFromNow = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };

    // ─── Create Purchases with Items ───
    // Purchase 1: Overdue (5 days ago)
    const p1 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-001',
        projectId: projects[0].id, // برج الهیه
        supplierId: suppliers[0].id, // آهن‌فروشی مرکزی
        purchaseDate: daysAgo(20),
        dueDate: daysAgo(5),
        totalAmount: 45000000,
        paidAmount: 0,
        status: 'overdue',
        description: 'خرید میلگرد و تیرآهن برای اسکلت برج',
        items: {
          create: [
            { materialName: 'میلگرد ساده ۱۶', quantity: 2000, unit: 'کیلوگرم', unitPrice: 12000, totalPrice: 24000000 },
            { materialName: 'تیرآهن INP ۱۴', quantity: 500, unit: 'کیلوگرم', unitPrice: 28000, totalPrice: 14000000 },
            { materialName: 'میلگرد آجدار ۲۰', quantity: 500, unit: 'کیلوگرم', unitPrice: 14000, totalPrice: 7000000 },
          ],
        },
      },
    });

    // Purchase 2: Overdue (2 days ago)
    const p2 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-002',
        projectId: projects[1].id, // ویلای لواسان
        supplierId: suppliers[1].id, // سیمان اصفهان
        purchaseDate: daysAgo(15),
        dueDate: daysAgo(2),
        totalAmount: 28000000,
        paidAmount: 10000000,
        status: 'partial',
        description: 'سیمان تیپ ۲ برای فونداسیون ویلا',
        items: {
          create: [
            { materialName: 'سیمان تیپ ۲', quantity: 200, unit: 'تن', unitPrice: 120000, totalPrice: 24000000 },
            { materialName: 'سیمان تیپ ۵', quantity: 20, unit: 'تن', unitPrice: 200000, totalPrice: 4000000 },
          ],
        },
      },
    });

    // Purchase 3: Due today
    const p3 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-003',
        projectId: projects[0].id, // برج الهیه
        supplierId: suppliers[2].id, // شن و ماسه پارس
        purchaseDate: daysAgo(10),
        dueDate: today,
        totalAmount: 15000000,
        paidAmount: 0,
        status: 'pending',
        description: 'شن و ماسه برای بتن‌ریزی طبقه سوم',
        items: {
          create: [
            { materialName: 'شن شسته', quantity: 100, unit: 'تن', unitPrice: 80000, totalPrice: 8000000 },
            { materialName: 'ماسه شسته', quantity: 70, unit: 'تن', unitPrice: 70000, totalPrice: 4900000 },
            { materialName: 'نخود سنگی', quantity: 30, unit: 'تن', unitPrice: 70000, totalPrice: 2100000 },
          ],
        },
      },
    });

    // Purchase 4: Due in 2 days
    const p4 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-004',
        projectId: projects[2].id, // مجتمع تجاری
        supplierId: suppliers[0].id, // آهن‌فروشی مرکزی
        purchaseDate: daysAgo(7),
        dueDate: daysFromNow(2),
        totalAmount: 62000000,
        paidAmount: 0,
        status: 'pending',
        description: 'ورق و نبشی برای سقف مجتمع',
        items: {
          create: [
            { materialName: 'ورق سیاه ۶ میل', quantity: 3000, unit: 'کیلوگرم', unitPrice: 15000, totalPrice: 45000000 },
            { materialName: 'نبشی ۵۰', quantity: 800, unit: 'کیلوگرم', unitPrice: 18000, totalPrice: 14400000 },
            { materialName: 'میلگرد آجدار ۲۵', quantity: 200, unit: 'کیلوگرم', unitPrice: 13000, totalPrice: 2600000 },
          ],
        },
      },
    });

    // Purchase 5: Due in 5 days
    const p5 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-005',
        projectId: projects[3].id, // بیمارستان
        supplierId: suppliers[3].id, // عایق‌کاری نوین
        purchaseDate: daysAgo(5),
        dueDate: daysFromNow(5),
        totalAmount: 35000000,
        paidAmount: 0,
        status: 'pending',
        description: 'عایق حرارتی و رطوبتی برای دیوارهای بیمارستان',
        items: {
          create: [
            { materialName: 'عایق پشم سنگ', quantity: 500, unit: 'مترمربع', unitPrice: 45000, totalPrice: 22500000 },
            { materialName: 'عایق فوم پلی‌اتیلن', quantity: 200, unit: 'مترمربع', unitPrice: 55000, totalPrice: 11000000 },
            { materialName: 'نوار درزگیر', quantity: 50, unit: 'رول', unitPrice: 30000, totalPrice: 1500000 },
          ],
        },
      },
    });

    // Purchase 6: Due in 10 days (safe)
    const p6 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-006',
        projectId: projects[1].id, // ویلای لواسان
        supplierId: suppliers[4].id, // آجر و بلوک بهشتی
        purchaseDate: daysAgo(3),
        dueDate: daysFromNow(10),
        totalAmount: 18500000,
        paidAmount: 0,
        status: 'pending',
        description: 'آجر نما و بلوک سیمانی برای دیوارچینی',
        items: {
          create: [
            { materialName: 'آجر نما هفت‌رنگ', quantity: 5000, unit: 'عدد', unitPrice: 2500, totalPrice: 12500000 },
            { materialName: 'بلوک سیمانی ۲۰', quantity: 2000, unit: 'عدد', unitPrice: 3000, totalPrice: 6000000 },
          ],
        },
      },
    });

    // Purchase 7: Paid
    const p7 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-007',
        projectId: projects[0].id, // برج الهیه
        supplierId: suppliers[1].id, // سیمان اصفهان
        purchaseDate: daysAgo(30),
        dueDate: daysAgo(10),
        totalAmount: 12000000,
        paidAmount: 12000000,
        status: 'paid',
        description: 'سیمان برای ستون‌های طبقه اول و دوم',
        items: {
          create: [
            { materialName: 'سیمان تیپ ۲', quantity: 100, unit: 'تن', unitPrice: 120000, totalPrice: 12000000 },
          ],
        },
      },
    });

    // Purchase 8: Due in 14 days (safe)
    const p8 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-008',
        projectId: projects[2].id, // مجتمع تجاری
        supplierId: suppliers[2].id, // شن و ماسه پارس
        purchaseDate: daysAgo(2),
        dueDate: daysFromNow(14),
        totalAmount: 9500000,
        paidAmount: 0,
        status: 'pending',
        description: 'شن بادی و ماسه بادی برای ملات',
        items: {
          create: [
            { materialName: 'شن بادی', quantity: 60, unit: 'تن', unitPrice: 75000, totalPrice: 4500000 },
            { materialName: 'ماسه بادی', quantity: 50, unit: 'تن', unitPrice: 65000, totalPrice: 3250000 },
            { materialName: 'خاک رس', quantity: 20, unit: 'تن', unitPrice: 87500, totalPrice: 1750000 },
          ],
        },
      },
    });

    // Purchase 9: Overdue (10 days ago) — large debt
    const p9 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-009',
        projectId: projects[3].id, // بیمارستان
        supplierId: suppliers[0].id, // آهن‌فروشی مرکزی
        purchaseDate: daysAgo(30),
        dueDate: daysAgo(10),
        totalAmount: 78000000,
        paidAmount: 20000000,
        status: 'overdue',
        description: 'آهن‌آلات اسکلت فلزی بیمارستان',
        items: {
          create: [
            { materialName: 'میلگرد آجدار ۲۸', quantity: 3000, unit: 'کیلوگرم', unitPrice: 16000, totalPrice: 48000000 },
            { materialName: 'ورق سیاه ۱۰ میل', quantity: 1000, unit: 'کیلوگرم', unitPrice: 18000, totalPrice: 18000000 },
            { materialName: 'قوطی ۱۶', quantity: 600, unit: 'کیلوگرم', unitPrice: 20000, totalPrice: 12000000 },
          ],
        },
      },
    });

    // Purchase 10: Due in 3 days
    const p10 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-010',
        projectId: projects[1].id, // ویلای لواسان
        supplierId: suppliers[3].id, // عایق‌کاری نوین
        purchaseDate: daysAgo(4),
        dueDate: daysFromNow(3),
        totalAmount: 8000000,
        paidAmount: 0,
        status: 'pending',
        description: 'عایق صوتی برای دیوارهای داخلی ویلا',
        items: {
          create: [
            { materialName: 'عایق فوم آکوستیک', quantity: 150, unit: 'مترمربع', unitPrice: 40000, totalPrice: 6000000 },
            { materialName: 'ژئوممبران', quantity: 100, unit: 'مترمربع', unitPrice: 20000, totalPrice: 2000000 },
          ],
        },
      },
    });

    // Purchase 11: Another overdue
    const p11 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-011',
        projectId: projects[2].id, // مجتمع تجاری
        supplierId: suppliers[4].id, // آجر و بلوک بهشتی
        purchaseDate: daysAgo(25),
        dueDate: daysAgo(7),
        totalAmount: 22000000,
        paidAmount: 5000000,
        status: 'overdue',
        description: 'بلوک سیمانی و آجر فرش برای مجتمع',
        items: {
          create: [
            { materialName: 'بلوک سیمانی ۱۵', quantity: 3000, unit: 'عدد', unitPrice: 3500, totalPrice: 10500000 },
            { materialName: 'آجر فرش', quantity: 5000, unit: 'عدد', unitPrice: 2300, totalPrice: 11500000 },
          ],
        },
      },
    });

    // Purchase 12: Due in 25 days
    const p12 = await db.purchase.create({
      data: {
        invoiceNumber: 'INV-1404-012',
        projectId: projects[0].id, // برج الهیه
        supplierId: suppliers[4].id, // آجر و بلوک بهشتی
        purchaseDate: daysAgo(1),
        dueDate: daysFromNow(25),
        totalAmount: 16000000,
        paidAmount: 0,
        status: 'pending',
        description: 'آجر نما و بلوک برای دیوارچینی طبقه چهارم',
        items: {
          create: [
            { materialName: 'آجر نما ماشینی', quantity: 4000, unit: 'عدد', unitPrice: 2200, totalPrice: 8800000 },
            { materialName: 'بلوک سیمانی ۲۰', quantity: 1800, unit: 'عدد', unitPrice: 4000, totalPrice: 7200000 },
          ],
        },
      },
    });

    // ─── Create Payments ───
    // Payment 1: Full payment for purchase 7 (already paid)
    await db.payment.create({
      data: {
        purchaseId: p7.id,
        amount: 12000000,
        paymentDate: daysAgo(12),
        note: 'پرداخت کامل فاکتور سیمان طبقه اول',
      },
    });

    // Payment 2: Partial payment for purchase 2
    await db.payment.create({
      data: {
        purchaseId: p2.id,
        amount: 10000000,
        paymentDate: daysAgo(5),
        note: 'پیش‌پرداخت سیمان فونداسیون ویلا',
      },
    });

    // Payment 3: Partial payment for purchase 9
    await db.payment.create({
      data: {
        purchaseId: p9.id,
        amount: 20000000,
        paymentDate: daysAgo(15),
        note: 'پیش‌پرداخت آهن‌آلات بیمارستان',
      },
    });

    // Payment 4: Partial payment for purchase 11
    await db.payment.create({
      data: {
        purchaseId: p11.id,
        amount: 5000000,
        paymentDate: daysAgo(8),
        note: 'بخشی از بدهی بلوک و آجر مجتمع',
      },
    });

    // ─── Create Delivery Confirmations ───
    await db.deliveryConfirmation.create({
      data: {
        purchaseId: p7.id,
        projectId: projects[0].id,
        deliveryDate: daysAgo(28),
        confirmedBy: 'احمد توکلی',
        notes: 'تحویل در محل پروژه برج الهیه - طبقه اول و دوم',
      },
    });

    await db.deliveryConfirmation.create({
      data: {
        purchaseId: p2.id,
        projectId: projects[1].id,
        deliveryDate: daysAgo(13),
        confirmedBy: 'حسن نوری',
        notes: 'تحویل در کارگاه ویلا - انبار سیمان',
      },
    });

    // ─── Create Workflow Configs ───
    // برج الهیه: ۳ مرحله
    await db.workflowConfig.createMany({
      data: [
        { projectId: projects[0].id, stepOrder: 1, stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
        { projectId: projects[0].id, stepOrder: 2, stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
        { projectId: projects[0].id, stepOrder: 3, stepName: 'تایید انباردار', requiredRole: 'WAREHOUSE_KEEPER', isRequired: false },
      ],
    });
    // ویلای لواسان: ۲ مرحله
    await db.workflowConfig.createMany({
      data: [
        { projectId: projects[1].id, stepOrder: 1, stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
        { projectId: projects[1].id, stepOrder: 2, stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      ],
    });
    // مجتمع تجاری: ۲ مرحله
    await db.workflowConfig.createMany({
      data: [
        { projectId: projects[2].id, stepOrder: 1, stepName: 'بررسی خرید', requiredRole: 'PURCHASER', isRequired: true },
        { projectId: projects[2].id, stepOrder: 2, stepName: 'تایید نهایی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      ],
    });
    // بیمارستان: ۴ مرحله
    await db.workflowConfig.createMany({
      data: [
        { projectId: projects[3].id, stepOrder: 1, stepName: 'بررسی خرید', requiredRole: 'PURCHASER', isRequired: true },
        { projectId: projects[3].id, stepOrder: 2, stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
        { projectId: projects[3].id, stepOrder: 3, stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
        { projectId: projects[3].id, stepOrder: 4, stepName: 'تایید انباردار', requiredRole: 'WAREHOUSE_KEEPER', isRequired: true },
      ],
    });

    // ─── User-Project Access (ABAC) ───
    // مدیر پروژه به پروژه ۱ و ۲ دسترسی دارد
    await db.userProject.createMany({
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

    // ─── Create Notifications ───
    await db.notification.createMany({
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

    // ─── Create Material Categories ───
    const categories = await Promise.all([
      db.materialCategory.create({ data: { name: 'آهن‌آلات', description: 'میلگرد، تیرآهن، ورق و نبشی' } }),
      db.materialCategory.create({ data: { name: 'سیمان', description: 'سیمان تیپ ۲ و تیپ ۵' } }),
      db.materialCategory.create({ data: { name: 'شن و ماسه', description: 'شن شسته، ماسه، نخود سنگی' } }),
      db.materialCategory.create({ data: { name: 'عایق', description: 'عایق حرارتی، رطوبتی و صوتی' } }),
      db.materialCategory.create({ data: { name: 'آجر و بلوک', description: 'آجر نما، آجر فرش، بلوک سیمانی' } }),
      db.materialCategory.create({ data: { name: 'شیمیایی', description: 'رنگ، رزین، چسب ساختمانی' } }),
    ]);

    // ─── Create Materials ───
    const materials = await Promise.all([
      db.material.create({ data: { name: 'میلگرد ساده ۱۶', code: 'MAT-001', categoryId: categories[0].id, unit: 'KILOGRAM', minStock: 500 } }),
      db.material.create({ data: { name: 'میلگرد آجدار ۲۰', code: 'MAT-002', categoryId: categories[0].id, unit: 'KILOGRAM', minStock: 300 } }),
      db.material.create({ data: { name: 'میلگرد آجدار ۲۵', code: 'MAT-003', categoryId: categories[0].id, unit: 'KILOGRAM', minStock: 200 } }),
      db.material.create({ data: { name: 'تیرآهن INP ۱۴', code: 'MAT-004', categoryId: categories[0].id, unit: 'KILOGRAM', minStock: 100 } }),
      db.material.create({ data: { name: 'ورق سیاه ۶ میل', code: 'MAT-005', categoryId: categories[0].id, unit: 'KILOGRAM', minStock: 500 } }),
      db.material.create({ data: { name: 'نبشی ۵۰', code: 'MAT-006', categoryId: categories[0].id, unit: 'KILOGRAM', minStock: 200 } }),
      db.material.create({ data: { name: 'سیمان تیپ ۲', code: 'MAT-007', categoryId: categories[1].id, unit: 'TON', minStock: 50 } }),
      db.material.create({ data: { name: 'سیمان تیپ ۵', code: 'MAT-008', categoryId: categories[1].id, unit: 'TON', minStock: 20 } }),
      db.material.create({ data: { name: 'شن شسته', code: 'MAT-009', categoryId: categories[2].id, unit: 'TON', minStock: 100 } }),
      db.material.create({ data: { name: 'ماسه شسته', code: 'MAT-010', categoryId: categories[2].id, unit: 'TON', minStock: 80 } }),
      db.material.create({ data: { name: 'عایق پشم سنگ', code: 'MAT-011', categoryId: categories[3].id, unit: 'SQUARE_METER', minStock: 200 } }),
      db.material.create({ data: { name: 'عایق فوم پلی‌اتیلن', code: 'MAT-012', categoryId: categories[3].id, unit: 'SQUARE_METER', minStock: 100 } }),
      db.material.create({ data: { name: 'آجر نما هفت‌رنگ', code: 'MAT-013', categoryId: categories[4].id, unit: 'NUMBER', minStock: 5000 } }),
      db.material.create({ data: { name: 'بلوک سیمانی ۲۰', code: 'MAT-014', categoryId: categories[4].id, unit: 'NUMBER', minStock: 3000 } }),
    ]);

    // ─── Create Warehouse Transactions ───
    await db.transaction.createMany({
      data: [
        { type: 'PURCHASE', materialId: materials[0].id, projectId: projects[0].id, supplierId: suppliers[0].id, purchaseId: p1.id, quantity: 2000, unitPrice: 12000, totalPrice: 24000000, date: daysAgo(20), userId: users[2].id, warehouseConfirmed: true },
        { type: 'PURCHASE', materialId: materials[6].id, projectId: projects[0].id, supplierId: suppliers[1].id, purchaseId: p7.id, quantity: 100, unitPrice: 120000, totalPrice: 12000000, date: daysAgo(30), userId: users[2].id, warehouseConfirmed: true },
        { type: 'DELIVERY', materialId: materials[6].id, projectId: projects[0].id, quantity: 80, unitPrice: 120000, totalPrice: 9600000, deliveryPerson: 'محمد رضایی', receivedBy: 'علی حسینی', date: daysAgo(28), userId: users[3].id, warehouseConfirmed: true, actualQuantity: 78, discrepancy: '۲ تن کمتر از فاکتور' },
        { type: 'CONSUMPTION', materialId: materials[6].id, projectId: projects[0].id, quantity: 40, unitPrice: 120000, totalPrice: 4800000, date: daysAgo(15), userId: users[3].id, warehouseConfirmed: true },
        { type: 'PURCHASE', materialId: materials[8].id, projectId: projects[0].id, supplierId: suppliers[2].id, purchaseId: p3.id, quantity: 100, unitPrice: 80000, totalPrice: 8000000, date: daysAgo(10), userId: users[2].id, warehouseConfirmed: false },
        { type: 'RETURN', materialId: materials[0].id, projectId: projects[0].id, quantity: 50, unitPrice: 12000, totalPrice: 600000, description: 'میلگرد معیوب — مرجوعی', date: daysAgo(5), userId: users[3].id, warehouseConfirmed: true },
        { type: 'ADJUSTMENT', materialId: materials[6].id, projectId: projects[0].id, quantity: -5, unitPrice: 0, totalPrice: 0, description: 'تعدیل موجودی — فسخ جزئی', date: daysAgo(3), userId: users[3].id, warehouseConfirmed: true },
      ],
    });

    // ─── Create System Alerts ───
    await db.alert.createMany({
      data: [
        { title: 'سررسید گذشته', message: 'فاکتور INV-1404-001 آهن‌فروشی مرکزی ۵ روز از سررسید گذشته', type: 'danger', category: 'due_date', triggerDate: daysAgo(5), projectId: projects[0].id, purchaseId: p1.id, userId: users[0].id },
        { title: 'سررسید امروز', message: 'فاکتور INV-1404-003 شن و ماسه پارس امروز سررسید است', type: 'warning', category: 'due_date', triggerDate: today, projectId: projects[0].id, purchaseId: p3.id, userId: users[0].id },
        { title: 'موجودی کم', message: 'موجودی سیمان تیپ ۲ به حداقل رسیده', type: 'warning', category: 'low_stock', triggerDate: today },
        { title: 'پرداخت معوقه', message: 'بدهی بیمارستان ولیعصر به آهن‌فروشی مرکزی ۵۸ میلیون ریال', type: 'danger', category: 'payment', triggerDate: daysAgo(10), projectId: projects[3].id, purchaseId: p9.id, userId: users[0].id },
      ],
    });

    // ─── Create System Settings ───
    await db.systemSetting.createMany({
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

    // ─── Create Custom Fields (Dynamic Settings Engine) ───
    await db.customField.createMany({
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

    return NextResponse.json({
      message: 'دیتابیس با موفقیت با داده‌های تست پر شد',
      stats: {
        roles: roles.length,
        users: users.length,
        projects: projects.length,
        suppliers: suppliers.length,
        materials: materials.length,
        categories: categories.length,
        purchases: 12,
        payments: 4,
        deliveries: 2,
        transactions: 7,
        alerts: 4,
        workflows: 11,
        notifications: 7,
        customFields: 8,
        settings: 8,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('Seed API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
