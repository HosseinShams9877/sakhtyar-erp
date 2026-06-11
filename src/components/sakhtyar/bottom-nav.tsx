'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  Truck,
  CalendarClock,
  ScanBarcode,
  Package,
  AlertTriangle,
  ShoppingBag,ClipboardList
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   تایپ‌ها
   ═══════════════════════════════════════════════════════════ */

type PageKey = 'dashboard' | 'projects' | 'invoices' |'shortage' | 'dues' | 'vendors' | 'warehouse' | 'reports' | 'users' | 'permissions' | 'workflow' | 'settings' | 'materials';

interface BottomNavItem {
  key: PageKey;
  label: string;
  icon: React.ElementType;
  isAction?: boolean;
}

/* ═══════════════════════════════════════════════════════════
   آیتم‌های ناوبری پایین بر اساس نقش
   ═══════════════════════════════════════════════════════════ */

const PURCHASER_NAV: BottomNavItem[] = [
  { key: 'dashboard', label: 'خانه', icon: Home },
  { key: 'invoices', label: 'ثبت فاکتور', icon: FileText },
  { key: 'vendors', label: 'تامین‌کنندگان', icon: Truck },
  { key: 'dues', label: 'سررسیدها', icon: CalendarClock },
];

const WAREHOUSE_KEEPER_NAV: BottomNavItem[] = [
  { key: 'dashboard', label: 'میزکار', icon: Home },        // صفحه اصلی
  { key: 'shortage', label: 'ثبت کسری', icon: AlertTriangle, isAction: true }, // باز کردن دیالوگ
  { key: 'reports', label: 'گزارشات', icon: ClipboardList }, // صفحه گزارشات
];

/* ═══════════════════════════════════════════════════════════
   کامپوننت ناوبری پایین (موبایل)
   فقط برای نقش‌های PURCHASER و WAREHOUSE_KEEPER
   ═══════════════════════════════════════════════════════════ */

interface BottomNavProps {
  role: string;
  activePage: PageKey;
  onPageChange: (page: PageKey) => void;
  onShortageClick?: () => void;
}

export default function BottomNav({ role, activePage, onPageChange , onShortageClick  }: BottomNavProps) {
  // فقط برای نقش‌های مشخص‌شده نمایش داده شود (همیشه — این نقش‌ها سایدبار ندارند)
  if (role !== 'PURCHASER' && role !== 'WAREHOUSE_KEEPER') return null;

  const navItems = role === 'PURCHASER' ? PURCHASER_NAV : WAREHOUSE_KEEPER_NAV;
  const roleColor = role === 'PURCHASER' ? 'amber' : 'emerald';

  const handleClick = (item: BottomNavItem) => {
    if (item.key === 'shortage' && onShortageClick) {
      onShortageClick();
    } else {
      onPageChange(item.key);
    }
  };

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 mobile-bottom-nav lg:hidden"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      dir="rtl"
    >
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => handleClick(item)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] rounded-xl transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? cn(
                      'text-white font-bold',
                      roleColor === 'amber'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    )
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'scale-110 transition-transform')} />
              <span className={cn('text-[10px] font-semibold', isActive && 'text-white')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
