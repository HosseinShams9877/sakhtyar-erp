import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/suppliers — List all suppliers with computed total debt and purchase count
export async function GET(_req: NextRequest) {
  try {
    const suppliers = await db.supplier.findMany({
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

    const enriched = suppliers.map((supplier) => {
      const totalDebt = supplier.purchases
        .filter((p) => p.status !== 'paid')
        .reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);
      const purchaseCount = supplier.purchases.length;
      const { purchases, ...rest } = supplier;
      return {
        ...rest,
        totalDebt: Math.round(totalDebt * 100) / 100,
        purchaseCount,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/suppliers — Create supplier
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, contactName, phone, address } = body;

    if (!companyName || !contactName || !phone) {
      return NextResponse.json(
        { error: 'نام شرکت، نام تماس و تلفن الزامی است' },
        { status: 400 }
      );
    }

    const supplier = await db.supplier.create({
      data: {
        companyName,
        contactName,
        phone,
        address: address || null,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/suppliers — Update supplier
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, companyName, contactName, phone, address } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه تامین‌کننده الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'تامین‌کننده یافت نشد' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const supplier = await db.supplier.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(supplier);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/suppliers — Delete supplier
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه تامین‌کننده الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'تامین‌کننده یافت نشد' },
        { status: 404 }
      );
    }

    await db.supplier.delete({ where: { id } });

    return NextResponse.json({ message: 'تامین‌کننده با موفقیت حذف شد' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
