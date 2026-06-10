'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useProject } from '@/components/project-context';
import { ROLE_LABELS, ROLE_COLORS, ROLE_THEME } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/sakhtyar/sidebar';
import ProjectSwitcher from '@/components/erp/project-switcher';
import NotificationPanel from '@/components/erp/notification-panel';
import {
  Menu,
  Moon,
  Sun,
  HardHat,
  LogOut,
  ChevronDown,
  Search,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';

/* ═══════════════════════════════════════════════════════════
   تایپ‌ها
   ═══════════════════════════════════════════════════════════ */

type PageKey = 'dashboard' | 'projects' | 'invoices' | 'dues' | 'vendors' | "shortage" | 'warehouse' | 'reports' | 'users' | 'permissions' | 'workflow' | 'settings' | 'materials';

interface HeaderProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  showSidebar?: boolean;
  sidebarGradient?: string;
}

/* ═══════════════════════════════════════════════════════════
   هدر اصلی
   ═══════════════════════════════════════════════════════════ */

export default function Header({ currentPage, onPageChange, showSidebar = true, sidebarGradient }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { session } = useAuth();
  const { activeRole } = useProject();
  const globalRole = (session?.user as any)?.role as string || 'WAREHOUSE_KEEPER';
  const role = activeRole || globalRole;
  const userName = session?.user?.name || 'کاربر';
  const roleTheme = ROLE_THEME[role] || ROLE_THEME.SUPER_MANAGER;
  const gradient = sidebarGradient || roleTheme.sidebar;

  // عنوان صفحه فعلی
  const pageLabels: Record<string, string> = {
    dashboard: role === 'SUPER_MANAGER' ? 'داشبورد کلان' :
               role === 'PROJECT_MANAGER' ? 'میز کار پروژه' :
               role === 'WAREHOUSE_KEEPER' ? 'مغایرت‌ها' :
               role === 'ADMIN' ? 'لاگ‌های سیستم' : 'داشبورد',
    projects: 'مانیتورینگ پروژه‌ها',
    invoices: role === 'SUPER_MANAGER' ? 'تاییدات نهایی' :
              role === 'PURCHASER' ? 'ثبت فاکتور' : 'تاییدات خرید',
    dues: 'سررسید پرداخت‌ها',
    vendors: role === 'SUPER_MANAGER' ? 'مدیریت تامین‌کنندگان' : 'تامین‌کنندگان من',
    warehouse: 'انبار',
    reports: 'گزارشات',
    users: 'کاربران',
    permissions: 'ماتریس دسترسی',
    workflow: 'ورک‌فلو',
    settings: 'تنظیمات',
    materials: 'مصالح',
  };
  const currentPageLabel = pageLabels[currentPage] || 'داشبورد';

  return (
    <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center justify-between px-3 sm:px-5" style={{ boxShadow: '0 4px 12px rgba(163, 177, 198, 0.2)' }}>
      {/* سمت راست: منوی موبایل + breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* منوی موبایل — فقط وقتی سایدبار وجود دارد */}
        {showSidebar && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden hover:bg-muted w-9 h-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className={cn('w-[280px] p-0', gradient)} dir="rtl">
              <SheetTitle className="sr-only">منوی ناوبری</SheetTitle>
              <SidebarContent
                currentPage={currentPage}
                onPageChange={onPageChange}
                onNavigate={() => {}}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* لوگو + breadcrumb */}
<div className="flex items-center gap-2 min-w-0 max-w-[120px]" dir="rtl">
  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', `bg-gradient-to-br ${roleTheme.gradient}`)}>
    <HardHat className="w-4 h-4 text-white" />
  </div>
  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
    <span>ساخت‌یار</span>
    <span className="text-border">/</span>
  </div>
  <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
  <h2 className="font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1">
    {currentPageLabel}
  </h2>
</div>
      </div>

      {/* نوار جستجو — نئومورفیک inset */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="neu-inset w-full flex items-center gap-2 px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="جستجوی فاکتور، تامین‌کننده، پروژه..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
            dir="rtl"
          />
        </div>
      </div>

      {/* سمت چپ: Project Switcher + اقدامات + نوتیفیکیشن + پروفایل */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* تعویض پروژه */}
        <ProjectSwitcher />

        <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />

        {/* تم */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-xl hover:bg-muted transition-colors"
          suppressHydrationWarning
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* زنگوله نوتیفیکیشن */}
        <NotificationPanel />

        {/* آواتار کاربر با نشان نقش */}
        <div className="relative">
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shadow-soft cursor-pointer flex-shrink-0',
            `bg-gradient-to-br ${roleTheme.gradient}`
          )}>
            <span className="text-xs font-bold text-white">{userName.charAt(0)}</span>
          </div>
          {/* نشان نقش */}
          <span className={cn(
            'absolute -bottom-1 -right-1 text-[7px] font-bold px-1 py-0 rounded-md leading-tight',
            ROLE_COLORS[role]
          )}>
            {ROLE_LABELS[role]?.split(' ')[0]}
          </span>
        </div>

        {/* نام کاربر */}
        <span className="hidden md:block text-xs font-medium text-muted-foreground max-w-[100px] truncate">{userName}</span>

        {/* دکمه خروج */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors hidden sm:flex"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
