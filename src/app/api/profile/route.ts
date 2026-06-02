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
    // مدل User وجود ندارد — برگرداندن پروفایل از نشست
    const profile = {
      id: (session.user as any).id || DEFAULT_PROFILE.id,
      name: session.user.name || DEFAULT_PROFILE.name,
      email: session.user.email || DEFAULT_PROFILE.email,
      role: (session.user as any).role || DEFAULT_PROFILE.role,
      phone: DEFAULT_PROFILE.phone,
      isActive: DEFAULT_PROFILE.isActive,
      createdAt: DEFAULT_PROFILE.createdAt,
    };
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 });

    const body = await req.json();

    // مدل User وجود ندارد — فقط نام و تلفن آپدیت می‌شود در حافظه
    const updatedProfile = {
      ...DEFAULT_PROFILE,
      id: (session.user as any).id || DEFAULT_PROFILE.id,
      name: body.name || session.user.name || DEFAULT_PROFILE.name,
      email: session.user.email || DEFAULT_PROFILE.email,
      role: (session.user as any).role || DEFAULT_PROFILE.role,
      phone: body.phone !== undefined ? body.phone : DEFAULT_PROFILE.phone,
      isActive: DEFAULT_PROFILE.isActive,
      createdAt: DEFAULT_PROFILE.createdAt,
    };

    return NextResponse.json(updatedProfile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
