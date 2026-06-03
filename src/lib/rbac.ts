// ═══════════════════════════════════════════════════════════════════════
// Dynamic Permission Engine
// RBAC + ABAC + Project Scope + Workflow — نقش‌محور + ویژگی‌محور
// ═══════════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import jalaali from 'jalaali-js';

// ─── نقش‌های سیستمی ───
export type SystemRole = 'SUPER_MANAGER' | 'PROJECT_MANAGER' | 'PURCHASER' | 'WAREHOUSE_KEEPER' | 'ADMIN';

// Backward compatibility
export type Role = SystemRole;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_MANAGER: 'مدیر کل پروژه‌ها',
  PROJECT_MANAGER: 'مدیر پروژه',
  PURCHASER: 'مسئول خرید',
  WAREHOUSE_KEEPER: 'انباردار',
  ADMIN: 'ادمین سیستم',
};

export const ROLE_COLORS: Record<string, string> = {
  SUPER_MANAGER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  PROJECT_MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PURCHASER: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  WAREHOUSE_KEEPER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const ROLE_ICONS: Record<string, string> = {
  SUPER_MANAGER: 'Crown',
  PROJECT_MANAGER: 'FolderKanban',
  PURCHASER: 'ShoppingBag',
  WAREHOUSE_KEEPER: 'Warehouse',
  ADMIN: 'Shield',
};

// ─── رنگ‌بندی تم هر نقش ───
export const ROLE_THEME: Record<string, { primary: string; gradient: string; accent: string; sidebar: string; sidebarFrom: string; sidebarVia: string; sidebarTo: string }> = {
  SUPER_MANAGER: {
    primary: 'purple', gradient: 'from-purple-600 to-indigo-700', accent: 'text-purple-600 dark:text-purple-400',
    sidebar: 'bg-gradient-to-b from-[#2d1b69] via-[#1e2a4a] to-[#141c35]',
    sidebarFrom: '#2d1b69', sidebarVia: '#1e2a4a', sidebarTo: '#141c35',
  },
  PROJECT_MANAGER: {
    primary: 'blue', gradient: 'from-blue-600 to-cyan-700', accent: 'text-blue-600 dark:text-blue-400',
    sidebar: 'bg-gradient-to-b from-[#1e3a5f] via-[#1a2d4a] to-[#141c35]',
    sidebarFrom: '#1e3a5f', sidebarVia: '#1a2d4a', sidebarTo: '#141c35',
  },
  PURCHASER: {
    primary: 'amber', gradient: 'from-amber-500 to-orange-600', accent: 'text-amber-600 dark:text-amber-400',
    sidebar: 'bg-gradient-to-b from-[#4a2c0a] via-[#2d1f0a] to-[#1a1408]',
    sidebarFrom: '#4a2c0a', sidebarVia: '#2d1f0a', sidebarTo: '#1a1408',
  },
  WAREHOUSE_KEEPER: {
    primary: 'emerald', gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600 dark:text-emerald-400',
    sidebar: 'bg-gradient-to-b from-[#0a3d2e] via-[#0d2a20] to-[#081a14]',
    sidebarFrom: '#0a3d2e', sidebarVia: '#0d2a20', sidebarTo: '#081a14',
  },
  ADMIN: {
    primary: 'red', gradient: 'from-red-500 to-rose-600', accent: 'text-red-600 dark:text-red-400',
    sidebar: 'bg-gradient-to-b from-[#4a1a1a] via-[#2d1418] to-[#1a0d10]',
    sidebarFrom: '#4a1a1a', sidebarVia: '#2d1418', sidebarTo: '#1a0d10',
  },
};

// ─── منابع و عملیات ───
export const RESOURCES = [
  'dashboard', 'projects', 'invoices', 'dues', 'vendors', 'transactions',
  'warehouse', 'reports', 'users', 'settings', 'materials', 'tracking',
  'permissions', 'workflow', 'audit',
] as const;

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const;

export const SCOPES = [
  { value: 'all', label: 'همه موارد' },
  { value: 'own', label: 'فقط موارد خود' },
  { value: 'assigned', label: 'فقط اختصاص‌داده‌شده' },
  { value: 'project', label: 'فقط پروژه‌های خود' },
] as const;

export const RESOURCE_LABELS: Record<string, string> = {
  dashboard: 'داشبورد',
  projects: 'پروژه‌ها',
  invoices: 'فاکتورها',
  dues: 'سررسید پرداخت‌ها',
  vendors: 'تامین‌کنندگان',
  transactions: 'تراکنش‌ها',
  warehouse: 'انبار/تحویل',
  reports: 'گزارشات',
  users: 'کاربران',
  settings: 'تنظیمات',
  materials: 'مصالح',
  tracking: 'رهگیری',
  permissions: 'مدیریت دسترسی',
  workflow: 'ورک‌فلو',
  audit: 'لاگ سیستم',
};

export const ACTION_LABELS: Record<string, string> = {
  view: 'مشاهده',
  create: 'ثبت',
  edit: 'ویرایش',
  delete: 'حذف',
  approve: 'تایید',
  export: 'خروجی',
};

// ═══════════════════════════════════════════════════════════════════════
// نقشه کامل دسترسی‌ها بر اساس نقش
// هر نقش فقط «همان چیزی که هر روز نیاز دارد» را می‌بیند
// ═══════════════════════════════════════════════════════════════════════

const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  // ─── مدیر کل پروژه‌ها ───
  // کنترل کل پروژه‌ها، بدهی‌ها و وضعیت مالی
  SUPER_MANAGER: [
    // مشاهده
    'dashboard:view',
    'projects:view', 'projects:create', 'projects:edit',
    'invoices:view', 'invoices:create', 'invoices:edit', 'invoices:approve', 'invoices:delete',
    'dues:view',
    'vendors:view', 'vendors:create', 'vendors:edit',
    'transactions:view', 'transactions:create', 'transactions:approve',
    'warehouse:view', 'warehouse:create',
    'reports:view', 'reports:export',
    'users:view', 'users:create', 'users:edit',
    'settings:view', 'settings:edit',
    'materials:view', 'tracking:view',
    'permissions:manage', 'workflow:manage',
    // عملیات مدیریتی
    'audit:view',
  ],

  // ─── مدیر پروژه ───
  // کنترل پروژه خودش — فقط پروژه‌های خودش
  PROJECT_MANAGER: [
    // مشاهده (محدوده به پروژه)
    'dashboard:view',
    'projects:view', 'projects:edit',
    'invoices:view', 'invoices:create', 'invoices:approve',
    'dues:view',
    'vendors:view',
    'transactions:view',
    'warehouse:view',
    'reports:view',
    'materials:view', 'tracking:view',
    // عدم دسترسی
    // ❌ پروژه‌های دیگر
    // ❌ تنظیمات سیستم
    // ❌ کاربران
    // ❌ گزارش مالی کل شرکت
  ],

  // ─── مسئول خرید ───
  // ثبت خرید و مدیریت تامین‌کنندگان — موبایل‌محور
  PURCHASER: [
    'dashboard:view',
    'invoices:view', 'invoices:create', 'invoices:edit',
    'dues:view',
    'vendors:view', 'vendors:create', 'vendors:edit',
    'transactions:view',
    'materials:view',
    'materials:create'
    // عدم دسترسی
    // ❌ تنظیمات سیستم
    // ❌ مدیریت کاربران
    // ❌ اطلاعات مالی کلان
  ],

  // ─── انباردار ───
  // فوق‌العاده ساده — فقط تایید تحویل مصالح — کاملاً موبایل محور
  WAREHOUSE_KEEPER: [
    'dashboard:view',
    'warehouse:view', 'warehouse:create',
    'invoices:view',
    'materials:view', 'tracking:view',
    'deliveries:confirm',
    // عدم دسترسی
    // ❌ بدهی‌ها
    // ❌ سررسیدها
    // ❌ گزارشات مالی
    // ❌ تنظیمات
    // ❌ تامین‌کنندگان
  ],

  // ─── ادمین سیستم ───
  // مدیریت فنی سیستم — Desktop Professional
  ADMIN: [
    'dashboard:view',
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'settings:view', 'settings:edit',
    'reports:view', 'reports:export',
    'permissions:manage', 'workflow:manage',
    'audit:view',
    'dues:view',
    // عدم دسترسی پیشنهادی
    // ❌ تایید مالی
    // ❌ تغییر تسویه‌ها
  ],
};

