// ─── API تنظیمات سیستمی ───
// مدل SystemSetting حذف شده — مقادیر پیش‌فرض از حافظه
import { rateLimit, addSecurityHeaders, createSafeErrorResponse } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';

// تنظیمات پیش‌فرض (در حافظه)
const settingsStore: Record<string, { value: string; category: string; label: string; type: string; options?: string; group: number; isPublic: boolean }> = {
  // اطلاعات سازمان
  company_name: { value: 'سامانه مدیریت مصالح عمرانی', category: 'company', label: 'نام سازمان', type: 'text', group: 1, isPublic: true },
  company_name_en: { value: 'Construction Material Management', category: 'company', label: 'نام سازمان (انگلیسی)', type: 'text', group: 2, isPublic: true },
  company_logo: { value: '', category: 'company', label: 'لوگوی سازمان', type: 'image', group: 3, isPublic: true },
  company_favicon: { value: '/logo.svg', category: 'company', label: 'فاویکون', type: 'image', group: 4, isPublic: true },
  company_address: { value: '', category: 'company', label: 'آدرس', type: 'text', group: 5, isPublic: false },
  company_phone: { value: '', category: 'company', label: 'تلفن', type: 'text', group: 6, isPublic: false },
  company_email: { value: '', category: 'company', label: 'ایمیل', type: 'text', group: 7, isPublic: false },

  // تنظیمات منطقه‌ای
  currency_name: { value: 'ریال', category: 'regional', label: 'واحد پول', type: 'text', group: 1, isPublic: true },
  currency_symbol: { value: 'IRR', category: 'regional', label: 'نماد واحد پول', type: 'text', group: 2, isPublic: true },
  currency_short_million: { value: 'میلیون', category: 'regional', label: 'نماد میلیون', type: 'text', group: 3, isPublic: true },
  currency_short_billion: { value: 'میلیارد', category: 'regional', label: 'نماد میلیارد', type: 'text', group: 4, isPublic: true },
  date_format: { value: 'jalaali', category: 'regional', label: 'فرمت تاریخ', type: 'select', options: '["jalaali","gregorian"]', group: 5, isPublic: true },
  language: { value: 'fa', category: 'regional', label: 'زبان', type: 'select', options: '["fa","en"]', group: 6, isPublic: true },
  digit_format: { value: 'persian', category: 'regional', label: 'فرمت ارقام', type: 'select', options: '["persian","english"]', group: 7, isPublic: true },
  timezone: { value: 'Asia/Tehran', category: 'regional', label: 'منطقه زمانی', type: 'text', group: 8, isPublic: false },

  // تنظیمات فاکتور
  invoice_prefix: { value: 'INV', category: 'invoice', label: 'پیشوند شماره فاکتور', type: 'text', group: 1, isPublic: true },
  invoice_auto_number: { value: 'true', category: 'invoice', label: 'شماره‌گذاری خودکار', type: 'boolean', group: 2, isPublic: false },

  // تنظیمات نوتیفیکیشن
  notify_low_stock: { value: 'true', category: 'notification', label: 'هشدار موجودی کم', type: 'boolean', group: 1, isPublic: false },
  notify_invoice_status: { value: 'true', category: 'notification', label: 'اعلان وضعیت فاکتور', type: 'boolean', group: 2, isPublic: false },
  notify_email: { value: 'false', category: 'notification', label: 'ارسال ایمیل', type: 'boolean', group: 3, isPublic: false },
  notification_poll_interval: { value: '60', category: 'notification', label: 'فاصله بررسی (ثانیه)', type: 'number', group: 4, isPublic: false },

  // تنظیمات ظاهری
  app_version: { value: '1.0.0', category: 'appearance', label: 'نسخه', type: 'text', group: 1, isPublic: true },
  chart_primary_color: { value: '#7c3aed', category: 'appearance', label: 'رنگ اصلی نمودار', type: 'color', group: 2, isPublic: true },
  chart_secondary_color: { value: '#10b981', category: 'appearance', label: 'رنگ فرعی نمودار', type: 'color', group: 3, isPublic: true },
  sidebar_style: { value: 'gradient', category: 'appearance', label: 'استایل سایدبار', type: 'select', options: '["gradient","solid","transparent"]', group: 4, isPublic: true },

  // تنظیمات امنیتی
  session_timeout_hours: { value: '24', category: 'security', label: 'مدت نشست (ساعت)', type: 'number', group: 1, isPublic: false },
  max_file_size_mb: { value: '5', category: 'security', label: 'حداکثر حجم فایل (مگابایت)', type: 'number', group: 2, isPublic: false },
  rate_limit_window: { value: '60', category: 'security', label: 'فاصله محدودیت (ثانیه)', type: 'number', group: 3, isPublic: false },
  rate_limit_max: { value: '60', category: 'security', label: 'حداکثر درخواست', type: 'number', group: 4, isPublic: false },
  auth_rate_limit_max: { value: '10', category: 'security', label: 'حداکثر درخواست احراز', type: 'number', group: 5, isPublic: false },
  allowed_file_types: { value: 'jpg,jpeg,png,gif,webp,pdf', category: 'security', label: 'فرمت‌های مجاز', type: 'text', group: 6, isPublic: false },

  // تنظیمات عمومی
  low_stock_threshold: { value: '0', category: 'general', label: 'آستانه هشدار موجودی', type: 'number', group: 1, isPublic: false },
  dashboard_recent_items: { value: '10', category: 'general', label: 'تعداد آیتم‌های اخیر', type: 'number', group: 2, isPublic: false },
  default_page_size: { value: '20', category: 'general', label: 'اندازه صفحه پیش‌فرض', type: 'number', group: 3, isPublic: false },
};

