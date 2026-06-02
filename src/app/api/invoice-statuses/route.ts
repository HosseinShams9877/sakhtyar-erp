// ─── API وضعیت‌های خرید (استاتیک) ───
// مدل InvoiceStatus حذف شده — لیست ثابت وضعیت‌های خرید
import { NextRequest, NextResponse } from 'next/server';

const PURCHASE_STATUSES = [
  {
    id: 'pending',
    name: 'pending',
    label: 'در انتظار',
    color: '#f59e0b',
    isDefault: true,
    order: 1,
  },
  {
    id: 'partial',
    name: 'partial',
    label: 'پرداخت 部分‌ی',
    color: '#3b82f6',
    isDefault: false,
    order: 2,
  },
  {
    id: 'paid',
    name: 'paid',
    label: 'پرداخت‌شده',
    color: '#10b981',
    isDefault: false,
    order: 3,
  },
  {
    id: 'overdue',
    name: 'overdue',
    label: 'سررسید گذشته',
    color: '#ef4444',
    isDefault: false,
    order: 4,
  },
];

export async function GET(_req: NextRequest) {
  return NextResponse.json(PURCHASE_STATUSES);
}

// POST, PUT, DELETE — not applicable for static statuses
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'وضعیت‌های خرید ثابت هستند و قابل ایجاد نیستند' },
    { status: 501 }
  );
}

export async function PUT(_req: NextRequest) {
  return NextResponse.json(
    { error: 'وضعیت‌های خرید ثابت هستند و قابل ویرایش نیستند' },
    { status: 501 }
  );
}

export async function DELETE(_req: NextRequest) {
  return NextResponse.json(
    { error: 'وضعیت‌های خرید ثابت هستند و قابل حذف نیستند' },
    { status: 501 }
  );
}
