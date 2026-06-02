// ─── هدرهای امنیتی برای پاسخ‌های API ───
import { NextResponse, NextRequest } from 'next/server';

export function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

// ─── محدودیت نرخ درخواست (Rate Limiting) ───
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * بررسی محدودیت نرخ درخواست
 * @param req درخواست ورودی
 * @param maxRequests حداکثر تعداد درخواست در بازه (پیش‌فرض: ۱۰۰)
 * @param windowMs بازه زمانی به میلی‌ثانیه (پیش‌فرض: ۶۰ ثانیه)
 */
export function rateLimit(
  req: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const key = `${ip}-${req.nextUrl.pathname}`;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

// ─── پاسخ خطای امن ───
export function createSafeErrorResponse(error: unknown, status: number = 500): NextResponse {
  const message = error instanceof Error ? error.message : 'خطای داخلی سرور';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
