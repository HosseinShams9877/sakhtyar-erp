// ─── API لاگ ممیزی ───
// مدل AuditLog حذف شده — خروجی خالی
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  // AuditLog model no longer exists in the schema
  return NextResponse.json([]);
}
