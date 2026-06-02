// ─── API عمومی تنظیمات (بدون نیاز به احراز هویت) ───
// فقط تنظیماتی که isPublic = true هستند برگردانده می‌شوند

import { NextResponse } from 'next/server';

// کش در حافظه برای تنظیمات عمومی
let cachedSettings: Record<string, any> | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000; // ۱ دقیقه

// مقادیر پیش‌فرض
const DEFAULT_SETTINGS: Record<string, any> = {
  company_name: 'ساخت‌یار',
  company_name_en: 'SakhtYar',
  company_logo: '',
  app_version: '1.0.0',
  currency_name: 'ریال',
  date_format: 'jalaali',
  language: 'fa',
  theme_mode: 'light',
  sidebar_style: 'gradient',
  primary_color: '#7c3aed',
  notification_poll_interval: 60,
};

export async function GET() {
  try {
    const now = Date.now();

    // استفاده از کش اگر معتبر باشد
    if (cachedSettings && now < cacheExpiry) {
      return NextResponse.json({ settings: cachedSettings });
    }

    // تلاش برای خواندن از دیتابیس
    let settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };

    try {
      const { db } = await import('@/lib/db');
      // اگر مدل systemSetting وجود داشت
      if ((db as any).systemSetting) {
        const publicSettings = await (db as any).systemSetting.findMany({
          where: { isPublic: true },
          select: { key: true, value: true, type: true },
        });

        for (const s of publicSettings) {
          switch (s.type) {
            case 'boolean':
              settingsMap[s.key] = s.value === 'true';
              break;
            case 'number':
              settingsMap[s.key] = Number(s.value);
              break;
            case 'json':
              try { settingsMap[s.key] = JSON.parse(s.value); } catch { settingsMap[s.key] = s.value; }
              break;
            default:
              settingsMap[s.key] = s.value;
          }
        }
      }
    } catch {
      // دیتابیس در دسترس نیست - مقادیر پیش‌فرض استفاده میشه
    }

    // ذخیره در کش
    cachedSettings = settingsMap;
    cacheExpiry = now + CACHE_TTL;

    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    console.error('Public settings error:', error);
    return NextResponse.json({ settings: DEFAULT_SETTINGS }, { status: 200 });
  }
}
