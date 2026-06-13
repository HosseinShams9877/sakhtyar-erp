import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  console.log('1️⃣ Voice upload started');
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;

    console.log('2️⃣ paymentId:', paymentId);
    console.log('3️⃣ file name:', file?.name, 'size:', file?.size);

    if (!file || !paymentId) {
      console.log('❌ Missing file or paymentId');
      return NextResponse.json({ error: 'Missing file or paymentId' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large');
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }
    console.log('4️⃣ Uploading to Blob...');
    const blob = await put(`voice-notes/${paymentId}-${Date.now()}.mp3`, file, {
      access: 'public',
    });
    console.log('5️⃣ Blob URL:', blob.url);
    await db.payment.update({
      where: { id: paymentId },
      data: { voiceNoteUrl: blob.url },
    });
    console.log('7️⃣ Done!');
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Voice upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