// ─── بررسی دسترسی داینامیک (سرور) ───
// پشتیبانی از نقش پروژه‌محور (ProjectMember)
export async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  projectId?: string
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: { permissions: true },
      },
    },
  });

  if (!user || !user.isActive) return false;

  // اگر projectId مشخص شده، نقش پروژه‌محور را بررسی کن
  let effectiveRole = user.role;
  if (projectId) {
    const membership = await db.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      include: {
        role: { include: { permissions: true } },
      },
    });
    if (membership?.role) {
      effectiveRole = membership.role;
    }
  }

  if (!effectiveRole) return false;

  // مدیر کل به همه چیز دسترسی دارد
  if (effectiveRole.name === 'SUPER_MANAGER') return true;

  // جستجوی مجوز در نقش کاربر
  const perm = effectiveRole.permissions.find(
    p => p.resource === resource && p.action === action
  );

  if (!perm) return false;

  // بررسی محدوده (scope)
  if (perm.scope === 'all') return true;

  if (perm.scope === 'own') {
    return true; // اجازه داده می‌شود، فیلتر در API اعمال می‌شود
  }

  if (perm.scope === 'assigned' || perm.scope === 'project') {
    if (!projectId) return true;
    // بررسی عضویت در پروژه (از هر دو جدول)
    const memberAccess = await db.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (memberAccess) return true;

    // سازگاری با UserProject قدیمی
    const legacyAccess = await db.userProject.findFirst({
      where: { userId, projectId },
    });
    return !!legacyAccess;
  }

  return false;
}

