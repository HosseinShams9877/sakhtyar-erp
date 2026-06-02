// ─── API متریک‌ها ───
import { requireAdmin } from '@/lib/api-auth';
import { rateLimit, addSecurityHeaders, createSafeErrorResponse } from '@/lib/security';
import { getSystemMetrics, exportPrometheusMetrics } from '@/lib/monitoring';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  const auth = await requireAdmin();
  if (!auth.success) return addSecurityHeaders(auth.response);

  try {
    const format = req.nextUrl.searchParams.get('format');
    if (format === 'prometheus') {
      return new Response(exportPrometheusMetrics(), {
        headers: { 'Content-Type': 'text/plain; version=0.0.4' },
      });
    }
    const metrics = getSystemMetrics();
    return addSecurityHeaders(NextResponse.json(metrics));
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}
