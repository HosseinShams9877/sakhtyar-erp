import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/roles — لیست نقش‌ها با مجوزهایشان
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const roles = await db.role.findMany({
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { priority: 'asc' },
    });

    return NextResponse.json({ roles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/roles — ایجاد نقش جدید
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { name, label, description, color, permissions } = body;

    if (!name || !label) {
      return NextResponse.json({ error: 'نام و عنوان نقش الزامی است' }, { status: 400 });
    }

    const existing = await db.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'نقش با این نام قبلاً ثبت شده' }, { status: 409 });
    }

    const role = await db.role.create({
      data: {
        name,
        label,
        description: description || null,
        color: color || '#7c3aed',
        isSystem: false,
        permissions: permissions ? {
          create: permissions.map((p: any) => ({
            resource: p.resource,
            action: p.action,
            scope: p.scope || 'all',
          })),
        } : undefined,
      },
      include: { permissions: true },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/roles — ویرایش نقش و مجوزهایش
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { id, label, description, color, permissions } = body;

    if (!id) {
      return NextResponse.json({ error: 'شناسه نقش الزامی است' }, { status: 400 });
    }

    const existing = await db.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'نقش یافت نشد' }, { status: 404 });
    }

    // به‌روزرسانی نقش
    await db.role.update({
      where: { id },
      data: {
        label: label || undefined,
        description: description || undefined,
        color: color || undefined,
      },
    });

    // به‌روزرسانی مجوزها — حذف قبلی و ایجاد جدید
    if (permissions) {
      await db.rolePermission.deleteMany({ where: { roleId: id } });
      await db.rolePermission.createMany({
        data: permissions.map((p: any) => ({
          roleId: id,
          resource: p.resource,
          action: p.action,
          scope: p.scope || 'all',
        })),
      });
    }

    const role = await db.role.findUnique({
      where: { id },
      include: { permissions: true },
    });

    return NextResponse.json({ role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/roles — حذف نقش (غیرسیستمی)
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'شناسه نقش الزامی است' }, { status: 400 });
    }

    const existing = await db.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'نقش یافت نشد' }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'نقش‌های سیستمی قابل حذف نیستند' }, { status: 403 });
    }

    await db.role.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