// GET - دریافت تنظیمات
export async function GET(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  try {
    const category = req.nextUrl.searchParams.get('category');
    const isPublic = req.nextUrl.searchParams.get('public') === 'true';

    let entries = Object.entries(settingsStore);

    if (isPublic) {
      entries = entries.filter(([_, s]) => s.isPublic);
    }
    if (category) {
      entries = entries.filter(([_, s]) => s.category === category);
    }

    const settingsMap: Record<string, any> = {};
    const grouped: Record<string, any[]> = {};
    const raw: any[] = [];

    for (const [key, s] of entries) {
      switch (s.type) {
        case 'boolean':
          settingsMap[key] = s.value === 'true';
          break;
        case 'number':
          settingsMap[key] = Number(s.value);
          break;
        case 'json':
          try { settingsMap[key] = JSON.parse(s.value); } catch { settingsMap[key] = s.value; }
          break;
        default:
          settingsMap[key] = s.value;
      }
      const cat = s.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ key, ...s });
      raw.push({ key, ...s });
    }

    return addSecurityHeaders(NextResponse.json({ settings: settingsMap, grouped, raw }));
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}

// PUT - ذخیره تنظیمات
export async function PUT(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.key && item.value !== undefined) {
          if (settingsStore[item.key]) {
            settingsStore[item.key].value = String(item.value);
          } else {
            settingsStore[item.key] = {
              value: String(item.value),
              category: item.category || 'general',
              label: item.label || item.key,
              type: item.type || 'text',
              options: item.options,
              group: item.group || 0,
              isPublic: item.isPublic || false,
            };
          }
        }
      }
      return addSecurityHeaders(NextResponse.json({ message: 'تنظیمات با موفقیت ذخیره شد' }));
    } else {
      if (body.key && body.value !== undefined) {
        if (settingsStore[body.key]) {
          settingsStore[body.key].value = String(body.value);
        } else {
          settingsStore[body.key] = {
            value: String(body.value),
            category: body.category || 'general',
            label: body.label || body.key,
            type: body.type || 'text',
            options: body.options,
            group: body.group || 0,
            isPublic: body.isPublic || false,
          };
        }
        return addSecurityHeaders(NextResponse.json({ key: body.key, ...settingsStore[body.key] }));
      }
      return addSecurityHeaders(NextResponse.json({ error: 'کلید و مقدار الزامی است' }, { status: 400 }));
    }
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}

// POST - مقداردهی اولیه تنظیمات پیش‌فرض
export async function POST(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.allowed) return addSecurityHeaders(NextResponse.json({ error: 'درخواست بیش از حد مجاز' }, { status: 429 }));

  try {
    // تنظیمات پیش‌فرض همیشه در حافظه هستند
    return addSecurityHeaders(NextResponse.json({
      message: 'تنظیمات پیش‌فرض فعال است',
      count: Object.keys(settingsStore).length,
    }));
  } catch (error: any) {
    return addSecurityHeaders(createSafeErrorResponse(error));
  }
}
