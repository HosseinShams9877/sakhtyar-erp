// ابزارهای فارسی — تبدیل اعداد، تاریخ شمسی، قالب‌بندی مبلغ
// Persian utilities: number conversion, Shamsi dates, currency formatting

import jalaali from 'jalaali-js';

// ─── تبدیل اعداد به فارسی ───
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

// ─── قالب‌بندی مبلغ با جداکننده هزارگان ───
export function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('en-US');
  const persian = toPersianDigits(formatted);
  return amount < 0 ? `(${persian}) تومان` : `${persian} تومان`;
}

export function formatNumber(num: number): string {
  return toPersianDigits(Math.abs(num).toLocaleString('en-US'));
}

// ─── تاریخ شمسی ───
export function toShamsi(date: Date | string): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const gy = d.getFullYear();
  if (gy < 1800 || gy > 2200) return '—';
  const { jy, jm, jd } = jalaali.toJalaali(gy, d.getMonth() + 1, d.getDate());
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function toPersianDate(date: Date | string): string {
  return toPersianDigits(toShamsi(date));
}

// ─── تبدیل شمسی به میلادی ───
export function fromShamsi(shamsiStr: string): Date {
  const parts = shamsiStr.split('/').map(Number);
  if (parts.length !== 3) return new Date();
  const { gy, gm, gd } = jalaali.toGregorian(parts[0], parts[1], parts[2]);
  return new Date(gy, gm - 1, gd);
}

// ─── نام ماه‌های شمسی ───
const shamsiMonths = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export function toPersianDateLong(date: Date | string): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const gy = d.getFullYear();
  if (gy < 1800 || gy > 2200) return '—';
  const { jy, jm, jd } = jalaali.toJalaali(gy, d.getMonth() + 1, d.getDate());
  return `${toPersianDigits(jd)} ${shamsiMonths[jm - 1]} ${toPersianDigits(jy)}`;
}

// ─── محاسبه روزهای باقیمانده تا سررسید ───
export function daysUntilDue(dueDate: Date | string): number {
  if (!dueDate) return 999;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── رنگ‌بندی هشدار سررسید (موتور هوشمند) ───
export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red';

export function getDueDateAlertLevel(dueDate: Date | string): AlertLevel {
  const days = daysUntilDue(dueDate);
  if (days < 0) return 'red';       // معوق
  if (days === 0) return 'red';     // سررسید امروز
  if (days <= 3) return 'orange';   // کمتر از ۳ روز
  if (days <= 7) return 'yellow';   // کمتر از ۷ روز
  return 'green';                    // بیشتر از ۷ روز
}

export function getAlertLevelLabel(level: AlertLevel): string {
  switch (level) {
    case 'red': return 'معوق / سررسید امروز';
    case 'orange': return 'کمتر از ۳ روز';
    case 'yellow': return 'کمتر از ۷ روز';
    case 'green': return 'عادی';
  }
}

export function getAlertLevelColor(level: AlertLevel): { bg: string; text: string; border: string; dot: string } {
  switch (level) {
    case 'red':
      return { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' };
    case 'orange':
      return { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' };
    case 'yellow':
      return { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500' };
    case 'green':
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' };
  }
}

// ─── وضعیت خرید به فارسی ───
export function getPurchaseStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending': return { label: 'در انتظار پرداخت', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    case 'partial': return { label: 'پرداخت جزئی', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'paid': return { label: 'تسویه شده', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'overdue': return { label: 'معوق', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    default: return { label: status, color: 'bg-gray-100 text-gray-800' };
  }
}

// ─── وضعیت پروژه به فارسی ───
export function getProjectStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'active': return { label: 'فعال', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'completed': return { label: 'تکمیل شده', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'on_hold': return { label: 'متوقف', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    default: return { label: status, color: 'bg-gray-100 text-gray-800' };
  }
}

// ─── تاریخ امروز شمسی ───
export function getTodayShamsi(): string {
  return toShamsi(new Date());
}

// ─── تعداد روز باقیمانده به فارسی ───
export function formatDaysRemaining(days: number): string {
  if (days < 0) return `${toPersianDigits(Math.abs(days))} روز عقب‌افتاده`;
  if (days === 0) return 'سررسید امروز';
  return `${toPersianDigits(days)} روز مانده`;
}
