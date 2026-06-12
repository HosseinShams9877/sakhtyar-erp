// ─── API پروفایل کاربر جاری ───
// مدل User حذف شده — بازگرداندن پروفایل پیش‌فرض
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PROFILE = {
  id: 'default-admin',
  name: 'مدیر سیستم',
  email: 'admin@erp.local',
  role: 'ADMIN',
  phone: '',
  isActive: true,
  createdAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        avatar: true,
      },
    });
    // مدل User وجود ندارد — برگرداندن پروفایل از نشست
    const profile = {
      id: (session.user as any).id || DEFAULT_PROFILE.id,
      name: session.user.name || DEFAULT_PROFILE.name,
      email: session.user.email || DEFAULT_PROFILE.email,
      role: (session.user as any).role || DEFAULT_PROFILE.role,
      phone: DEFAULT_PROFILE.phone,
      avatar : user?.avatar || null,
      isActive: DEFAULT_PROFILE.isActive,
      createdAt: DEFAULT_PROFILE.createdAt,
    };
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, avatar } = body;

    // فقط فیلدهایی که تغییر کردن رو آپدیت کن
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    // اگه چیزی برای آپدیت نبود، همین الان برگردون
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'هیچ تغییری اعمال نشد' });
    }

    // آپدیت در دیتابیس
    const updatedUser = await db.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        nationalCode: true,
        mobile: true,
        role: {
          select: { name: true, label: true }
        }
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      nationalCode: updatedUser.nationalCode,
      mobile: updatedUser.mobile,
      role: updatedUser.role?.name || 'WAREHOUSE_KEEPER',
      roleLabel: updatedUser.role?.label || 'انباردار',
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}