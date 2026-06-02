// ═══════════════════════════════════════════════════════════════════════
// ساخت‌یار — API پروژه‌های کاربر
// بازگرداندن لیست پروژه‌ها و نقش کاربر در پروژه فعال
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const globalRole = (session.user as any).role as string;
    const projectId = request.nextUrl.searchParams.get('projectId');

    // مدیر کل و ادمین به همه پروژه‌ها دسترسی دارند
    const isGlobalAdmin = globalRole === 'SUPER_MANAGER' || globalRole === 'ADMIN';

    // دریافت پروژه پیش‌فرض کاربر
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { defaultProjectId: true },
    });

    // دریافت لیست پروژه‌ها
    let projects;
    if (isGlobalAdmin) {
      // مدیر کل: همه پروژه‌ها
      projects = await db.project.findMany({
        where: { status: { in: ['active', 'completed'] } },
        select: { id: true, name: true, code: true, status: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // کاربر عادی: فقط پروژه‌های عضو
      const memberships = await db.projectMember.findMany({
        where: { userId },
        include: {
          project: {
            select: { id: true, name: true, code: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // همچنین بررسی UserProject برای سازگاری
      const userProjects = await db.userProject.findMany({
        where: { userId },
        include: {
          project: {
            select: { id: true, name: true, code: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // ادغام هر دو منبع (بدون تکرار)
      const projectMap = new Map<string, { id: string; name: string; code: string; status: string }>();

      for (const m of memberships) {
        if (m.project.status === 'active' || m.project.status === 'completed') {
          projectMap.set(m.project.id, m.project);
        }
      }
      for (const up of userProjects) {
        if (up.project.status === 'active' || up.project.status === 'completed') {
          projectMap.set(up.project.id, up.project);
        }
      }

      projects = Array.from(projectMap.values());
    }

    // اگر projectId مشخص شده، نقش کاربر در آن پروژه را برگردان
    let projectRole: { roleName: string; roleLabel: string } | null = null;
    if (projectId) {
      // اول از ProjectMember بگرد
      const membership = await db.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
        include: {
          role: { select: { name: true, label: true } },
        },
      });

      if (membership) {
        projectRole = {
          roleName: membership.role.name,
          roleLabel: membership.role.label,
        };
      } else {
        // سازگاری: از UserProject بگرد
        const userProject = await db.userProject.findUnique({
          where: { userId_projectId: { userId, projectId } },
        });

        if (userProject) {
          // مپ کردن نقش ساده به نقش سیستمی
          const roleMapping: Record<string, { name: string; label: string }> = {
            owner: { name: 'PROJECT_MANAGER', label: 'مدیر پروژه' },
            manager: { name: 'PROJECT_MANAGER', label: 'مدیر پروژه' },
            viewer: { name: 'WAREHOUSE_KEEPER', label: 'انباردار' },
          };
          const mapped = roleMapping[userProject.role] || { name: globalRole, label: '' };
          projectRole = {
            roleName: mapped.name,
            roleLabel: mapped.label,
          };
        }
      }
    }

    return NextResponse.json({
      projects,
      defaultProjectId: user?.defaultProjectId || null,
      projectRole,
      globalRole,
    });
  } catch (error) {
    console.error('خطا در دریافت پروژه‌ها:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
