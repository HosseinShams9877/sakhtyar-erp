// فایل: proxy.ts (در ریشه پروژه)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
// ─── نقشه دسترسی API ───
const API_ROLE_ACCESS: Record<string, string[]> = {
  '/api/projects': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER'],
  '/api/invoices': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER'],
  '/api/vendors': ['SUPER_MANAGER', 'PURCHASER'],
  '/api/warehouse': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'WAREHOUSE_KEEPER'],
  '/api/users': ['SUPER_MANAGER', 'ADMIN'],
  '/api/roles': ['ADMIN', 'SUPER_MANAGER'],
  '/api/permissions': ['ADMIN'],
  '/api/settings': ['SUPER_MANAGER', 'ADMIN'],
  '/api/reports': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'ADMIN'],
  '/api/dashboard': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER', 'ADMIN'],
  '/api/transactions': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER'],
  '/api/materials': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER'],
  '/api/payments': ['SUPER_MANAGER', 'PROJECT_MANAGER'],
  '/api/invoices/approve': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER'],
  '/api/project-members': ['SUPER_MANAGER', 'ADMIN', 'PROJECT_MANAGER'],
  '/api/user-projects': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER', 'ADMIN'],
  '/api/deliveries': ['SUPER_MANAGER', 'PROJECT_MANAGER', 'WAREHOUSE_KEEPER'],
};

function findMatchingApiRoute(pathname: string): string[] | null {
  if (API_ROLE_ACCESS[pathname]) return API_ROLE_ACCESS[pathname];
  const match = Object.keys(API_ROLE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname.startsWith(route));
  return match ? API_ROLE_ACCESS[match] : null;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

  // مسیرهای عمومی
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/session') ||
    pathname === '/api/health' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // صفحات فرانت‌اند
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // مسیرهای API عمومی
  const publicApiPaths = ['/api/seed', '/api/cron', '/api/csrf-token', '/api/settings/public', '/api/docs'];
  if (publicApiPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // بررسی دسترسی
  const allowedRoles = findMatchingApiRoute(pathname);
  if (allowedRoles) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userRole = (token?.role as string) || '';
    
    if (!token || !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }
    const response = NextResponse.next();
    const activeProjectId = request.cookies.get('activeProjectId')?.value;
    if (activeProjectId) {
      response.headers.set('x-active-project', activeProjectId);
    }
    return response;
  }

  return NextResponse.next();
}

// تنظیمات middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};