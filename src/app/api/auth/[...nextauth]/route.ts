// ─── نقطه ورودی NextAuth ───
// هندلر NextAuth با مدیریت خطا — جلوگیری از کرش سرور و خطای 502

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// ساخت هندلر استاندارد NextAuth
const handler = NextAuth(authOptions);

// GET handler با مدیریت خطا
async function GET(req: NextRequest, ctx: any) {
  try {
    return await handler(req, ctx);
  } catch (error) {
    console.error('[NextAuth GET] Error:', error);
    // بررسی اینکه آیا درخواست session است
    const url = new URL(req.url);
    if (url.pathname.endsWith('/session')) {
      // برای درخواست session، پاسخ خالی برمی‌گرداند (نه 500/502)
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // برای سایر مسیرها
    return new Response(JSON.stringify({ error: 'Auth error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST handler با مدیریت خطا
async function POST(req: NextRequest, ctx: any) {
  try {
    return await handler(req, ctx);
  } catch (error) {
    console.error('[NextAuth POST] Error:', error);
    return new Response(JSON.stringify({ error: 'Auth error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export { GET, POST };
