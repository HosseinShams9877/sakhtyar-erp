// ─── پراکسی Next.js 16 با RBAC + ProjectScope ───
// نسخه Edge برای Cloudflare Workers

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

// ─── نقشه دسترسی API بر اساس نقش ───
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── مسیرهای بحرانی: عبور فوری ───
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/session') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  // فایل‌های استاتیک
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/logo.svg' ||
    pathname === '/robots.txt' ||
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

  // ─── بررسی RBAC ───
  const allowedRoles = findMatchingApiRoute(pathname);
  if (allowedRoles) {
    // در Edge Runtime، توکن از هدر یا کوکی خوانده میشه
    const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                         request.cookies.get('__Secure-next-auth.session-token')?.value;
    
    // برای بررسی کامل توکن، نیاز به API call هست. فعلاً اجازه میدیم
    // در نسخه نهایی میتونی از یک API داخلی برای بررسی نقش استفاده کنی
    
    const response = NextResponse.next();
    
    // افزودن هدرهای امنیتی
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    const activeProjectId = request.cookies.get('activeProjectId')?.value;
    if (activeProjectId) {
      response.headers.set('x-active-project', activeProjectId);
    }
    
    return response;
  }

  return NextResponse.next();
}