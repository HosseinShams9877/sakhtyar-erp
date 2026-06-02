// ─── API فروشندگان / تامین‌کنندگان ───
// بازنویسی شده با Supplier به جای Vendor
// Vendor model حذف شده — استفاده از Supplier + Purchase
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    const suppliers = await db.supplier.findMany({
      where,
      include: {
        purchases: {
          select: {
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    // Compute purchase summary for each supplier
    const vendorsWithSummary = suppliers.map((supplier) => {
      const totalInvoiceAmount = supplier.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const invoiceCount = supplier.purchases.length;
      const { purchases, ...rest } = supplier;
      return {
        ...rest,
        totalInvoiceAmount,
        invoiceCount,
      };
    });

    return NextResponse.json(vendorsWithSummary);
  } catch (error: any) {
    console.error('GET suppliers error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactName,
      mobile,
      phone,
      email,
      address,
      bankAccount,
      settlementTerms,
      debtCeiling,
      taxId,
      isActive,
    } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: 'نام شرکت الزامی است' },
        { status: 400 }
      );
    }

    const supplier = await db.supplier.create({
      data: {
        companyName,
        contactName: contactName || '',
        phone: phone || '',
        mobile: mobile || null,
        email: email || null,
        address: address || null,
        bankAccount: bankAccount || null,
        settlementTerms: settlementTerms || null,
        debtCeiling: debtCeiling ? parseFloat(debtCeiling) : 0,
        taxId: taxId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    console.error('Supplier create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه فروشنده الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'فروشنده یافت نشد' },
        { status: 404 }
      );
    }

    // ✅ دریافت همه فیلدها از body
    const updateData: Record<string, unknown> = {};
    
    if (rest.companyName !== undefined) updateData.companyName = rest.companyName;
    if (rest.contactName !== undefined) updateData.contactName = rest.contactName;
    if (rest.mobile !== undefined) updateData.mobile = rest.mobile || null;
    if (rest.phone !== undefined) updateData.phone = rest.phone || '';
    if (rest.email !== undefined) updateData.email = rest.email || null;
    if (rest.address !== undefined) updateData.address = rest.address || null;
    if (rest.bankAccount !== undefined) updateData.bankAccount = rest.bankAccount || null;
    if (rest.settlementTerms !== undefined) updateData.settlementTerms = rest.settlementTerms || null;
    if (rest.debtCeiling !== undefined) updateData.debtCeiling = rest.debtCeiling ? parseFloat(rest.debtCeiling) : 0;
    if (rest.taxId !== undefined) updateData.taxId = rest.taxId || null;
    if (rest.isActive !== undefined) updateData.isActive = rest.isActive === true || rest.isActive === 'true';

    const supplier = await db.supplier.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error('Supplier update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه فروشنده الزامی است' },
        { status: 400 }
      );
    }

    const existing = await db.supplier.findUnique({ 
      where: { id },
      include: { purchases: true }
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'فروشنده یافت نشد' },
        { status: 404 }
      );
    }

    // اگر فاکتور دارد، به جای حذف، غیرفعال کن
    if (existing.purchases.length > 0) {
      await db.supplier.update({
        where: { id },
        data: { isActive: false }
      });
      return NextResponse.json({ message: 'فروشنده غیرفعال شد (دارای فاکتور)' });
    }

    // اگر فاکتور ندارد، حذف کن
    await db.supplier.delete({ where: { id } });
    return NextResponse.json({ message: 'فروشنده با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Supplier delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}