// ─── API واحدهای اندازه‌گیری ───
import { rateLimit, addSecurityHeaders, createSafeErrorResponse } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { UNIT_LABELS } from '@/lib/rbac';

// GET - دریافت لیست واحدها
export async function GET(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  try {
    const units = Object.entries(UNIT_LABELS).map(([key, label]) => ({
      value: key,
      label,
      isActive: true,
    }));
    return addSecurityHeaders(NextResponse.json(units));
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}
