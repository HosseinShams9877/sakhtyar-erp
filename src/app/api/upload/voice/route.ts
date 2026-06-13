import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;

    if (!file || !paymentId) {
      console.log('❌ Missing file or paymentId');
      return NextResponse.json({ error: 'Missing file or paymentId' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }
    const blob = await put(`voice-notes/${paymentId}-${Date.now()}.mp3`, file, {
      access: 'public',
    });
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
