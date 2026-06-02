// ─── سیستم ترجمه (i18n) ───
// این سیستم ساده‌ای برای مدیریت ترجمه‌هاست
// ترجمه‌ها از فایل‌های translations/ خوانده می‌شوند
// زبان فعال از تنظیمات سیستم (SystemSetting) خوانده می‌شود

import fa from './translations/fa';
import en from './translations/en';

const translations: Record<string, Record<string, string>> = { fa, en };

let currentLocale: string = 'fa';

export function setLocale(locale: string) {
  currentLocale = locale;
}

export function getLocale(): string {
  return currentLocale;
}

/**
 * دریافت ترجمه بر اساس کلید
 * @param key کلید ترجمه (مثلاً 'nav.dashboard')
 * @param locale زبان اختیاری (اگر داده نشود از زبان فعلی استفاده می‌شود)
 * @returns متن ترجمه‌شده یا خود کلید اگر ترجمه‌ای یافت نشد
 */
export function t(key: string, locale?: string): string {
  const lang = locale || currentLocale;
  return translations[lang]?.[key] || translations['fa']?.[key] || key;
}

/**
 * ترجمه با جایگزینی متغیرها
 * @param key کلید ترجمه
 * @param params متغیرها برای جایگزینی (مثلاً {name: 'علی'})
 * @returns متن ترجمه‌شده با متغیرها
 * مثال: tParams('welcome', {name: 'علی'}) → 'خوش آمدید علی'
 */
export function tParams(key: string, params: Record<string, string | number>, locale?: string): string {
  let text = t(key, locale);
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
}

export type Locale = 'fa' | 'en';
export const AVAILABLE_LOCALES: { code: Locale; labelFa: string; labelEn: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'fa', labelFa: 'فارسی', labelEn: 'Persian', dir: 'rtl' },
  { code: 'en', labelEn: 'English', labelFa: 'انگلیسی', dir: 'ltr' },
];

export function getLocaleDirection(locale?: string): 'rtl' | 'ltr' {
  const lang = locale || currentLocale;
  return lang === 'fa' ? 'rtl' : 'ltr';
}
