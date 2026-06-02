// ═══════════════════════════════════════════════════════════════════════
// ساخت‌یار — API مدیریت اعضای پروژه (ProjectMember)
// ثبت، ویرایش و حذف عضویت کاربران در پروژه‌ها با نقش مشخص
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// ─── GET: لیست اعضای یک پروژه ───
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'شناسه پروژه الزامی است' }, { status: 400 });
    }

    const members = await db.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, nationalCode: true, mobile: true } },
        role: { select: { id: true, name: true, label: true, color: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('خطا در دریافت اعضای پروژه:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// ─── POST: افزودن عضو به پروژه ───
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const globalRole = (session.user as any).role as string;
    if (globalRole !== 'SUPER_MANAGER' && globalRole !== 'ADMIN' && globalRole !== 'PROJECT_MANAGER') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, projectId, roleId } = body;

    if (!userId || !projectId || !roleId) {
      return NextResponse.json({ error: 'فیلدهای الزامی: userId, projectId, roleId' }, { status: 400 });
    }

    // بررسی عدم وجود عضویت قبلی
    const existing = await db.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (existing) {
      // بروزرسانی نقش
      const updated = await db.projectMember.update({
        where: { id: existing.id },
        data: { roleId },
        include: {
          user: { select: { id: true, name: true } },
          role: { select: { name: true, label: true } },
        },
      });

      // ثبت در AuditLog
      await db.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'UPDATE',
          entity: 'ProjectMember',
          entityId: updated.id,
          projectId,
          details: JSON.stringify({ userId, projectId, roleId }),
        },
      });

      return NextResponse.json({ member: updated, message: 'نقش کاربر بروزرسانی شد' });
    }

    // ایجاد عضویت جدید
    const member = await db.projectMember.create({
      data: { userId, projectId, roleId },
      include: {
        user: { select: { id: true, name: true } },
        role: { select: { name: true, label: true } },
      },
    });

    // همچنین به UserProject قدیمی اضافه کن (سازگاری)
    const roleName = member.role?.name || 'viewer';
    const simpleRole = roleName === 'PROJECT_MANAGER' ? 'manager' :
                       roleName === 'SUPER_MANAGER' ? 'owner' : 'viewer';

    await db.userProject.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { role: simpleRole },
      create: { userId, projectId, role: simpleRole },
    });

    // ثبت در AuditLog
    await db.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'CREATE',
        entity: 'ProjectMember',
        entityId: member.id,
        projectId,
        details: JSON.stringify({ userId, projectId, roleId }),
      },
    });

    return NextResponse.json({ member, message: 'عضو با موفقیت به پروژه اضافه شد' }, { status: 201 });
  } catch (error) {
    console.error('خطا در افزودن عضو:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// ─── DELETE: حذف عضو از پروژه ───
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const globalRole = (session.user as any).role as string;
    if (globalRole !== 'SUPER_MANAGER' && globalRole !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'شناسه عضویت الزامی است' }, { status: 400 });
    }

    const member = await db.projectMember.delete({
      where: { id },
    });

    // ثبت در AuditLog
    await db.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'DELETE',
        entity: 'ProjectMember',
        entityId: id,
        projectId: member.projectId,
        details: JSON.stringify({ userId: member.userId, projectId: member.projectId }),
      },
    });

    return NextResponse.json({ message: 'عضو از پروژه حذف شد' });
  } catch (error) {
    console.error('خطا در حذف عضو:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
