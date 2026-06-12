import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🚀 Upload API called');
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prefix = formData.get('prefix') as string || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // آپلود به Vercel Blob
    const blob = await put(`${prefix}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,  // ← اضافه کن
    });

    console.log('✅ Upload success:', blob.url);

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// برای درخواست OPTIONS (مرورگرها گاهی می‌فرستند)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}