'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/rbac';
import {
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Phone,
  Search,
  XCircle,
  Plus,
  Camera,
  ScanBarcode,
  Scale,
  Truck,
  Key,
  Database,
  Monitor,
  ShoppingBag,
  FileText,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   انواع و ثابت‌ها
   ═══════════════════════════════════════════════════════════ */

interface QuickAccessItem {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  badge?: number;
  onClick?: () => void;
  massive?: boolean;
}

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

/* ═══════════════════════════════════════════════════════════
   کامپوننت کارت دسترسی سریع
   ═══════════════════════════════════════════════════════════ */

function QuickAccessCard({ item }: { item: QuickAccessItem }) {
  const Icon = item.icon;

  if (item.massive) {
    return (
      <motion.div variants={cardVariants} className="col-span-full">
        <button
          onClick={item.onClick}
          className={cn(
            'w-full neu-flat card-hover p-5 flex items-center gap-4 cursor-pointer group',
            'active:neu-pressed transition-all duration-200'
          )}
          dir="rtl"
        >
          <div className={cn(
            'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
            'group-hover:scale-110 transition-transform duration-300',
            item.gradient
          )}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 text-right">
            <h4 className="text-base font-extrabold">{item.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
          </div>
          <div className={cn(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center',
            item.gradient
          )}>
            <span className="text-white text-lg">←</span>
          </div>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div variants={cardVariants}>
      <button
        onClick={item.onClick}
        className={cn(
          'w-full neu-flat card-hover p-4 cursor-pointer group text-right',
          'active:neu-pressed transition-all duration-200'
        )}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center',
            'group-hover:scale-110 transition-transform duration-300',
            item.gradient
          )}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
              {toPersianDigits(item.badge)}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold">{item.title}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</p>
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   دسترسی سریع مدیر کل
   ═══════════════════════════════════════════════════════════ */

export function SuperManagerQuickAccess({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const items: QuickAccessItem[] = [
    {
      key: 'financial-export',
      title: 'خروجی فوری مالی',
      subtitle: 'دانلود گزارش اکسل',
      icon: FileSpreadsheet,
      gradient: 'from-emerald-500 to-green-600',
      onClick: () => onNavigate?.('reports'),
    },
    {
      key: 'batch-approve',
      title: 'تایید دسته‌ای پرداخت',
      subtitle: 'تایید گروهی فاکتورها',
      icon: CheckCircle2,
      gradient: 'from-blue-500 to-cyan-600',
      onClick: () => onNavigate?.('invoices'),
    },
    {
      key: 'emergency-lock',
      title: 'قفل اضطراری سیستم',
      subtitle: 'مسدودسازی موقت دسترسی',
      icon: Lock,
      gradient: 'from-red-500 to-rose-600',
      onClick: () => {},
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-3 gap-3 sm:gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => (
        <QuickAccessCard key={item.key} item={item} />
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   دسترسی سریع مدیر پروژه
   ═══════════════════════════════════════════════════════════ */

export function ProjectManagerQuickAccess({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const items: QuickAccessItem[] = [
    {
      key: 'emergency-purchase',
      title: 'درخواست خرید فوری',
      subtitle: 'ثبت سفارش اضطراری',
      icon: AlertTriangle,
      gradient: 'from-red-400 to-rose-500',
      onClick: () => onNavigate?.('invoices'),
    },
    {
      key: 'call-warehouse',
      title: 'تماس با انباردار',
      subtitle: 'تماس مستقیم',
      icon: Phone,
      gradient: 'from-blue-500 to-cyan-600',
      onClick: () => {},
    },
    {
      key: 'budget-deviation',
      title: 'گزارش انحراف بودجه',
      subtitle: 'مقایسه بودجه و هزینه',
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-orange-600',
      onClick: () => onNavigate?.('reports'),
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-3 gap-3 sm:gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => (
        <QuickAccessCard key={item.key} item={item} />
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   دسترسی سریع مسئول خرید
   ═══════════════════════════════════════════════════════════ */

export function PurchaserQuickAccess({ onNavigate, rejectedCount }: { onNavigate?: (key: string) => void; rejectedCount?: number }) {
  const items: QuickAccessItem[] = [
    {
      key: 'quick-price',
      title: 'بررسی سریع قیمت',
      subtitle: 'جستجوی قیمت مصالح',
      icon: Search,
      gradient: 'from-blue-500 to-cyan-600',
      onClick: () => onNavigate?.('vendors'),
    },
    {
      key: 'rejected-invoices',
      title: 'فاکتورهای ردشده',
      subtitle: 'لیست فاکتورهای رد شده',
      icon: XCircle,
      gradient: 'from-red-500 to-rose-600',
      badge: rejectedCount,
      onClick: () => onNavigate?.('invoices'),
    },
    {
      key: 'add-supplier',
      title: 'افزودن تامین‌کننده',
      subtitle: 'ثبت تامین‌کننده جدید',
      icon: Plus,
      gradient: 'from-amber-500 to-orange-600',
      onClick: () => onNavigate?.('vendors'),
    },
    {
      key: 'new-invoice',
      title: 'ثبت فاکتور جدید',
      subtitle: 'اسکن و ثبت فاکتور',
      icon: Camera,
      gradient: 'from-emerald-500 to-teal-600',
      massive: true,
      onClick: () => onNavigate?.('invoices'),
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => (
        <QuickAccessCard key={item.key} item={item} />
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   دسترسی سریع انباردار
   ═══════════════════════════════════════════════════════════ */

export function WarehouseKeeperQuickAccess({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const items: QuickAccessItem[] = [
    {
      key: 'scan-delivery',
      title: 'اسکن بارکد/QR تحویل',
      subtitle: 'ثبت تحویل با اسکنر',
      icon: ScanBarcode,
      gradient: 'from-emerald-500 to-teal-600',
      massive: true,
      onClick: () => onNavigate?.('warehouse'),
    },
    {
      key: 'weighbridge',
      title: 'ثبت رسید باسکول',
      subtitle: 'ثبت وزن تحویلی',
      icon: Scale,
      gradient: 'from-blue-500 to-cyan-600',
      onClick: () => onNavigate?.('warehouse'),
    },
    {
      key: 'cargo-shortage',
      title: 'گزارش کمبود محموله',
      subtitle: 'ثبت مغایرت وزنی',
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-amber-600',
      onClick: () => onNavigate?.('dashboard'),
    },
    {
      key: 'today-trucks',
      title: 'کامیون‌های امروز',
      subtitle: 'لیست محموله‌های در راه',
      icon: Truck,
      gradient: 'from-violet-500 to-purple-600',
      onClick: () => onNavigate?.('warehouse'),
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => (
        <QuickAccessCard key={item.key} item={item} />
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   دسترسی سریع ادمین
   ═══════════════════════════════════════════════════════════ */

export function AdminQuickAccess({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const items: QuickAccessItem[] = [
    {
      key: 'password-reset',
      title: 'بازنشانی سریع رمز',
      subtitle: 'تغییر رمز کاربران',
      icon: Key,
      gradient: 'from-red-500 to-rose-600',
      onClick: () => onNavigate?.('users'),
    },
    {
      key: 'manual-backup',
      title: 'بکاپ دستی',
      subtitle: 'تهیه نسخه پشتیبان',
      icon: Database,
      gradient: 'from-blue-500 to-cyan-600',
      onClick: () => {},
    },
    {
      key: 'active-sessions',
      title: 'نشست‌های فعال',
      subtitle: 'ردیابی نشست کاربران',
      icon: Monitor,
      gradient: 'from-violet-500 to-purple-600',
      onClick: () => onNavigate?.('dashboard'),
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-3 gap-3 sm:gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => (
        <QuickAccessCard key={item.key} item={item} />
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   کامپوننت اصلی — مسیریابی بر اساس نقش
   ═══════════════════════════════════════════════════════════ */

interface QuickAccessProps {
  role: string;
  onNavigate?: (key: string) => void;
  rejectedInvoiceCount?: number;
}

export default function QuickAccess({ role, onNavigate, rejectedInvoiceCount }: QuickAccessProps) {
  switch (role) {
    case 'SUPER_MANAGER':
      return <SuperManagerQuickAccess onNavigate={onNavigate} />;
    case 'PROJECT_MANAGER':
      return <ProjectManagerQuickAccess onNavigate={onNavigate} />;
    case 'PURCHASER':
      return <PurchaserQuickAccess onNavigate={onNavigate} rejectedCount={rejectedInvoiceCount} />;
    case 'WAREHOUSE_KEEPER':
      return <WarehouseKeeperQuickAccess onNavigate={onNavigate} />;
    case 'ADMIN':
      return <AdminQuickAccess onNavigate={onNavigate} />;
    default:
      return null;
  }
}
