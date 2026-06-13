import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;

    if (!file || !paymentId) {
      return NextResponse.json({ error: 'Missing file or paymentId' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    const blob = await put(`receipts/${paymentId}-${Date.now()}.jpg`, file, {
      access: 'public',
    });

    await db.payment.update({
      where: { id: paymentId },
      data: { receiptImage: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Receipt upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
