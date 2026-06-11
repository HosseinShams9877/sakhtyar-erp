import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/projects — List all projects with computed total debt


export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    /*
    const allowedRoles = ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'شما دسترسی به این بخش ندارید' }, { status: 403 });
    }
    */

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';

    const where: Record<string, string> = {};
  
    if (status && status !== 'all') {
      where.status = status;
    }

    // 👈 همه نقش‌ها همه پروژه‌ها رو می‌بینن (برای تست)
    const projects = await db.project.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        purchases: {
          select: {
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = projects.map((project) => {
      const totalDebt = project.purchases
        .filter((p) => p.status !== 'paid')
        .reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);
      const { purchases, ...rest } = project;
      return { ...rest, totalDebt: Math.round(totalDebt * 100) / 100 };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('Error in projects API:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// POST /api/projects — Create project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, location, status, budget, startDate, endDate, description, managerId, purchaseResponsibleId, warehouseKeeperId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'نام پروژه الزامی است' },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'کد پروژه الزامی است' },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        name,
        code,
        location: location || '',
        status: status ? status.toLowerCase() : 'active',
        budget: budget || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
        managerId: managerId || null,
        purchaseResponsibleId: purchaseResponsibleId || null,
        warehouseKeeperId: warehouseKeeperId || null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('Error in POST project:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/projects — Update project
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, code, location, status, budget, startDate, endDate, description, managerId, purchaseResponsibleId, warehouseKeeperId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه پروژه الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'پروژه یافت نشد' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status.toLowerCase();
    if (budget !== undefined) updateData.budget = budget;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (description !== undefined) updateData.description = description || null;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (purchaseResponsibleId !== undefined) updateData.purchaseResponsibleId = purchaseResponsibleId || null;
    if (warehouseKeeperId !== undefined) updateData.warehouseKeeperId = warehouseKeeperId || null;

    const project = await db.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(project);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    console.error('Error in PUT project:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// DELETE /api/projects — Delete project
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه پروژه الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'پروژه یافت نشد' },
        { status: 404 }
      );
    }

    await db.project.delete({ where: { id } });

    return NextResponse.json({ message: 'پروژه با موفقیت حذف شد' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
