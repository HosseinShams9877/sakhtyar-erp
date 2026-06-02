// ─── توابع کمکی احراز هویت و مجوزدهی سمت سرور ───
// SECURITY: تمام API routes باید از requireAuth یا requirePermission استفاده کنند

import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { hasPermission, type Role } from './rbac';
import { NextRequest, NextResponse } from 'next/server';

type Permission = string; // فرمت: resource:action مثل invoices:view

interface AuthResult {
  success: true;
  userId: string;
  role: Role;
  email: string;
  name: string;
}

interface AuthError {
  success: false;
  response: NextResponse;
}

/**
 * دریافت نشست کاربر فعلی
 * در صورت عدم احراز هویت، خطای ۴۰۱ برمی‌گرداند
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'دسترسی غیرمجاز. لطفاً وارد شوید.' },
        { status: 401 }
      ),
    };
  }

  const role = (session.user as any).role as Role;
  const userId = (session.user as any).id as string;

  // بررسی وضعیت کاربر در دیتابیس (امکان غیرفعال‌سازی فوری)
  try {
    const user = await import('@/lib/db').then(m => m.db.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    }));
    if (!user || !user.isActive) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'حساب کاربری شما غیرفعال شده است.' },
          { status: 403 }
        ),
      };
    }
  } catch {
    // اگر دیتابیس در دسترس نبود، نشست معتبر فرض می‌شود
  }

  return {
    success: true,
    userId,
    role,
    email: session.user.email || '',
    name: session.user.name || '',
  };
}

/**
 * بررسی مجوز دسترسی کاربر
 * در صورت عدم مجوز، خطای ۴۰۳ برمی‌گرداند
 */
export async function requirePermission(permission: Permission): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth();

  if (!authResult.success) return authResult;

  if (!hasPermission(authResult.role, permission)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'شما مجوز دسترسی به این بخش را ندارید.' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * بررسی اینکه آیا کاربر ادمین است
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth();

  if (!authResult.success) return authResult;

  if (authResult.role !== 'ADMIN' && authResult.role !== 'SUPER_MANAGER') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'این عملیات فقط برای مدیر سیستم مجاز است.' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}
