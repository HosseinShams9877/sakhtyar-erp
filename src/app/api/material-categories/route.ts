// ─── API دسته‌بندی مصالح ───
// مدل MaterialCategory حذف شده — پشتیبانی نمی‌شود
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  // MaterialCategory model no longer exists
  return NextResponse.json([]);
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'دسته‌بندی مصالح دیگر پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}

export async function PUT(_req: NextRequest) {
  return NextResponse.json(
    { error: 'دسته‌بندی مصالح دیگر پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}

export async function DELETE(_req: NextRequest) {
  return NextResponse.json(
    { error: 'دسته‌بندی مصالح دیگر پشتیبانی نمی‌شود' },
    { status: 501 }
  );
}
