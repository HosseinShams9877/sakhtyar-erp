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
export async function POST(req: NextRequest) {
  const auth = await requirePermission('users:create');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { name, nationalCode, mobile, email, phone, roleId, projectIds } = body;

    console.log('📥 [POST] Received roleId:', roleId);
    console.log('📥 [POST] Received projectIds:', projectIds);

    if (!name || !nationalCode || !mobile) {
      return NextResponse.json({ error: 'نام، کد ملی و شماره موبایل الزامی است' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(nationalCode)) {
      return NextResponse.json({ error: 'کد ملی باید ۱۰ رقم باشد' }, { status: 400 });
    }

    if (!/^09\d{9}$/.test(mobile)) {
      return NextResponse.json({ error: 'شماره موبایل نامعتبر است (مثال: 09121234567)' }, { status: 400 });
    }

    const existingNc = await db.user.findUnique({ where: { nationalCode } });
    if (existingNc) {
      return NextResponse.json({ error: 'کاربری با این کد ملی قبلاً ثبت شده' }, { status: 409 });
    }

    // پیدا کردن نقش بر اساس name
    let finalRoleId: string | undefined = undefined;
    if (roleId) {
      const role = await db.role.findUnique({ where: { name: roleId } });
      if (role) {
        finalRoleId = role.id ?? undefined;
        console.log(`✅ Role found: ${roleId} -> ${finalRoleId}`);
      } else {
        console.warn(`⚠️ Role not found with name: ${roleId}`);
        // اگر نقش پیدا نشد، یک نقش پیش‌فرض بگیر
        const defaultRole = await db.role.findUnique({ where: { name: 'WAREHOUSE_KEEPER' } });
        if (defaultRole) {
          finalRoleId = defaultRole.id;
          console.log(`⚠️ Using default role: WAREHOUSE_KEEPER -> ${finalRoleId}`);
        }
      }
    }

    // اگر roleId وجود نداشت، نقش پیش‌فرض بده
    if (!finalRoleId) {
      const defaultRole = await db.role.findUnique({ where: { name: 'WAREHOUSE_KEEPER' } });
      if (defaultRole) {
        finalRoleId = defaultRole.id;
      }
    }

    const hashedPassword = await hashPassword(mobile);

    const user = await db.user.create({
      data: {
        name,
        nationalCode,
        mobile,
        email: email || null,
        password: hashedPassword,
        phone: phone || null,
        roleId: finalRoleId!
      },
      select: {
        id: true, name: true, nationalCode: true, mobile: true, email: true, phone: true, avatar: true,
        isActive: true, createdAt: true,
        role: { select: { name: true, label: true } },
      },
    });

    console.log(`✅ User created with id: ${user.id}, roleId: ${finalRoleId}`);

    // اضافه کردن دسترسی پروژه‌ها در هر دو جدول
    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
      console.log(`📋 Adding ${projectIds.length} projects to user`);
      
      for (const pid of projectIds) {
        // 1. اضافه کردن به ProjectMember (برای سایدبار و هدر) - بدون شرط
        await db.projectMember.create({
          data: {
            userId: user.id,
            projectId: pid,
            roleId: finalRoleId!,  
          },
        });
        console.log(`✅ ProjectMember: user ${user.id} -> project ${pid}`);
        
        // 2. اضافه کردن به UserProject (برای سازگاری)
        await db.userProject.create({
          data: {
            userId: user.id,
            projectId: pid,
            role: 'viewer',
          },
        });
        console.log(`✅ UserProject: user ${user.id} -> project ${pid}`);
      }
    }

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
export async function PUT(req: NextRequest) {
  const auth = await requirePermission('users:edit');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    let { id, name, nationalCode, mobile, email, phone, roleId, isActive, projectIds } = body;

    console.log('📥 [PUT] roleId from frontend:', roleId);

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

    // پیدا کردن نقش (roleId می‌تواند id واقعی یا name باشد)
    let finalRoleId: string | undefined = undefined;
    if (roleId) {
      // ابتدا سعی کن با id پیدا کنی
      let role = await db.role.findUnique({ where: { id: roleId } });
      
      // اگر با id پیدا نشد، سعی کن با name پیدا کنی
      if (!role) {
        role = await db.role.findUnique({ where: { name: roleId } });
      }
      
      // اگر باز هم پیدا نشد، نقش پیش‌فرض بگیر
      if (!role) {
        const defaultRole = await db.role.findUnique({ where: { name: 'WAREHOUSE_KEEPER' } });
        role = defaultRole;
      }
      
      if (role) {
        finalRoleId = role.id ?? undefined;
        console.log(`✅ Role found: ${roleId} -> ${finalRoleId}`);
      }
    }

    // اگر roleId وجود نداشت، نقش موجود کاربر را حفظ کن
    if (!finalRoleId && existing.roleId) {
      finalRoleId = existing.roleId;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (finalRoleId !== null) updateData.roleId = finalRoleId;
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
      updateData.password = await hashPassword(mobile);
    }

    console.log('📥 [PUT] updateData before save:', { ...updateData, password: '***' });
    console.log('📥 [PUT] finalRoleId being set:', finalRoleId);

    // به‌روزرسانی کاربر
    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, nationalCode: true, mobile: true, email: true, phone: true, avatar: true,
        isActive: true, createdAt: true,
        role: { select: { name: true, label: true } },
      },
    });

    console.log('📥 [PUT] User updated, new roleId:', user.roleId);
    console.log('📥 [PUT] User role:', user.role);

    // به‌روزرسانی دسترسی پروژه‌ها در هر دو جدول
    if (projectIds !== undefined) {
      await db.projectMember.deleteMany({ where: { userId: id } });
      await db.userProject.deleteMany({ where: { userId: id } });
      
      if (projectIds.length > 0 && finalRoleId) {
        for (const pid of projectIds) {
          await db.projectMember.create({
            data: {
              userId: id,
              projectId: pid,
              roleId: finalRoleId!
            },
          });
          await db.userProject.create({
            data: {
              userId: id,
              projectId: pid,
              role: 'viewer',
            },
          });
        }
      }
    }

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
