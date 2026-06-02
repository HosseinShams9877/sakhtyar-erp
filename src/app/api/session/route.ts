// ─── Lightweight Session Endpoint ───
// جایگزین سبک‌تر برای /api/auth/session
// از getServerSession استفاده می‌کند بدون عبور از هندلر سنگین NextAuth
// این مسیر سریع‌تر کامپایل می‌شود و احتمال خطای 502 را کاهش می‌دهد

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({}, { status: 200 });
    }

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    // در صورت خطا، سشن خالی برمی‌گرداند (نه 500 یا 502)
    console.error('[/api/session] Error fetching session:', error);
    return NextResponse.json({}, { status: 200 });
  }
}
