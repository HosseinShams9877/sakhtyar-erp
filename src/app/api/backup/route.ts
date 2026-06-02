// ─── API پشتیبان‌گیری ───
import { requireAdmin } from '@/lib/api-auth';
import { rateLimit, addSecurityHeaders, createSafeErrorResponse } from '@/lib/security';
import { executeBackup, listBackups, cleanupOldBackups } from '@/lib/backup';
import { createAuditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  const auth = await requireAdmin();
  if (!auth.success) return addSecurityHeaders(auth.response);

  try {
    const backups = await listBackups();
    return addSecurityHeaders(NextResponse.json({ backups, total: backups.length }));
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  const auth = await requireAdmin();
  if (!auth.success) return addSecurityHeaders(auth.response);

  try {
    const result = await executeBackup({ label: 'manual' });
    if (!result.success) return addSecurityHeaders(NextResponse.json({ error: result.error }, { status: 500 }));

    await cleanupOldBackups();
    await createAuditLog({ userId: auth.userId, action: 'CREATE', entity: 'Notification', details: { action: 'manual_backup', fileName: result.fileName, size: result.size } });

    return addSecurityHeaders(NextResponse.json(result, { status: 201 }));
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}
