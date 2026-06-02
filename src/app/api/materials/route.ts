import { db } from '@/lib/db';
import { requirePermission } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

// ─── API مصالح ───
// مصالح از اقلام فاکتور استخراج می‌شوند (بدون جدول مجزا)

export async function GET(req: NextRequest) {
  const auth = await requirePermission('materials:view');
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';

    // استخراج مصالح یکتا از اقلام فاکتور
    const items = await db.purchaseItem.findMany({
      select: { materialName: true, unit: true },
      distinct: ['materialName'],
    });

    // فیلتر جستجو
    let materials = items.map((item, idx) => ({
      id: `mat-${idx}`,
      name: item.materialName,
      unit: item.unit,
    }));

    if (search) {
      materials = materials.filter(m => m.name.includes(search));
    }

    return NextResponse.json({ materials, categories: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // مصالح در این سیستم فقط از طریق اقلام فاکتور ایجاد می‌شوند
  return NextResponse.json({ error: 'مصالح از طریق ثبت فاکتور ایجاد می‌شود' }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: 'عملیات مجاز نیست' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: 'عملیات مجاز نیست' }, { status: 400 });
}
