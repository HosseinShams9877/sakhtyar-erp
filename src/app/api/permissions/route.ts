import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';

// GET /api/permissions — دریافت ماتریس دسترسی
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const roles = await db.role.findMany({
      include: { permissions: true },
      orderBy: { priority: 'asc' },
    });

    // ساخت ماتریس: { resource: { action: { roleName: scope } } }
    const matrix: Record<string, Record<string, Record<string, string>>> = {};
    for (const role of roles) {
      for (const perm of role.permissions) {
        if (!matrix[perm.resource]) matrix[perm.resource] = {};
        if (!matrix[perm.resource][perm.action]) matrix[perm.resource][perm.action] = {};
        matrix[perm.resource][perm.action][role.name] = perm.scope;
      }
    }

    return NextResponse.json({ roles, matrix });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
