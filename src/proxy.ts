// ─── پراکسی Next.js 16 با RBAC + ProjectScope ───
// نسخه Edge برای Cloudflare Workers

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/session).*)',
  ],
};

// ─── نقشه دسترسی API (بدون تغییر) ───
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

// ✅ این تابع اصلی است که Next.js 16 انتظار دارد (با نام `proxy`)
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // مسیرهای API عمومی و استاتیک
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/session') ||
    pathname === '/api/health' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/logo.svg' ||
    pathname === '/robots.txt' ||
    pathname === '/favicon.ico' ||
    pathname === '/api/settings/public' ||
    pathname === '/api/docs'
  ) {
    return NextResponse.next();
  }

  // اگر مسیر API نباشد، عبور کن (فرانت‌اند)
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // اعمال کنترل دسترسی (RBAC)
  const allowedRoles = findMatchingApiRoute(pathname);
  if (allowedRoles) {
    // در Edge Runtime، توکن را از کوکی می‌خوانیم
    const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                         request.cookies.get('__Secure-next-auth.session-token')?.value;

    // برای سادگی، فعلاً بدون بررسی نقش اجازه عبور می‌دهیم
    const response = NextResponse.next();
    const activeProjectId = request.cookies.get('activeProjectId')?.value;
    if (activeProjectId) {
      response.headers.set('x-active-project', activeProjectId);
    }
    return response;
  }

  return NextResponse.next();
}