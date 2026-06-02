// ─── پراکسی Next.js 16 با RBAC + ProjectScope ───
// صفحات فرانت‌اند بدون چک session عبور می‌کنند (SPA کنترل خودش را انجام می‌دهد)
// فقط مسیرهای API حساس محافظت می‌شوند
//
// بهینه‌سازی: مسیرهای /api/auth و /api/session بدون پردازش اضافی عبور می‌کنند
// تا تأخیر کمتر و احتمال خطای 502 کاهش یابد
//
// پشتیبانی از Project-Scoped Access: هدر x-active-project برای فیلتر دیتا

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ─── نقشه دسترسی API بر اساس نقش ───
const API_ROLE_ACCESS: Record<string, string[]> = {
  '/api/projects': ['SUPER_MANAGER', 'PROJECT_MANAGER' , 'PURCHASER' ],
  '/api/invoices': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER'],
  '/api/vendors': ['SUPER_MANAGER', 'PURCHASER'],
  '/api/warehouse': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'WAREHOUSE_KEEPER'],
  '/api/users': ['SUPER_MANAGER', 'ADMIN'],
  '/api/roles': ['ADMIN'],
  '/api/permissions': ['ADMIN'],
  '/api/settings': ['SUPER_MANAGER', 'ADMIN'],
  '/api/reports': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'ADMIN'],
  '/api/dashboard': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER', 'ADMIN'],
  '/api/transactions': ['SUPER_MANAGER', 'PURCHASER'],
  '/api/materials': ['SUPER_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER'],
  '/api/payments': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER'],
  '/api/invoices/approve': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER'],
  '/api/project-members': ['SUPER_MANAGER', 'ADMIN', 'PROJECT_MANAGER'],
  '/api/user-projects': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER', 'ADMIN'],
};

function findMatchingApiRoute(pathname: string): string[] | null {
  // بررسی تطابق دقیق اول
  if (API_ROLE_ACCESS[pathname]) return API_ROLE_ACCESS[pathname];

  // بررسی تطابق پیشوندی (از طولانی‌ترین به کوتاه‌ترین)
  const match = Object.keys(API_ROLE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname.startsWith(route));
  return match ? API_ROLE_ACCESS[match] : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── مسیرهای بحرانی: عبور فوری بدون هیچ پردازش ───
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/session') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  // فایل‌های استاتیک و asset‌ها
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/logo.svg' ||
    pathname === '/robots.txt' ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  // تمام صفحات فرانت‌اند بدون چک session اجازه عبور دارند
  // چون SPA خودش کنترل لاگین و ریدایرکت را انجام می‌دهد
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // مسیرهای API عمومی (بدون نیاز به احراز هویت)
  const publicApiPaths = [
    '/api/seed', '/api/cron', '/api/csrf-token',
    '/api/settings/public', '/api/docs',
  ];
  if (publicApiPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ─── بررسی RBAC برای مسیرهای API ───
  const allowedRoles = findMatchingApiRoute(pathname);
  if (allowedRoles) {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        const userRole = token.role as string;
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.json(
            { error: 'شما دسترسی به این بخش ندارید' },
            { status: 403 }
          );
        }
        // افزودن اطلاعات نقش و پروژه فعال به هدر
        const response = NextResponse.next();
        response.headers.set('x-user-role', userRole);
        response.headers.set('x-user-id', token.sub || '');

        // خواندن پروژه فعال از کوکی
        const activeProjectId = request.cookies.get('activeProjectId')?.value;
        if (activeProjectId) {
          response.headers.set('x-active-project', activeProjectId);
        }

        return response;
      }
    } catch {
      // خطا در بررسی توکن — در حالت توسعه اجازه عبور
    }
  }

  // مسیرهای API عملیاتی بدون چک session اجازه عبور
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
