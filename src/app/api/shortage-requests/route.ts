import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================
// GET /api/shortage-requests - دریافت لیست درخواست‌های کسری
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // pending, approved, rejected, fulfilled
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const [shortageRequests, total] = await Promise.all([
      db.shortageRequest.findMany({
        where,
        include: {
          material: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: true,
              stock: true,
              minStock: true,
            }
          },
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
              mobile: true,
            }
          }
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip,
      }),
      db.shortageRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: shortageRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching shortage requests:', error);
    return NextResponse.json(
      { success: false, error: 'خطا در دریافت درخواست‌های کسری' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/shortage-requests - ایجاد درخواست کسری جدید
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      materialId,
      materialName,
      quantity,
      unit,
      currentStock,
      minStock,
      priority,
      note,
      projectId,
      requestedById,
    } = body;

    // اعتبارسنجی
    if (!materialId || !materialName || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'اطلاعات درخواست کامل نیست' },
        { status: 400 }
      );
    }

    // ایجاد درخواست کسری
    const shortageRequest = await db.shortageRequest.create({
      data: {
        materialId,
        materialName,
        quantity: parseFloat(quantity),
        unit: unit || 'KILOGRAM',
        currentStock: currentStock || 0,
        minStock: minStock || 0,
        priority: priority || 'medium',
        note: note || null,
        projectId: projectId || null,
        requestedById: requestedById || null,
        status: 'pending',
        requestedAt: new Date(),
      },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: shortageRequest,
      message: 'درخواست کسری با موفقیت ثبت شد',
    });
  } catch (error) {
    console.error('Error creating shortage request:', error);
    return NextResponse.json(
      { success: false, error: 'خطا در ثبت درخواست کسری' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/shortage-requests - بروزرسانی وضعیت درخواست
// ============================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, approvedById, note } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'شناسه درخواست و وضعیت جدید الزامی است' },
        { status: 400 }
      );
    }

    // بررسی وجود درخواست
    const existingRequest = await db.shortageRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: 'درخواست یافت نشد' },
        { status: 404 }
      );
    }

    // بروزرسانی درخواست
    const updatedRequest = await db.shortageRequest.update({
      where: { id },
      data: {
        status,
        note: note || existingRequest.note,
        updatedAt: new Date(),
      },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // اگر درخواست تایید شد، می‌توانی موجودی را آپدیت کنی (اختیاری)
    // if (status === 'approved') {
    //   await db.material.update({
    //     where: { id: existingRequest.materialId },
    //     data: {
    //       stock: { increment: existingRequest.quantity }
    //     }
    //   });
    // }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'وضعیت درخواست بروزرسانی شد',
    });
  } catch (error) {
    console.error('Error updating shortage request:', error);
    return NextResponse.json(
      { success: false, error: 'خطا در بروزرسانی درخواست' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/shortage-requests - حذف درخواست
// ============================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'شناسه درخواست الزامی است' },
        { status: 400 }
      );
    }

    await db.shortageRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'درخواست با موفقیت حذف شد',
    });
  } catch (error) {
    console.error('Error deleting shortage request:', error);
    return NextResponse.json(
      { success: false, error: 'خطا در حذف درخواست' },
      { status: 500 }
    );
  }
}