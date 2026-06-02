'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useProject } from '@/components/project-context';
import {
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_THEME,
  hasPermission,
  SIDEBAR_ITEMS,
  type SidebarItem,
} from '@/lib/rbac';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  FolderKanban,
  Truck,
  FileText,
  Warehouse,
  BarChart3,
  Settings,
  Users,
  HardHat,
  Shield,
  ShoppingBag,
  CalendarClock,
  Package,
  MapPin,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

/* ═══════════════════════════════════════════════════════════
   مپ آیکون‌ها
   ═══════════════════════════════════════════════════════════ */

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Truck,
  Warehouse,
  BarChart3,
  Settings,
  Users,
  Shield,
  ShoppingBag,
  CalendarClock,
  Package,
  MapPin,
};

/* ═══════════════════════════════════════════════════════════
   تایپ‌ها
   ═══════════════════════════════════════════════════════════ */

type PageKey = 'dashboard' | 'projects' | 'invoices' | 'dues' | 'vendors' | 'warehouse' | 'reports' | 'users' | 'permissions' | 'workflow' | 'settings' | 'materials';

interface SidebarProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  collapsed?: boolean;
  onNavigate?: () => void;
}

/* ═══════════════════════════════════════════════════════════
   آیتم‌های ناوبری اختصاصی هر نقش
   ═══════════════════════════════════════════════════════════ */

interface RoleNavItem {
  key: PageKey;
  label: string;
  icon: React.ElementType;
  section: string;
}

const SUPER_MANAGER_NAV: RoleNavItem[] = [
  { key: 'dashboard', label: 'داشبورد کلان', icon: LayoutDashboard, section: 'اصلی' },
  { key: 'projects', label: 'مانیتورینگ پروژه‌ها', icon: FolderKanban, section: 'اصلی' },
  { key: 'reports', label: 'گزارشات مالی', icon: BarChart3, section: 'مالی' },
  { key: 'vendors', label: 'مدیریت تامین‌کنندگان', icon: Truck, section: 'مالی' },
  { key: 'invoices', label: 'تاییدات نهایی', icon: FileText, section: 'مالی' },
  { key: 'dues', label: 'سررسید پرداخت‌ها', icon: CalendarClock, section: 'مالی' },
  { key: 'users', label: 'کاربران', icon: Users, section: 'سیستم' },
  { key: 'settings', label: 'تنظیمات', icon: Settings, section: 'سیستم' },
];

const PROJECT_MANAGER_NAV: RoleNavItem[] = [
  { key: 'dashboard', label: 'میز کار پروژه', icon: LayoutDashboard, section: 'اصلی' },
  { key: 'invoices', label: 'تاییدات خرید', icon: FileText, section: 'عملیاتی' },
  { key: 'warehouse', label: 'ورودی‌های انبار', icon: Warehouse, section: 'عملیاتی' },
  { key: 'dues', label: 'سررسیدهای پروژه', icon: CalendarClock, section: 'عملیاتی' },
  { key: 'reports', label: 'گزارشات', icon: BarChart3, section: 'عملیاتی' },
];

const ADMIN_NAV: RoleNavItem[] = [
  { key: 'users', label: 'مدیریت کاربران و نقش‌ها', icon: Users, section: 'سیستم' },
  { key: 'permissions', label: 'ماتریس دسترسی', icon: Shield, section: 'سیستم' },
  { key: 'settings', label: 'تنظیمات پروژه‌ها', icon: Settings, section: 'سیستم' },
  { key: 'workflow', label: 'ورک‌فلو', icon: Settings, section: 'سیستم' },
  { key: 'dashboard', label: 'لاگ‌های سیستم', icon: LayoutDashboard, section: 'سیستم' },
];

