// app/api/upload/voice/route.ts
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;

    if (!file || !paymentId) {
      return NextResponse.json({ error: 'Missing file or paymentId' }, { status: 400 });
    }

    // محدودیت حجم (5 مگابایت برای ویس)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // آپلود به Blob
    const blob = await put(`voice-notes/${paymentId}-${Date.now()}.mp3`, file, {
      access: 'public',
    });

    // ذخیره URL در دیتابیس
    await db.payment.update({
      where: { id: paymentId },
      data: { voiceNoteUrl: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Voice upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}