// ─── دریافت نقش کاربر در پروژه مشخص ───
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<string | null> {
  // اول از ProjectMember
  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    include: { role: true },
  });
  if (membership) return membership.role.name;

  // سازگاری: از UserProject
  const userProject = await db.userProject.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (userProject) {
    const roleMap: Record<string, string> = {
      owner: 'PROJECT_MANAGER',
      manager: 'PROJECT_MANAGER',
      viewer: 'WAREHOUSE_KEEPER',
    };
    return roleMap[userProject.role] || null;
  }

  return null;
}

// ─── تابع همگام (sync) برای کلاینت ───
export function hasPermission(
  role: string,
  permission: string
): boolean {
  return ROLE_PERMISSIONS_MAP[role]?.includes(permission) ?? false;
}

export function getPermissions(role: string): string[] {
  return ROLE_PERMISSIONS_MAP[role] ?? [];
}

// ─── آیتم‌های سایدبار هر نقش ───
export interface SidebarItem {
  key: string;
  label: string;
  icon: string;
  permission: string;
  section?: string; // بخش گروه‌بندی
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  // ─── بخش اصلی ───
  { key: 'dashboard', label: 'داشبورد', icon: 'LayoutDashboard', permission: 'dashboard:view', section: 'اصلی' },
  { key: 'projects', label: 'پروژه‌ها', icon: 'FolderKanban', permission: 'projects:view', section: 'اصلی' },

  // ─── بخش مالی (مستقل) ───
  { key: 'invoices', label: 'ثبت فاکتور', icon: 'FileText', permission: 'invoices:view', section: 'مالی' },
  { key: 'dues', label: 'سررسید پرداخت‌ها', icon: 'CalendarClock', permission: 'dues:view', section: 'مالی' },

  // ─── بخش عملیاتی ───
  { key: 'vendors', label: 'تامین‌کنندگان', icon: 'Truck', permission: 'vendors:view', section: 'عملیاتی' },
  { key: 'warehouse', label: 'تحویل مصالح', icon: 'Warehouse', permission: 'warehouse:view', section: 'عملیاتی' },
  { key: 'materials', label: 'مصالح', icon: 'Package', permission: 'materials:view', section: 'عملیاتی' },
  { key: 'tracking', label: 'رهگیری', icon: 'MapPin', permission: 'tracking:view', section: 'عملیاتی' },

  // ─── بخش مدیریتی ───
  { key: 'reports', label: 'گزارش‌گیری', icon: 'BarChart3', permission: 'reports:view', section: 'مدیریتی' },
  { key: 'users', label: 'کاربران', icon: 'Users', permission: 'users:view', section: 'مدیریتی' },
  { key: 'permissions', label: 'مدیریت دسترسی', icon: 'Shield', permission: 'permissions:manage', section: 'مدیریتی' },
  { key: 'settings', label: 'تنظیمات', icon: 'Settings', permission: 'settings:view', section: 'سیستم' },
];

