// ─── API پشتیبان‌گیری ───
// این فایل برای Cloudflare Workers غیرفعال شده است
// چون از ماژول‌های Node.js استفاده می‌کند که در Edge Runtime در دسترس نیستند

// import { NextRequest, NextResponse } from 'next/server';
// import { requirePermission } from '@/lib/api-auth';
// import { executeBackup, listBackups, cleanupOldBackups } from '@/lib/backup';
// import { addSecurityHeaders, rateLimit } from '@/lib/security';

// export async function GET(req: NextRequest) {
//   const rl = rateLimit(req);
//   if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));
//   ... بقیه کد کامنت شده
// }

// POST /api/backup - ایجاد بکاپ دستی
// export async function POST(req: NextRequest) {
//   ... بقیه کد کامنت شده
// }

// DELETE /api/backup - حذف بکاپ قدیمی
// export async function DELETE(req: NextRequest) {
//   ... بقیه کد کامنت شده
// }

// توابع جایگزین خالی برای جلوگیری از خطا
export async function GET() {
  return new Response(JSON.stringify({ error: 'Backup API disabled on Cloudflare' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST() {
  return new Response(JSON.stringify({ error: 'Backup API disabled on Cloudflare' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ error: 'Backup API disabled on Cloudflare' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}