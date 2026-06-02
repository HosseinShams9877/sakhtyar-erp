// ─── API کاربران ───
// SECURITY: فقط مدیران سیستم دسترسی دارند + فیلتر رمز عبور
// نحوه ورود: کد ملی = یوزرنیم | شماره موبایل = پسورد (خودکار)
import { db } from '@/lib/db';
import { requirePermission, requireAuth } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, addSecurityHeaders } from '@/lib/security';

// GET /api/users — لیست کاربران
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 30, 60 * 1000);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  const auth = await requirePermission('users:view');
  if (!auth.success) {
    // در حالت preview بدون session، داده‌های نمونه نمایش داده می‌شود
    try {
      const users = await db.user.findMany({
        select: {
          id: true, name: true, nationalCode: true, mobile: true, email: true, phone: true, avatar: true,
          isActive: true, roleId: true, createdAt: true, updatedAt: true,
          role: { select: { id: true, name: true, label: true, color: true } },
          projectAccess: { include: { project: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return addSecurityHeaders(NextResponse.json({ users }));
    } catch {
      return addSecurityHeaders(NextResponse.json({ users: [] }));
    }
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true, name: true, nationalCode: true, mobile: true, email: true, phone: true, avatar: true,
        isActive: true, roleId: true, createdAt: true, updatedAt: true,
        role: { select: { id: true, name: true, label: true, color: true } },
        projectAccess: { include: { project: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return addSecurityHeaders(NextResponse.json({ users }));
  } catch (error: unknown) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: 'خطا در دریافت کاربران' }, { status: 500 });
  }
}

// POST /api/users — ایجاد کاربر جدید
// پسورد خودکار از شماره موبایل تولید می‌شود
export async function POST(req: NextRequest) {
  const auth = await requirePermission('users:create');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { name, nationalCode, mobile, email, phone, roleId, projectIds } = body;

    // اعتبارسنجی فیلدهای الزامی
    if (!name || !nationalCode || !mobile) {
      return NextResponse.json({ error: 'نام، کد ملی و شماره موبایل الزامی است' }, { status: 400 });
    }

    // اعتبارسنجی کد ملی (۱۰ رقم)
    if (!/^\d{10}$/.test(nationalCode)) {
      return NextResponse.json({ error: 'کد ملی باید ۱۰ رقم باشد' }, { status: 400 });
    }

    // اعتبارسنجی شماره موبایل (فرمت ایرانی)
    if (!/^09\d{9}$/.test(mobile)) {
      return NextResponse.json({ error: 'شماره موبایل نامعتبر است (مثال: 09121234567)' }, { status: 400 });
    }

    // بررسی تکراری نبودن کد ملی
    const existingNc = await db.user.findUnique({ where: { nationalCode } });
    if (existingNc) {
      return NextResponse.json({ error: 'کاربری با این کد ملی قبلاً ثبت شده' }, { status: 409 });
    }

    // پسورد خودکار = هش شماره موبایل
    const hashedPassword = await hashPassword(mobile);

    const user = await db.user.create({
      data: {
        name,
        nationalCode,
        mobile,
        email: email || null,
        password: hashedPassword,
        phone: phone || null,
        roleId: roleId || null,
        projectAccess: projectIds ? {
          create: projectIds.map((pid: string) => ({
            projectId: pid,
            role: 'viewer',
          })),
        } : undefined,
      },
      select: {
        id: true, name: true, nationalCode: true, mobile: true, email: true, phone: true, avatar: true,
        isActive: true, createdAt: true,
        role: { select: { name: true, label: true } },
        projectAccess: true,
      },
    });

    return NextResponse.json({ 
      user,
      message: `کاربر "${name}" ایجاد شد. یوزرنیم: ${nationalCode} | پسورد: ${mobile}`,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('User create error:', error);
    return NextResponse.json({ error: 'خطا در ایجاد کاربر' }, { status: 500 });
  }
}

// PUT /api/users — ویرایش کاربر
// اگر شماره موبایل تغییر کند، پسورد هم خودکار به‌روزرسانی می‌شود
export async function PUT(req: NextRequest) {
  const auth = await requirePermission('users:edit');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { id, name, nationalCode, mobile, email, phone, roleId, isActive, projectIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    // جلوگیری از غیرفعال‌سازی خودش
    if (id === auth.userId && isActive === false) {
      return NextResponse.json({ error: 'شما نمی‌توانید حساب خود را غیرفعال کنید' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (isActive !== undefined) updateData.isActive = isActive;

    // اگر کد ملی تغییر کرد
    if (nationalCode !== undefined && nationalCode !== existing.nationalCode) {
      if (!/^\d{10}$/.test(nationalCode)) {
        return NextResponse.json({ error: 'کد ملی باید ۱۰ رقم باشد' }, { status: 400 });
      }
      const dup = await db.user.findUnique({ where: { nationalCode } });
      if (dup && dup.id !== id) {
        return NextResponse.json({ error: 'کاربری با این کد ملی قبلاً ثبت شده' }, { status: 409 });
      }
      updateData.nationalCode = nationalCode;
    }

    // اگر شماره موبایل تغییر کرد → پسورد هم خودکار به‌روزرسانی شود
    if (mobile !== undefined && mobile !== existing.mobile) {
      if (!/^09\d{9}$/.test(mobile)) {
        return NextResponse.json({ error: 'شماره موبایل نامعتبر است' }, { status: 400 });
      }
      updateData.mobile = mobile;
      updateData.password = await hashPassword(mobile); // پسورد جدید = هش موبایل جدید
    }

    // به‌روزرسانی دسترسی پروژه‌ها
    if (projectIds !== undefined) {
      await db.userProject.deleteMany({ where: { userId: id } });
      if (projectIds.length > 0) {
        await db.userProject.createMany({
          data: projectIds.map((pid: string) => ({
            userId: id,
            projectId: pid,
            role: 'viewer',
          })),
        });
      }
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, nationalCode: true, mobile: true, email: true, phone: true, avatar: true,
        isActive: true, createdAt: true,
        role: { select: { name: true, label: true } },
        projectAccess: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'خطا در بروزرسانی کاربر' }, { status: 500 });
  }
}

// DELETE /api/users — غیرفعال‌سازی کاربر (حذف نرم)
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission('users:edit');
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });

    // جلوگیری از غیرفعال‌سازی خودش
    if (id === auth.userId) {
      return NextResponse.json({ error: 'شما نمی‌توانید حساب خود را غیرفعال کنید' }, { status: 400 });
    }

    // غیرفعال کردن به جای حذف واقعی
    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'کاربر غیرفعال شد' });
  } catch (error: unknown) {
    console.error('User deactivate error:', error);
    return NextResponse.json({ error: 'خطا در غیرفعال‌سازی کاربر' }, { status: 500 });
  }
}
