// ─── API فیلدهای سفارشی ───
// مدل CustomField حذف شده — پشتیبانی نمی‌شود
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: 'فیلدهای سفارشی دیگر پشتیبانی نمی‌شوند' },
    { status: 501 }
  );
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'فیلدهای سفارشی دیگر پشتیبانی نمی‌شوند' },
    { status: 501 }
  );
}

export async function PUT(_req: NextRequest) {
  return NextResponse.json(
    { error: 'فیلدهای سفارشی دیگر پشتیبانی نمی‌شوند' },
    { status: 501 }
  );
}

export async function DELETE(_req: NextRequest) {
  return NextResponse.json(
    { error: 'فیلدهای سفارشی دیگر پشتیبانی نمی‌شوند' },
    { status: 501 }
  );
}
