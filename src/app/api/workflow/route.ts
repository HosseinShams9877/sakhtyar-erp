import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/workflow — دریافت تنظیمات ورک‌فلو پروژه
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    if (projectId) {
      const steps = await db.workflowConfig.findMany({
        where: { projectId },
        orderBy: { stepOrder: 'asc' },
      });
      return NextResponse.json({ steps });
    }

    // همه ورک‌فلوها
    const configs = await db.workflowConfig.findMany({
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ projectId: 'asc' }, { stepOrder: 'asc' }],
    });
    return NextResponse.json({ configs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/workflow — ایجاد مرحله ورک‌فلو
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { projectId, stepOrder, stepName, requiredRole, isRequired } = body;

    if (!projectId || !stepName || !requiredRole) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }

    const step = await db.workflowConfig.create({
      data: {
        projectId,
        stepOrder: stepOrder || 1,
        stepName,
        requiredRole,
        isRequired: isRequired !== false,
      },
    });

    return NextResponse.json({ step }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/workflow — ویرایش ورک‌فلو
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { projectId, steps } = body;

    if (!projectId || !steps) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }

    // حذف مراحل قبلی و ایجاد جدید
    await db.workflowConfig.deleteMany({ where: { projectId } });
    await db.workflowConfig.createMany({
      data: steps.map((s: any, idx: number) => ({
        projectId,
        stepOrder: idx + 1,
        stepName: s.stepName,
        requiredRole: s.requiredRole,
        isRequired: s.isRequired !== false,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/workflow — حذف مرحله
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });

    await db.workflowConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
