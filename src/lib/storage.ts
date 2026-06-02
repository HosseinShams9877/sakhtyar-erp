// ─── سیستم ذخیره‌سازی ابری / محلی ───
// سطوح انتزاعی برای ذخیره فایل‌ها در فضای ابری یا محلی
// پیکربندی: STORAGE_PROVIDER=local|s3 (پیش‌فرض: local)

import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export type StorageProvider = 'local' | 's3';

interface StorageResult {
  url: string;       // URL عمومی برای دسترسی به فایل
  path: string;      // مسیر ذخیره‌سازی داخلی
  provider: StorageProvider;
}

interface StorageConfig {
  provider: StorageProvider;
  localUploadDir: string;
  localPublicPath: string;
  // تنظیمات S3 (برای آینده)
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  s3PublicUrl?: string;
}

const config: StorageConfig = {
  provider: (process.env.STORAGE_PROVIDER as StorageProvider) || 'local',
  localUploadDir: path.join(process.cwd(), 'public', 'uploads'),
  localPublicPath: '/uploads',
  s3Bucket: process.env.S3_BUCKET,
  s3Region: process.env.S3_REGION,
  s3AccessKey: process.env.S3_ACCESS_KEY,
  s3SecretKey: process.env.S3_SECRET_KEY,
  s3Endpoint: process.env.S3_ENDPOINT,
  s3PublicUrl: process.env.S3_PUBLIC_URL,
};

// ─── ذخیره محلی ───

async function saveToLocal(fileBuffer: Buffer, fileName: string, subDir?: string): Promise<StorageResult> {
  const uploadDir = subDir
    ? path.join(config.localUploadDir, subDir)
    : config.localUploadDir;

  // ایجاد پوشه در صورت عدم وجود
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, fileBuffer);

  const publicUrl = subDir
    ? `${config.localPublicPath}/${subDir}/${fileName}`
    : `${config.localPublicPath}/${fileName}`;

  return {
    url: publicUrl,
    path: filePath,
    provider: 'local',
  };
}

// ─── ذخیره در S3 (آمازون / سازگار) ───
// این بخش زمانی فعال می‌شود که STORAGE_PROVIDER=s3 تنظیم شود
// از هر سرویس سازگار با S3 مانند MinIO, Wasabi, DigitalOcean Spaces و ... پشتیبانی می‌کند

async function saveToS3(fileBuffer: Buffer, fileName: string, subDir?: string): Promise<StorageResult> {
  // S3 upload requires @aws-sdk/client-s3 package
  // For now, fall back to local storage with a warning
  console.warn('[Storage] S3 provider not yet configured. Falling back to local storage. Install @aws-sdk/client-s3 and configure S3_* env vars.');

  return saveToLocal(fileBuffer, fileName, subDir);
}

// ─── رابط عمومی ───

/**
 * ذخیره فایل در فضای ابری یا محلی
 * @param fileBuffer بافر فایل
 * @param fileName نام فایل
 * @param prefix پیشوند نام فایل (مثلاً invoice-img)
 * @param subDir زیرپوشه اختیاری
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  prefix?: string,
  subDir?: string
): Promise<StorageResult> {
  const finalFileName = prefix
    ? `${prefix}-${Date.now()}-${fileName}`
    : `${Date.now()}-${fileName}`;

  switch (config.provider) {
    case 's3':
      return saveToS3(fileBuffer, finalFileName, subDir);
    case 'local':
    default:
      return saveToLocal(fileBuffer, finalFileName, subDir);
  }
}

/**
 * ذخیره فایل از FormData
 * @param file شیء File از FormData
 * @param prefix پیشوند نام فایل
 * @param subDir زیرپوشه اختیاری
 */
export async function uploadFormFile(
  file: File,
  prefix: string,
  subDir?: string
): Promise<StorageResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return uploadFile(buffer, file.name, prefix, subDir);
}

/**
 * حذف فایل
 * @param fileUrl مسیر عمومی فایل
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    if (config.provider === 'local') {
      // تبدیل URL عمومی به مسیر فیزیکی
      const relativePath = fileUrl.replace(config.localPublicPath, '');
      const filePath = path.join(config.localUploadDir, relativePath);

      if (existsSync(filePath)) {
        await unlink(filePath);
        return true;
      }
    }
    // S3 delete would go here
    return false;
  } catch {
    return false;
  }
}

/**
 * دریافت تنظیمات فعلی ذخیره‌سازی
 */
export function getStorageConfig(): Readonly<StorageConfig> {
  return { ...config };
}

/**
 * بررسی وضعیت اتصال ذخیره‌سازی
 */
export async function checkStorageHealth(): Promise<{
  provider: StorageProvider;
  healthy: boolean;
  details: string;
}> {
  if (config.provider === 'local') {
    try {
      if (!existsSync(config.localUploadDir)) {
        await mkdir(config.localUploadDir, { recursive: true });
      }
      // تست نوشتن
      const testFile = path.join(config.localUploadDir, '.health-check');
      await writeFile(testFile, Buffer.from('ok'));
      const { unlink: rm } = await import('fs/promises');
      await rm(testFile);
      return {
        provider: 'local',
        healthy: true,
        details: `ذخیره‌سازی محلی فعال - مسیر: ${config.localUploadDir}`,
      };
    } catch (err: any) {
      return {
        provider: 'local',
        healthy: false,
        details: `خطا: ${err.message}`,
      };
    }
  }

  return {
    provider: config.provider,
    healthy: false,
    details: 'در حال توسعه - در حال حاضر از ذخیره‌سازی محلی استفاده کنید',
  };
}
