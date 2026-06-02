// ─── CSRF Token Endpoint ───
import { requireAuth } from '@/lib/api-auth';
import { addSecurityHeaders, rateLimit } from '@/lib/security';
import { generateCsrfToken } from '@/lib/csrf';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  const auth = await requireAuth();
  if (!auth.success) return addSecurityHeaders(auth.response);

  try {
    const csrfToken = await generateCsrfToken(auth.userId);
    return addSecurityHeaders(NextResponse.json({ csrfToken, expiresIn: 86400 }));
  } catch (error) {
    return addSecurityHeaders(NextResponse.json({ error: 'خطا در تولید توکن CSRF' }, { status: 500 }));
  }
}
