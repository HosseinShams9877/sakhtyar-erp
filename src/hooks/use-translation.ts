'use client';

import { useCallback } from 'react';
import { useSettings } from './use-settings';
import { t, tParams, getLocaleDirection, type Locale } from '@/lib/i18n';

/**
 * هوک ترجمه - از تنظیمات سیستم برای تعیین زبان استفاده می‌کند
 * 
 * استفاده:
 *   const { t, tParams, isRtl, locale } = useTranslation();
 *   <h1>{t('dashboard.title')}</h1>
 */
export function useTranslation() {
  const { settings } = useSettings();
  const locale = (settings.language || 'fa') as Locale;

  const translate = useCallback((key: string) => {
    return t(key, locale);
  }, [locale]);

  const translateParams = useCallback((key: string, params: Record<string, string | number>) => {
    return tParams(key, params, locale);
  }, [locale]);

  const isRtl = getLocaleDirection(locale) === 'rtl';
  const isEn = locale === 'en';

  return {
    t: translate,
    tParams: translateParams,
    locale,
    isRtl,
    isEn,
  };
}
