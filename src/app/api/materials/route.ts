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

    // دریافت مصالح
    const materials = await db.material.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        unit: true,
        minStock: true,
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

    // دریافت همه تراکنش‌های تأیید شده برای محاسبه موجودی لحظه‌ای
    const allTransactions = await db.transaction.findMany({
      where: {
        projectId,
        warehouseConfirmed: true,  // ✅ فقط تراکنش‌های تأیید شده
      },
    });

    // محاسبه موجودی لحظه‌ای برای هر مصالح
    const materialsWithStock = materials.map(material => {
      const materialTransactions = allTransactions.filter(t => t.materialId === material.id);
      
      const totalPurchased = materialTransactions
        .filter(t => t.type === 'PURCHASE')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      const totalDelivered = materialTransactions
        .filter(t => t.type === 'DELIVERY')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      const totalConsumed = materialTransactions
        .filter(t => t.type === 'CONSUMPTION')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      const stock = totalPurchased - totalDelivered - totalConsumed;
      
      return {
        ...material,
        stock: Math.max(0, stock),
      };
    });

    const categories = await db.materialCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      }
    });

    return NextResponse.json({ materials: materialsWithStock, categories });
  } catch (error: any) {
    console.error('Error in GET /api/materials:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('materials:create');
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { name, code, categoryId, unit, minStock, description, projectId } = body;

    // اعتبارسنجی
    if (!name || !code || !categoryId || !projectId) {
      return NextResponse.json(
        { error: 'نام، کد، دسته‌بندی و پروژه الزامی است' },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد در پروژه
    const existing = await db.material.findFirst({
      where: { 
        code,
        projectId 
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'کد کالا در این پروژه تکراری است' },
        { status: 409 }
      );
    }

    // ایجاد کالای جدید
    const material = await db.material.create({
      data: {
        name,
        code,
        categoryId,
        unit,
        minStock: minStock || 0,
        description: description || null,
        projectId,
      },
    });

    return NextResponse.json(material, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating material:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: 'عملیات مجاز نیست' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: 'عملیات مجاز نیست' }, { status: 400 });
}