// ═══════════════════════════════════════════════════════════════════════
// ثابت‌های کمکی
// ═══════════════════════════════════════════════════════════════════════

export const UNIT_LABELS: Record<string, string> = {
  KILOGRAM: 'کیلوگرم', TON: 'تن', METER: 'متر', SQUARE_METER: 'متر مربع',
  CUBIC_METER: 'متر مکعب', NUMBER: 'عدد', LITER: 'لیتر', BAG: 'کیسه',
  ROLL: 'رول', PIECE: 'قطعه', BRANCH: 'شاخه', PACKET: 'پاکت', SET: 'ست',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'فعال', COMPLETED: 'تکمیل‌شده', ON_HOLD: 'متوقف‌شده', CANCELLED: 'لغوشده',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار', approved: 'تاییدشده', rejected: 'ردشده',
  paid: 'پرداخت‌شده', delivered: 'تحویل‌شده', partial: 'پرداخت جزئی',
  overdue: 'سررسید گذشته', draft: 'پیش‌نویس', submitted: 'ارسال‌شده',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'خرید', DELIVERY: 'تحویل', RETURN: 'مرجوعی',
  ADJUSTMENT: 'تعدیل', CONSUMPTION: 'مصرف',
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'bg-green-100 text-green-800',
  DELIVERY: 'bg-blue-100 text-blue-800',
  RETURN: 'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  CONSUMPTION: 'bg-purple-100 text-purple-800',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار', PAID: 'پرداخت‌شده', PARTIAL: 'پرداخت جزئی',
  OVERDUE: 'سررسید گذشته', CANCELLED: 'لغوشده',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقدی', check: 'چکی', credit: 'اعتباری',
  CASH: 'نقدی', CHECK: 'چکی', CREDIT: 'اعتباری',
};

// ─── تبدیل اعداد لاتین به فارسی ───
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(str: string | number): string {
  return String(str).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d)]);
}

export function formatNumber(num: number): string {
  return toPersianDigits(new Intl.NumberFormat('en-US').format(num));
}

const JALAALI_MONTHS: Record<number, string> = {
  1: 'فروردین', 2: 'اردیبهشت', 3: 'خرداد', 4: 'تیر', 5: 'مرداد',
  6: 'شهریور', 7: 'مهر', 8: 'آبان', 9: 'آذر', 10: 'دی', 11: 'بهمن', 12: 'اسفند',
};

export function toJalaali(date: string | Date): { jy: number; jm: number; jd: number } {
  if (!date) return { jy: 1404, jm: 1, jd: 1 };
  const d = new Date(date);
  // حفاظت از تاریخ نامعتبر (NaN یا سال خارج از بازه معتبر جلالی)
  if (isNaN(d.getTime())) {
    return { jy: 1404, jm: 1, jd: 1 };
  }
  const gy = d.getFullYear();
  if (gy < 1800 || gy > 2200) {
    return { jy: 1404, jm: 1, jd: 1 };
  }
  return jalaali.toJalaali(gy, d.getMonth() + 1, d.getDate());
}

export function formatDate(date: string | Date): string {
  if (!date) return '—';
  const { jy, jm, jd } = toJalaali(date);
  const monthName = JALAALI_MONTHS[jm] || '';
  return `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
}

export function formatDateShort(date: string | Date): string {
  if (!date) return '—';
  const { jy, jm, jd } = toJalaali(date);
  return toPersianDigits(`${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`);
}

export function formatDateMonthYear(date: string | Date): string {
  if (!date) return '—';
  const { jy, jm } = toJalaali(date);
  const monthName = JALAALI_MONTHS[jm] || '';
  return `${monthName} ${toPersianDigits(jy)}`;
}

export function formatGregorianMonthToJalaali(monthStr: string): string {
  if (!monthStr) return '—';
  const [year, month] = monthStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return '—';
  const d = new Date(year, month - 1, 15);
  return formatDateMonthYear(d);
}

export function formatCurrency(amount: number): string {
  return formatNumber(amount) + ' ریال';
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000_000) return formatNumber(Math.round(amount / 1_000_000_000)) + ' میلیارد';
  if (amount >= 1_000_000) return formatNumber(Math.round(amount / 1_000_000)) + ' میلیون';
  return formatCurrency(amount);
}
