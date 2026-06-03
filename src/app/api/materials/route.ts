import { db } from '@/lib/db';
import { requirePermission } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('materials:view');
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const categoryId = url.searchParams.get('categoryId') || '';
    const projectId = url.searchParams.get('projectId') || '';

    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      where.name = { contains: search };
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    const materials = await db.material.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        unit: true,
        minStock: true,
        stock: true,              // ✅ این خط مهم است
        description: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    const categories = await db.materialCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      }
    });

    return NextResponse.json({ materials, categories });
  } catch (error: any) {
    console.error('Error in GET /api/materials:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'مصالح از طریق ثبت فاکتور ایجاد می‌شود' }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: 'عملیات مجاز نیست' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: 'عملیات مجاز نیست' }, { status: 400 });
}