function getRoleNavItems(role: string): RoleNavItem[] {
  switch (role) {
    case 'SUPER_MANAGER':
      return SUPER_MANAGER_NAV;
    case 'PROJECT_MANAGER':
      return PROJECT_MANAGER_NAV;
    case 'ADMIN':
      return ADMIN_NAV;
    default:
      // برای PURCHASER و WAREHOUSE_KEEPER از سیستم مبتنی بر مجوز استفاده می‌شود
      return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   انیمیشن آیتم‌های سایدبار (stagger)
   ═══════════════════════════════════════════════════════════ */

const sidebarItemVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
};

const sidebarStagger = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

/* ═══════════════════════════════════════════════════════════
   محتوای سایدبار
   ═══════════════════════════════════════════════════════════ */

export function SidebarContent({
  currentPage,
  onPageChange,
  collapsed = false,
  onNavigate,
}: SidebarProps) {
  const { session } = useAuth();
  const { activeRole } = useProject();
  const globalRole = (session?.user as any)?.role as string || 'WAREHOUSE_KEEPER';
  const role = activeRole || globalRole;
  const userName = session?.user?.name || 'کاربر';
  const theme = ROLE_THEME[role] || ROLE_THEME.SUPER_MANAGER;

  // دریافت آیتم‌های ناوبری بر اساس نقش
  const roleNavItems = getRoleNavItems(role);

  // اگر نقش لیست اختصاصی ندارد، از سیستم مبتنی بر مجوز استفاده کن
  const visibleItems: RoleNavItem[] = roleNavItems.length > 0
    ? roleNavItems
    : SIDEBAR_ITEMS
        .filter(item => hasPermission(role, item.permission as string))
        .map(item => ({
          key: item.key as PageKey,
          label: item.label,
          icon: ICON_MAP[item.icon] || FileText,
          section: item.section || 'اصلی',
        }));

  const handleNav = (key: PageKey) => {
    onPageChange(key);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── لوگو (raised card effect) ─── */}
      <div className={cn('px-4 pt-5 pb-4', collapsed && 'px-3 pt-4')}>
        <div className={cn(
          'flex items-center gap-3 p-2.5 rounded-2xl',
          'bg-white/10 backdrop-blur-sm',
          'shadow-[2px_2px_6px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.06)]'
        )}>
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl backdrop-blur-sm flex items-center justify-center',
            `bg-gradient-to-br ${theme.gradient}`
          )}>
            <HardHat className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-extrabold text-[15px] text-white tracking-tight">ساخت‌یار</h1>
              <p className="text-[10px] text-white/50 mt-0.5">{ROLE_LABELS[role]}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── اطلاعات کاربر (slight raised) ─── */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className={cn(
            'rounded-xl p-3',
            'bg-white/8',
            'shadow-[1px_1px_4px_rgba(0,0,0,0.18),-1px_-1px_4px_rgba(255,255,255,0.05)]'
          )}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">{userName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{userName}</p>
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-block',
                  ROLE_COLORS[role]
                )}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── آیتم‌های ناوبری ─── */}
      <ScrollArea className="flex-1 px-3 py-1">
        <motion.nav
          className="space-y-0.5"
          variants={sidebarStagger}
          initial="initial"
          animate="animate"
        >
          {visibleItems.map((item, index) => {
            const isActive = currentPage === item.key;

            // جداکننده بخش‌ها
            const showSectionLabel = index === 0 ||
              visibleItems[index - 1]?.section !== item.section;

            return (
              <React.Fragment key={item.key}>
                {/* عنوان بخش */}
                {showSectionLabel && !collapsed && (
                  <motion.div
                    className="flex items-center gap-2 px-2 pt-3 pb-1"
                    variants={sidebarItemVariants}
                  >
                    <span className="text-[10px] font-bold text-white/30 tracking-wide">{item.section}</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </motion.div>
                )}

                {/* آیتم ناوبری */}
                <motion.button
                  onClick={() => handleNav(item.key)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/15 text-white neu-nav-active'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90 neu-nav-item',
                    collapsed && 'justify-center px-2'
                  )}
                  dir="rtl"
                  variants={sidebarItemVariants}
                >
                  <item.icon className={cn(
                    'w-[18px] h-[18px] flex-shrink-0',
                    isActive && 'text-white',
                    collapsed && 'w-5 h-5'
                  )} />
                  {!collapsed && <span className="flex-1 text-right">{item.label}</span>}
                  {!collapsed && isActive && <Sparkles className="w-3.5 h-3.5 ms-auto opacity-60" />}
                </motion.button>
              </React.Fragment>
            );
          })}
        </motion.nav>
      </ScrollArea>

      {/* ─── دکمه خروج (raised button) ─── */}
      {!collapsed && (
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={cn(
              'w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium',
              'text-red-300 hover:bg-red-500/20 transition-all duration-200',
              'shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.05)]',
              'hover:shadow-[1px_1px_2px_rgba(0,0,0,0.15),-1px_-1px_2px_rgba(255,255,255,0.03)]',
              'active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]'
            )}
            dir="rtl"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>خروج از حساب</span>
          </button>
          <div className="flex items-center gap-2.5 text-xs text-white/40 mt-2 px-1" dir="rtl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>اتصال برقرار</span>
            <span className="ms-auto text-[10px]">v۱.۰.۰</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   سایدبار دسکتاپ
   ═══════════════════════════════════════════════════════════ */

interface DesktopSidebarProps extends SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function DesktopSidebar({
  currentPage,
  onPageChange,
  collapsed,
  onToggleCollapse,
}: DesktopSidebarProps) {
  const { session } = useAuth();
  const { activeRole } = useProject();
  const globalRole = (session?.user as any)?.role as string || 'WAREHOUSE_KEEPER';
  const role = activeRole || globalRole;
  const roleTheme = ROLE_THEME[role] || ROLE_THEME.SUPER_MANAGER;

  // نقش‌های موبایل‌محور سایدبار ندارند
  const isMobileFirstRole = role === 'PURCHASER' || role === 'WAREHOUSE_KEEPER';
  if (isMobileFirstRole) return null;

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col transition-all duration-300',
        roleTheme.sidebar,
        'w-[280px]'
      )}
    >
      <SidebarContent
        currentPage={currentPage}
        onPageChange={onPageChange}
        collapsed={false}
      />
    </aside>
  );
}
