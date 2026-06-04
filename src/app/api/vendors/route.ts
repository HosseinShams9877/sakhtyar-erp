// ─── API فروشندگان / تامین‌کنندگان ───
// بازنویسی شده با Supplier به جای Vendor
// Vendor model حذف شده — استفاده از Supplier + Purchase
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const projectId = url.searchParams.get('projectId') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    let supplierIds: string[] | null = null;
    
    if (projectId) {
      // 1️⃣ فروشنده‌هایی که در SupplierProject ارتباط دارند
      const supplierProjects = await db.supplierProject.findMany({
        where: { projectId },
        select: { supplierId: true },
      });
      const linkedSupplierIds = supplierProjects.map(sp => sp.supplierId);
      
      // 2️⃣ فروشنده‌هایی که در این پروژه خرید داشته‌اند
      const purchases = await db.purchase.findMany({
        where: { projectId },
        select: { supplierId: true },
        distinct: ['supplierId'],
      });
      const purchaseSupplierIds = purchases.map(p => p.supplierId);
      
      // 3️⃣ ترکیب (اتحاد) هر دو لیست
      const allSupplierIds = [...new Set([...linkedSupplierIds, ...purchaseSupplierIds])];
      
      if (allSupplierIds.length === 0) {
        return NextResponse.json([]);
      }
      
      where.id = { in: allSupplierIds };
    }

    const suppliers = await db.supplier.findMany({
      where,
      include: {
        purchases: {
          where: projectId ? { projectId } : undefined,
          select: {
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        },
        projects: {
          include: { project: true },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const vendorsWithSummary = suppliers.map((supplier) => {
      const totalInvoiceAmount = supplier.purchases?.reduce((sum, p) => sum + p.totalAmount, 0) ?? 0;
      const invoiceCount = supplier.purchases?.length ?? 0;
      const { purchases, projects, ...rest } = supplier;
      return {
        ...rest,
        totalInvoiceAmount,
        invoiceCount,
        projects: projects?.map(p => p.project) || [],
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
      projectIds = [],
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

    // ذخیره ارتباط با پروژه‌ها
    if (projectIds.length > 0) {
      await db.supplierProject.createMany({
        data: projectIds.map((projectId: string) => ({
          supplierId: supplier.id,
          projectId: projectId,
        })),
        // skipDuplicates: true,  // ← در SQLite کار نمی‌کند، حذف شد
      });
    }

    // برگرداندن فروشنده با پروژه‌ها
    const supplierWithProjects = await db.supplier.findUnique({
      where: { id: supplier.id },
      include: {
        projects: {
          include: { project: true },
        },
      },
    });

    return NextResponse.json({
      ...supplierWithProjects,
      projects: supplierWithProjects?.projects?.map(p => p.project) || [],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Supplier create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, projectIds, ...rest } = body;

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

    // به‌روزرسانی اطلاعات پایه
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

    await db.supplier.update({
      where: { id },
      data: updateData,
    });

    // به‌روزرسانی ارتباط با پروژه‌ها
    if (projectIds !== undefined) {
      // حذف ارتباطات قبلی
      await db.supplierProject.deleteMany({
        where: { supplierId: id },
      });
      
      // ایجاد ارتباطات جدید
      if (projectIds.length > 0) {
        await db.supplierProject.createMany({
          data: projectIds.map((projectId: string) => ({
            supplierId: id,
            projectId: projectId,
          })),
        });
      }
    }

    // برگرداندن فروشنده با پروژه‌ها
    const supplierWithProjects = await db.supplier.findUnique({
      where: { id },
      include: {
        projects: {
          include: { project: true },
        },
      },
    });

    return NextResponse.json({
      ...supplierWithProjects,
      projects: supplierWithProjects?.projects?.map(p => p.project) || [],
    });
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