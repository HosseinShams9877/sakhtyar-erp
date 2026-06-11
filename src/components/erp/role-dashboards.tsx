'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProject } from '@/components/project-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Crown, FolderKanban, ShoppingBag, WarehouseIcon,
  Wallet, AlertTriangle, CalendarClock, CheckCircle2,
  ChevronLeft, Truck, Building2, Plus, Search,
  Bell, BellRing, AlertCircle, AlertOctagon,
  CreditCard, Receipt, FileText, Clock,
  ArrowDownLeft, ArrowUpRight, PackageCheck,
  PackageX, ClipboardCheck, BarChart3, FileCheck2,
  TrendingUp, Users, Package, Timer, Shield, Settings,
  Camera, X, ClipboardList, ChevronsUpDown, Minus ,Loader2 
} from 'lucide-react';
import {
  formatNumber, formatCurrency, formatCurrencyShort,
  formatDate, formatDateShort, toPersianDigits,
  ROLE_COLORS, ROLE_LABELS, UNIT_LABELS
} from '@/lib/rbac';
import { toShamsi, fromShamsi } from '@/lib/persian';
import ShamsiDatePicker from '@/components/ui/shamsi-date-picker';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/* ═══════════════════════════════════════════════════════
   تایپ‌ها
   ═══════════════════════════════════════════════════════ */
interface AlertSummary {
  red: number; orange: number; yellow: number; green: number; total: number;
}

interface AlertAmounts {
  red: number; orange: number; yellow: number; green: number;
}

interface DebtSummary {
  totalDebt: number; todayDue: number; weekDue: number; overdue: number;
  totalPaid: number; totalPurchaseAmount: number;
}

interface Stats {
  activeProjects: number; totalProjects: number; totalSuppliers: number;
  totalPurchases: number; unpaidPurchases: number;
  activeUsers: number; totalUsers: number;
}

interface Vendor {
  id: string;
  companyName: string;
  contactName: string;
  projects?: { id: string }[];
}

interface PurchaseItem {
  id: string; invoiceNumber: string; totalAmount: number; paidAmount: number;
  remainingAmount: number; dueDate: string; purchaseDate: string;
  status: string; description: string | null;
  supplier: { id: string; companyName: string; contactName?: string; phone?: string };
  project: { id: string; name: string; location?: string };
  hasDelivery: boolean; itemsCount: number;
}

interface CreditorSupplier {
  id: string; companyName: string; contactName: string; phone: string;
  totalDebt: number; purchaseCount: number; overdueCount: number;
}

interface DebtorProject {
  id: string; name: string; location: string;
  totalDebt: number; purchaseCount: number; overdueCount: number;
}

interface DashboardData {
  alertSummary: AlertSummary;
  alertAmounts: AlertAmounts;
  debtSummary: DebtSummary;
  stats: Stats;
  urgentPurchases: { red: PurchaseItem[]; orange: PurchaseItem[]; yellow: PurchaseItem[] };
  creditorSuppliers: CreditorSupplier[];
  debtorProjects: DebtorProject[];
  duePaymentsChart: { date: string; pending: number; partial: number; overdue: number; total: number }[];
  vendorDebtChart: { vendor: string; amount: number; purchaseCount: number; overdueCount: number }[];
  recentPurchases: PurchaseItem[];
}

/* ═══════════════════════════════════════════════════════
   ثابت‌های رنگی هشدار
   ═══════════════════════════════════════════════════════ */
const ALERT_COLORS = {
  red: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', chart: '#ef4444', label: 'سررسید گذشته' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', chart: '#f97316', label: 'سررسید ≤ ۳ روز' },
  yellow: { bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', chart: '#f59e0b', label: 'سررسید ≤ ۷ روز' },
  green: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', chart: '#10b981', label: 'سررسید > ۷ روز' },
};

type AlertLevel = 'red' | 'orange' | 'yellow' | 'green';

/* ═══════════════════════════════════════════════════════
   هوک مشترک بارگذاری داده
   ═══════════════════════════════════════════════════════ */
   function useDashboardData() {
    const { activeProject , loading: projectLoading} = useProject(); 
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (projectLoading) return;
      async function loadData() {
        setLoading(true);
        try {
          // 👇 اضافه کردن projectId به URL
          const projectId = activeProject?.id;
          const url = projectId ? `/api/dashboard?projectId=${projectId}` : '/api/dashboard';
          const res = await fetch(url);
          const json = await res.json();
          if (!json.error) setData(json);
        } catch (err) {
          console.error('Dashboard load error:', err);
        } finally {
          setLoading(false);
        }
      }
      loadData();
    }, [activeProject?.id ,projectLoading]); 
  
    return { data, loading };
  }

// حفاظت از داده‌های نامعتبر urgentPurchases
function safeUrgentPurchases(up: DashboardData['urgentPurchases'] | undefined): { red: PurchaseItem[]; orange: PurchaseItem[]; yellow: PurchaseItem[] } {
  return { red: up?.red || [], orange: up?.orange || [], yellow: up?.yellow || [] };
}

/* ═══════════════════════════════════════════════════════
   اسکلتون بارگذاری
   ═══════════════════════════════════════════════════════ */
function DashboardSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6">
      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(cards)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   صفحه خطا
   ═══════════════════════════════════════════════════════ */
function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <AlertTriangle className="w-12 h-12 mb-4 text-amber-400" />
      <p className="text-lg font-bold">خطا در بارگذاری داده‌ها</p>
      <p className="text-sm mt-1">لطفاً صفحه را رفرش کنید</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   کارت آمار گرادیانت (مشترک)
   ═══════════════════════════════════════════════════════ */
function GradientStatCard({
  title, value, icon: Icon, subtitle, color, urgent, trend, delay = 0, isZero,
}: {
  title: string; value: string; icon: React.ElementType; subtitle: string;
  color: string; urgent?: boolean; trend?: 'up' | 'down' | null; delay?: number; isZero?: boolean;
}) {
  // وقتی مقدار صفر است، رنگ خنثی استفاده کن
  const effectiveColor = isZero
    ? 'from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700'
    : color;
  const effectiveUrgent = isZero ? false : urgent;
  const effectiveTrend = isZero ? null : trend;

  return (
    <Card
      className={cn(
        'border-0 overflow-hidden transition-all duration-300 animate-in-up neu-raised',
        effectiveUrgent && 'ring-2 ring-red-500/30',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-0">
        <div className={cn('bg-gradient-to-br p-4 sm:p-5 relative', effectiveColor)}>
          {/* Convex gradient overlay for 3D effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 rounded-t-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.3),inset_-1px_-1px_2px_rgba(0,0,0,0.1)]">
                <Icon className="w-5 h-5 text-white" />
              </div>
              {effectiveTrend && (
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                  effectiveTrend === 'up' ? 'bg-red-500/30 text-white' : 'bg-emerald-500/30 text-white'
                )}>
                  {effectiveTrend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                  {effectiveTrend === 'up' ? 'فوری' : 'خوب'}
                </div>
              )}
              {effectiveUrgent && !effectiveTrend && (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] font-bold text-white">فوری</span>
                </div>
              )}
              {isZero && (
                <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-white/70" />
                  <span className="text-[9px] font-bold text-white/70">بدون هشدار</span>
                </div>
              )}
            </div>
            <p className="text-white/70 text-[11px] font-medium mb-1">{title}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight neu-text-embossed">{value}</p>
            <p className="text-white/50 text-[10px] mt-1.5">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   آیتم خرید فوری (مشترک)
   ═══════════════════════════════════════════════════════ */
function UrgentPurchaseItem({ purchase, level }: { purchase: PurchaseItem; level: AlertLevel }) {
  const colors = ALERT_COLORS[level];
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-soft-sm',
      colors.light, colors.border,
    )}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors.bg)}>
        {level === 'red' ? <AlertOctagon className="w-5 h-5 text-white" /> :
         level === 'orange' ? <AlertCircle className="w-5 h-5 text-white" /> :
         <Bell className="w-5 h-5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold truncate">{purchase.supplier?.companyName || '—'}</p>
          <span className={cn('text-xs font-bold flex-shrink-0', colors.text)}>
            {formatCurrencyShort(purchase.remainingAmount)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground truncate">{purchase.project?.name || '—'}</span>
          <span className="text-[11px] text-muted-foreground">•</span>
          <span className={cn('text-[11px] font-semibold', colors.text)}>سررسید: {formatDateShort(purchase.dueDate)}</span>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   ۱. SuperManagerDashboard — مدیر کل
   دید کامل مالی/مدیریتی: بدهی، سررسید، هشدار، تامین‌کنندگان طلبکار
   ═══════════════════════════════════════════════════════════════════════════ */
export function SuperManagerDashboard() {
  const { data, loading } = useDashboardData();

  if (loading) return <DashboardSkeleton cards={4} />;
  if (!data) return <ErrorState />;

  const { debtSummary, alertSummary, alertAmounts, stats, urgentPurchases: _urgentPurchases, creditorSuppliers, recentPurchases, duePaymentsChart } = data;
  const urgentPurchases = safeUrgentPurchases(_urgentPurchases);
  const paymentProgress = debtSummary.totalPurchaseAmount > 0
    ? Math.round((debtSummary.totalPaid / debtSummary.totalPurchaseAmount) * 100)
    : 0;

  // داده‌های چارت بودجه vs هزینه
  const chartData = (duePaymentsChart || []).slice(0, 6);
  const maxChartValue = Math.max(...chartData.map(d => d.total || 0), 1);

  // ترکیب فاکتورهای سررسید‌شده برای جدول
  const invoiceTableData = [
    ...urgentPurchases.red.map(p => ({ ...p, severity: 'red' as const })),
    ...urgentPurchases.orange.map(p => ({ ...p, severity: 'orange' as const })),
  ].slice(0, 8);

  // داده‌های مصالح (استاتیک نمایشی)
  const materialsData = [
    { name: 'مصالح در دسترس', count: stats.totalPurchases - stats.unpaidPurchases, color: 'border-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', dot: 'bg-emerald-500', percent: stats.totalPurchases > 0 ? Math.round(((stats.totalPurchases - stats.unpaidPurchases) / stats.totalPurchases) * 100) : 0 },
    { name: 'مصالح کمبود', count: Math.max(stats.unpaidPurchases - alertSummary.red, 0), color: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/30', dot: 'bg-red-500', percent: stats.totalPurchases > 0 ? Math.round((Math.max(stats.unpaidPurchases - alertSummary.red, 0) / stats.totalPurchases) * 100) : 0 },
    { name: 'مصالح سفارش‌شده', count: alertSummary.red, color: 'border-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', dot: 'bg-amber-500', percent: stats.totalPurchases > 0 ? Math.round((alertSummary.red / stats.totalPurchases) * 100) : 0 },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ═══ هدر ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center">
              <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight neu-text-embossed">داشبورد مدیریت</h2>
          </div>
          <p className="text-sm text-muted-foreground mr-12">
            نمای کلی مالی و مدیریتی سامانه
          </p>
        </div>
      </div>

      {/* ═══ ردیف KPI: ۴ کارت گرادیانت ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <GradientStatCard
          title="مجموع بدهی"
          value={formatCurrencyShort(debtSummary.totalDebt)}
          icon={Wallet}
          subtitle={`${toPersianDigits(alertSummary.total)} فاکتور باز`}
          color="from-violet-600 to-indigo-700"
          isZero={debtSummary.totalDebt === 0}
          delay={0}
        />
        <GradientStatCard
          title="سررسید گذشته"
          value={formatCurrencyShort(debtSummary.overdue)}
          icon={AlertTriangle}
          subtitle={`${toPersianDigits(alertSummary.red)} فاکتور معوقه`}
          color="from-red-500 to-rose-600"
          urgent={debtSummary.overdue > 0}
          trend={debtSummary.overdue > 0 ? 'up' : null}
          isZero={debtSummary.overdue === 0}
          delay={75}
        />
        <GradientStatCard
          title="پرداخت‌شده"
          value={formatCurrencyShort(debtSummary.totalPaid)}
          icon={CheckCircle2}
          subtitle={`${toPersianDigits(paymentProgress)}٪ تکمیل`}
          color="from-emerald-500 to-teal-600"
          isZero={debtSummary.totalPaid === 0}
          trend={debtSummary.totalPaid > 0 ? 'down' : null}
          delay={150}
        />
        <GradientStatCard
          title="بدهی هفته"
          value={formatCurrencyShort(debtSummary.weekDue)}
          icon={CalendarClock}
          subtitle="سررسید ۷ روز آینده"
          color="from-amber-500 to-orange-600"
          isZero={debtSummary.weekDue === 0}
          delay={225}
        />
      </div>

      {/* ═══ چارت بودجه vs هزینه + وضعیت مصالح ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* چارت بودجه vs هزینه */}
        <Card className="border-0 animate-in-up lg:col-span-3 neu-card overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-bold neu-text-embossed">بودجه vs هزینه</CardTitle>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                  <span className="text-muted-foreground">سررسید</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-muted-foreground">پرداخت جزئی</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                  <span className="text-muted-foreground">معوقه</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="space-y-3">
                {chartData.map((item, idx) => {
                  const totalWidth = Math.max((item.total / maxChartValue) * 100, 2);
                  const pendingWidth = item.total > 0 ? Math.max((item.pending / item.total) * 100, 0) : 0;
                  const partialWidth = item.total > 0 ? Math.max((item.partial / item.total) * 100, 0) : 0;
                  const overdueWidth = item.total > 0 ? Math.max((item.overdue / item.total) * 100, 0) : 0;
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground neu-text-inset">{formatDateShort(item.date)}</span>
                        <span className="text-[11px] font-bold">{formatCurrencyShort(item.total)}</span>
                      </div>
                      <div className="h-7 rounded-lg neu-inset overflow-hidden relative">
                        <div className="absolute inset-0 flex" style={{ direction: 'ltr' }}>
                          {item.overdue > 0 && (
                            <div
                              className="bg-gradient-to-l from-red-400 to-red-300 dark:from-red-600 dark:to-red-500 transition-all duration-500 group-hover:opacity-90"
                              style={{ width: `${overdueWidth}%` }}
                            />
                          )}
                          {item.pending > 0 && (
                            <div
                              className="bg-gradient-to-l from-violet-500 to-violet-400 dark:from-violet-600 dark:to-violet-500 transition-all duration-500 group-hover:opacity-90"
                              style={{ width: `${pendingWidth}%` }}
                            />
                          )}
                          {item.partial > 0 && (
                            <div
                              className="bg-gradient-to-l from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500 transition-all duration-500 group-hover:opacity-90"
                              style={{ width: `${partialWidth}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">داده‌ای برای نمایش وجود ندارد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* وضعیت مصالح */}
        <Card className="border-0 animate-in-up lg:col-span-2 neu-card overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-bold neu-text-embossed">وضعیت مصالح</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {toPersianDigits(stats.totalPurchases)} مورد
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {materialsData.map((mat, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-3 rounded-xl neu-inset border-r-4 transition-all duration-200 hover:translate-y-[-1px]',
                  mat.color,
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', mat.dot)} />
                    <span className="text-xs font-bold">{mat.name}</span>
                  </div>
                  <span className="text-sm font-extrabold">{toPersianDigits(mat.count)}</span>
                </div>
                <div className="h-2 rounded-full neu-progress-track overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', mat.dot)}
                    style={{ width: `${Math.max(mat.percent, 2)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-left" dir="ltr">
                  {toPersianDigits(mat.percent)}٪
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ═══ جدول سررسید فاکتورها ═══ */}
      <Card className="border-0 animate-in-up neu-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-bold neu-text-embossed">جدول سررسید فاکتورها</CardTitle>
            </div>
            <Link href="/dues">
              <Button variant="ghost" size="sm" className="text-xs gap-1 rounded-lg neu-btn">
                مشاهده همه
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <CardDescription className="text-[11px]">فاکتورهای سررسید‌شده و نزدیک به سررسید</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceTableData.length > 0 ? (
            <div className="overflow-x-auto">
              {/* سرستون */}
              <div className="grid grid-cols-6 gap-2 px-3 py-2 text-[10px] font-bold text-muted-foreground border-b border-border/40 mb-1">
                <span>شماره</span>
                <span>تامین‌کننده</span>
                <span>مبلغ</span>
                <span>سررسید</span>
                <span>وضعیت</span>
                <span>اقدام</span>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                {invoiceTableData.map((invoice, idx) => {
                  const colors = ALERT_COLORS[invoice.severity];
                  return (
                    <div
                      key={invoice.id}
                      className={cn(
                        'grid grid-cols-6 gap-2 items-center px-3 py-2.5 rounded-xl transition-all duration-200',
                        idx % 2 === 0 ? 'neu-raised' : 'neu-inset',
                      )}
                    >
                      <span className="text-[11px] font-bold truncate">{toPersianDigits(invoice.invoiceNumber || '—')}</span>
                      <span className="text-[11px] truncate">{invoice.supplier?.companyName || '—'}</span>
                      <span className="text-[11px] font-bold">{formatCurrencyShort(invoice.remainingAmount)}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDateShort(invoice.dueDate)}</span>
                      <div>
                        <Badge className={cn('text-[9px] px-1.5 py-0', colors.bg, 'text-white border-0')}>
                          {colors.label}
                        </Badge>
                      </div>
                      <Link href="/dues">
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 rounded-lg">
                          جزئیات
                          <ChevronLeft className="w-3 h-3 mr-0.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
              <p className="text-sm font-medium">بدون فاکتور سررسید‌شده</p>
              <p className="text-[11px] mt-1">همه فاکتورها در موعد هستند</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ هشدارهای فوری + تامین‌کنندگان طلبکار ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* هشدارهای فوری */}
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <CardTitle className="text-sm font-bold neu-text-embossed">هشدارهای فوری</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {urgentPurchases.red.length > 0 && (
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
                <Badge variant="secondary" className="text-[10px]">
                  {toPersianDigits(urgentPurchases.red.length + urgentPurchases.orange.length)} هشدار
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {[...urgentPurchases.red, ...urgentPurchases.orange].slice(0, 7).map((purchase) => {
                const isRed = urgentPurchases.red.some(p => p.id === purchase.id);
                const level = isRed ? 'red' : 'orange';
                const colors = ALERT_COLORS[level];
                return (
                  <div
                    key={purchase.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:translate-y-[-1px]',
                      'border-r-4',
                      isRed ? 'border-r-red-500' : 'border-r-orange-500',
                    )}
                    style={{
                      boxShadow: isRed
                        ? 'inset 3px 0 6px -2px rgba(239,68,68,0.2)'
                        : 'inset 3px 0 6px -2px rgba(249,115,22,0.2)',
                    }}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 neu-raised',
                    )}>
                      {isRed ? (
                        <AlertOctagon className="w-4 h-4 text-red-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate">{purchase.supplier?.companyName || '—'}</p>
                        <Badge className={cn('text-[9px] px-1.5 py-0 border-0 neu-raised', colors.bg, 'text-white')}>
                          {colors.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground truncate">{purchase.project?.name || '—'}</span>
                        <span className={cn('text-[11px] font-bold flex-shrink-0', colors.text)}>
                          {formatCurrencyShort(purchase.remainingAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {urgentPurchases.red.length === 0 && urgentPurchases.orange.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
                  <p className="text-sm font-medium">بدون هشدار فوری</p>
                  <p className="text-[11px] mt-1">همه چیز تحت کنترل است!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* تامین‌کنندگان طلبکار (Top 5) */}
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-bold neu-text-embossed">تامین‌کنندگان طلبکار</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {toPersianDigits(creditorSuppliers.length)} تامین‌کننده
              </Badge>
            </div>
            <CardDescription className="text-[11px]">۵ تامین‌کننده با بیشترین بدهی معلق</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin">
              {creditorSuppliers.slice(0, 5).map((supplier, idx) => (
                <div
                  key={supplier.id}
                  className="flex items-center gap-3 p-3 rounded-xl neu-convex-premium transition-all duration-200"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white',
                    idx === 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                    idx === 1 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                    idx === 2 ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                    'bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-600',
                  )}>
                    {toPersianDigits(idx + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold truncate">{supplier.companyName}</p>
                      <span className="text-sm font-extrabold text-destructive flex-shrink-0">
                        {formatCurrencyShort(supplier.totalDebt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {toPersianDigits(supplier.purchaseCount)} فاکتور
                      </span>
                      {supplier.overdueCount > 0 && (
                        <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0 border-0 neu-raised">
                          {toPersianDigits(supplier.overdueCount)} معوقه
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {creditorSuppliers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">تامین‌کننده طلبکاری یافت نشد</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ درخواست‌های تایید اخیر ═══ */}
      {recentPurchases && recentPurchases.filter(p => p.status === 'pending' || p.status === 'submitted').length > 0 && (
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4 text-amber-500" />
                </div>
                <CardTitle className="text-sm font-bold neu-text-embossed">درخواست‌های تایید اخیر</CardTitle>
              </div>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="text-xs gap-1 rounded-lg neu-btn">
                  مشاهده همه
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-[11px]">فاکتورهایی که نیاز به تایید دارند</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {recentPurchases
                .filter(p => p.status === 'pending' || p.status === 'submitted')
                .slice(0, 6)
                .map(purchase => (
                  <div
                    key={purchase.id}
                    className="flex items-center gap-3 p-3 rounded-xl border-r-4 border-r-amber-500 bg-amber-50/40 dark:bg-amber-950/20 transition-all duration-200 hover:translate-y-[-1px] neu-convex-premium"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 neu-raised">
                      <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate">{purchase.supplier?.companyName || '—'}</p>
                        <Badge className="text-[9px] bg-amber-500 text-white px-1.5 py-0 border-0 neu-raised">
                          نیاز به تایید
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground truncate">{purchase.project?.name || '—'}</span>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          {formatCurrencyShort(purchase.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── خریدهای فوری مدیر کل (تب‌دار) ─── */
function SuperManagerUrgentPurchases({ urgentPurchases }: { urgentPurchases: DashboardData['urgentPurchases'] }) {
  const [activeTab, setActiveTab] = useState<AlertLevel>('red');
  const tabs: { level: AlertLevel; icon: React.ElementType }[] = [
    { level: 'red', icon: AlertOctagon },
    { level: 'orange', icon: AlertCircle },
    { level: 'yellow', icon: Bell },
  ];
  const items = urgentPurchases[activeTab] || [];

  return (
    <Card className="border-0 animate-in-up overflow-hidden neu-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <CardTitle className="text-sm font-bold">خریدهای فوری</CardTitle>
          </div>
          <div className="flex gap-1.5">
            {tabs.map(tab => (
              <button
                key={tab.level}
                onClick={() => setActiveTab(tab.level)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200',
                  activeTab === tab.level
                    ? cn(ALERT_COLORS[tab.level].light, ALERT_COLORS[tab.level].text, ALERT_COLORS[tab.level].border, 'border')
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {toPersianDigits(urgentPurchases[tab.level]?.length || 0)}
              </button>
            ))}
          </div>
        </div>
        <CardDescription className="text-[11px]">{ALERT_COLORS[activeTab].label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin">
          {items.map(purchase => (
            <UrgentPurchaseItem key={purchase.id} purchase={purchase} level={activeTab} />
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
              <p className="text-sm font-medium">بدون هشدار در این سطح</p>
              <p className="text-[11px] mt-1">همه چیز تحت کنترل است!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



/* ═══════════════════════════════════════════════════════════════════════════
   ۲. ProjectManagerDashboard — مدیر پروژه
   دید محدوده به پروژه‌های اختصاص‌یافته: بدهی، سررسید، تایید
   ═══════════════════════════════════════════════════════════════════════════ */
   let _rowKeyCounter = 0;
function newRowKey(): string {
  return `row-${Date.now()}-${++_rowKeyCounter}`;
}

function createEmptyItemRow(): InvoiceItemRow {
  return {
    _key: newRowKey(),
    materialId: undefined,
    materialName: '',
    unit: 'KILOGRAM',
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
  };
}

interface InvoiceItemRow {
  _key: string;
  materialId?: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  projectId?: string;
}

export function ProjectManagerDashboard() {
  // ✅ 1. همه هوک‌ها اینجا باشند
  const { data, loading } = useDashboardData();
  const { activeProject, loading: projectLoading } = useProject();
  const [shortageRequests, setShortageRequests] = useState<any[]>([]);
  const [loadingShortages, setLoadingShortages] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [paidNotDelivered, setPaidNotDelivered] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // گرفتن درخواست‌های کسری
  const fetchShortageRequests = useCallback(async () => {
    setLoadingShortages(true);
    try {
      const projectId = activeProject?.id || '';
      const res = await fetch(`/api/shortage-requests?status=pending${projectId ? `&projectId=${projectId}` : ''}`);
      const result = await res.json();
      if (result.success) {
        setShortageRequests(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching shortage requests:', error);
    } finally {
      setLoadingShortages(false);
    }
  }, [activeProject?.id]);

  const fetchPaidNotDelivered = useCallback(async () => {
    setLoadingDeliveries(true);
    try {
      const projectId = activeProject?.id || '';
      const res = await fetch(`/api/deliveries?pending=true&projectId=${projectId}`);
      const data = await res.json();
      setPaidNotDelivered(data.deliveries || []);
    } catch (error) {
      console.error('Error fetching pending deliveries:', error);
    } finally {
      setLoadingDeliveries(false);
    }
  }, [activeProject?.id]);
  useEffect(() => {
    fetchPaidNotDelivered();
  }, [fetchPaidNotDelivered]);
  // تابع تایید درخواست کسری
  const handleApproveShortage = useCallback(async (requestId: string) => {
    setApprovingId(requestId);
    try {
      const res = await fetch('/api/shortage-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status: 'approved',
        }),
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success('درخواست کسری تایید شد');
        fetchShortageRequests();
      } else {
        toast.error(result.error || 'خطا در تایید');
      }
    } catch (error) {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setApprovingId(null);
    }
  }, [fetchShortageRequests]);

  useEffect(() => {
    fetchShortageRequests();
  }, [fetchShortageRequests]);

  // ✅ 2. بعد از همه هوک‌ها، شرط‌های return بیایند
  if (loading) return <DashboardSkeleton cards={3} />;
  if (!data) return <ErrorState />;

  const { debtSummary, alertSummary, urgentPurchases: _urgentPurchases, debtorProjects, stats, recentPurchases } = data;
  const urgentPurchases = safeUrgentPurchases(_urgentPurchases);
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* هدر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-5 h-5 text-primary" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">داشبورد پروژه</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            وضعیت بدهی و سررسید پروژه‌های شما
          </p>
        </div>
      </div>

      {/* کارت‌های آمار بدهی پروژه */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <GradientStatCard
          title="بدهی پروژه‌های شما"
          value={formatCurrencyShort(debtSummary.totalDebt)}
          icon={Wallet}
          subtitle={`${toPersianDigits(stats.activeProjects)} پروژه فعال`}
          color="from-violet-600 to-indigo-700"
          isZero={debtSummary.totalDebt === 0}
          delay={0}
        />
        <GradientStatCard
          title="سررسید گذشته"
          value={formatCurrencyShort(debtSummary.overdue)}
          icon={AlertTriangle}
          subtitle={`${toPersianDigits(alertSummary.red)} فاکتور معوقه`}
          color="from-red-500 to-rose-600"
          urgent={debtSummary.overdue > 0}
          trend={debtSummary.overdue > 0 ? 'up' : null}
          isZero={debtSummary.overdue === 0}
          delay={75}
        />
        <GradientStatCard
          title="بدهی این هفته"
          value={formatCurrencyShort(debtSummary.weekDue)}
          icon={CalendarClock}
          subtitle="سررسید ۷ روز آینده"
          color="from-amber-500 to-orange-600"
          isZero={debtSummary.weekDue === 0}
          delay={150}
        />
      </div>

      {/* پروژه‌های بدهکار + خریدهای فوری */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* پروژه‌های بدهکار */}
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold">پروژه‌های شما</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {toPersianDigits(debtorProjects.length)} پروژه
              </Badge>
            </div>
            <CardDescription className="text-[11px]">وضعیت بدهی هر پروژه</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
              {debtorProjects.slice(0, 6).map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-200 hover:shadow-soft-sm',
                    project.overdueCount > 0
                      ? 'bg-red-50/50 border-red-200/60 dark:bg-red-950/20 dark:border-red-800/40'
                      : 'bg-muted/30 border-border/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderKanban className="w-4 h-4 text-primary flex-shrink-0" />
                      <p className="text-sm font-bold truncate">{project.name}</p>
                    </div>
                    {project.overdueCount > 0 && (
                      <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0 flex-shrink-0">
                        {toPersianDigits(project.overdueCount)} معوقه
                      </Badge>
                    )}
                  </div>
                  {project.location && (
                    <p className="text-[11px] text-muted-foreground mb-3">{project.location}</p>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-muted-foreground">{toPersianDigits(project.purchaseCount)} فاکتور</span>
                    <span className="text-sm font-extrabold text-destructive">{formatCurrencyShort(project.totalDebt)}</span>
                  </div>
                  {/* نوار پیشرفت ساده */}
                  <Progress
                    value={project.purchaseCount > 0 ? Math.max(5, 100 - (project.overdueCount / project.purchaseCount) * 100) : 100}
                    className="h-1.5 neu-progress-track"
                  />
                </div>
              ))}
              {debtorProjects.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">پروژه بدهکاری یافت نشد</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* خریدهای فوری پروژه */}
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <CardTitle className="text-sm font-bold">خریدهای فوری پروژه‌ها</CardTitle>
            </div>
            <CardDescription className="text-[11px]">فاکتورهای سررسید‌شده و نزدیک به سررسید</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-96 overflow-y-auto scrollbar-thin">
              {[...urgentPurchases.red, ...urgentPurchases.orange].slice(0, 8).map(purchase => (
                <UrgentPurchaseItem
                  key={purchase.id}
                  purchase={purchase}
                  level={urgentPurchases.red.some(p => p.id === purchase.id) ? 'red' : 'orange'}
                />
              ))}
              {urgentPurchases.red.length === 0 && urgentPurchases.orange.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
                  <p className="text-sm font-medium">بدون هشدار فوری</p>
                  <p className="text-[11px] mt-1">همه چیز تحت کنترل است!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* خریدهای نیازمند تایید + تحویل‌های در انتظار */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* خریدهای نیازمند تایید */}
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-bold">نیازمند تایید شما</CardTitle>
            </div>
            <CardDescription className="text-[11px]">خریدهایی که نیاز به تایید مدیر پروژه دارند</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
              {[...urgentPurchases.red, ...urgentPurchases.orange, ...urgentPurchases.yellow]
                .filter(p => p.status === 'pending' || p.status === 'submitted')
                .slice(0, 5)
                .map(purchase => (
                  <div
                    key={purchase.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-500">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{purchase.supplier?.companyName || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{purchase.project?.name || '—'}</span>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{formatCurrencyShort(purchase.remainingAmount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              {[...urgentPurchases.red, ...urgentPurchases.orange, ...urgentPurchases.yellow]
                .filter(p => p.status === 'pending' || p.status === 'submitted').length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">موردی برای تایید وجود ندارد</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* درخواست‌های کسری مصالح */}
<Card className="border-0 animate-in-up overflow-hidden neu-card">
  <CardHeader className="pb-3">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-orange-500" />
      <CardTitle className="text-sm font-bold">درخواست‌های کسری مصالح</CardTitle>
    </div>
    <CardDescription className="text-[11px]">درخواست‌های انبار برای تامین مجدد</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
      {shortageRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          درخواست کسری جدیدی وجود ندارد
        </div>
      ) : (
        shortageRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-orange-200/60 dark:border-orange-800/40 bg-orange-50/40 dark:bg-orange-950/20"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-500">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{request.materialName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    مقدار: {toPersianDigits(request.quantity)} {request.unit === 'KILOGRAM' ? 'کیلوگرم' : request.unit === 'TON' ? 'تن' : request.unit === 'SQUARE_METER' ? 'متر مربع' : 'عدد'}
                  </span>
                  <Badge className={`text-[9px] ${
                    request.priority === 'high' ? 'bg-red-100 text-red-700' :
                    request.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {request.priority === 'high' ? 'فوری' : request.priority === 'medium' ? 'متوسط' : 'عادی'}
                  </Badge>
                </div>
                {request.note && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    یادداشت: {request.note}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={() => handleApproveShortage(request.id)}
              disabled={approvingId === request.id}
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-4 py-1.5 text-xs font-bold shrink-0"
            >
              {approvingId === request.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'تایید'
              )}
            </Button>
          </div>
        ))
      )}
    </div>
  </CardContent>
</Card>

   {/* تحویل‌های در انتظار تایید */}
<Card className="border-0 animate-in-up overflow-hidden neu-card">
  <CardHeader className="pb-3">
    <div className="flex items-center gap-2">
      <PackageCheck className="w-4 h-4 text-emerald-500" />
      <CardTitle className="text-sm font-bold">تحویل‌های در انتظار تایید</CardTitle>
    </div>
    <CardDescription className="text-[11px]">
      فاکتورهایی که پرداخت شده و منتظر تحویل هستند
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
      {loadingDeliveries ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : paidNotDelivered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          فاکتور پرداخت شده‌ای در انتظار تحویل نیست
        </div>
      ) : (
        paidNotDelivered.map((delivery) => (
          <div
            key={delivery.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-500">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{delivery.supplierName || '—'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  فاکتور شماره: {toPersianDigits(delivery.invoiceNumber)}
                </span>
                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0">
                  پرداخت شده
                </Badge>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </CardContent>
</Card>
      </div>
    </div>
  );
}




 /* ═══════════════════════════════════════════════════════════════════════════
   ۳. PurchaserDashboard — مسئول خرید
   ═══════════════════════════════════════════════════════════════════════════ */
   export function PurchaserDashboard() {
    const { data, loading } = useDashboardData();
   
    const [supplierSearch, setSupplierSearch] = useState('');
    const [currentShortageRequestId, setCurrentShortageRequestId] = useState<string | null>(null);
    const [showQuickForm, setShowQuickForm] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
    const [items, setItems] = useState<InvoiceItemRow[]>([createEmptyItemRow()]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [openPopover, setOpenPopover] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);
    const [deliveryCount, setDeliveryCount] = useState(0);
    const [correctiveCount, setCorrectiveCount] = useState(0);
    const [newSuppliersCount, setNewSuppliersCount] = useState(0);
    const [approvedShortages, setApprovedShortages] = useState<any[]>([]);
    const [loadingApproved, setLoadingApproved] = useState(false)
    const { activeProject, projects, loading: projectLoading } = useProject(); 
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [quickFormData, setQuickFormData] = useState({
      invoiceNumber: "",
      amount: '',
      dueDate: toShamsi(new Date()),
      projectId: '',
      vendorId: '',
      imageFile: null as File | null,  
      imagePreview: null as string | null,
    });
    const loadMaterialsForProject = useCallback(async (projectId: string) => {
      if (!projectId) {
        setMaterials([]);
        return;
      }
      try {
        const res = await fetch(`/api/materials?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setMaterials(data.materials || []);
        }
      } catch (error) {
        console.error('Error loading materials:', error);
      }
    }, []);
  
    const filteredSuppliers = useCallback(() => {
      // اگر پروژه فعال وجود داره، از filteredVendors استفاده کن
      if (activeProject?.id && filteredVendors.length > 0) {
        const q = supplierSearch.trim();
        if (!q) return filteredVendors.slice(0, 5);
        return filteredVendors
          .filter(s => s.companyName.includes(q) || s.contactName.includes(q))
          .slice(0, 5);
      }
      
      // اگر پروژه فعال نیست یا filteredVendors خالیه، از creditorSuppliers استفاده کن
      if (!data?.creditorSuppliers) return [];
      const q = supplierSearch.trim();
      if (!q) return data.creditorSuppliers.slice(0, 5);
      return data.creditorSuppliers
        .filter(s => s.companyName.includes(q) || s.contactName.includes(q))
        .slice(0, 5);
    }, [data, supplierSearch, activeProject?.id, filteredVendors]);

    const handleQuickImageSelect = (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم فایل نباید بیشتر از ۵ مگابایت باشد');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('لطفاً فقط فایل تصویری انتخاب کنید');
        return;
      }
      setQuickFormData(prev => ({ 
        ...prev, 
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
    };
    
    const handleQuickImageRemove = () => {
      if (quickFormData.imagePreview) {
        URL.revokeObjectURL(quickFormData.imagePreview);
      }
      setQuickFormData(prev => ({ 
        ...prev, 
        imageFile: null,
        imagePreview: null
      }));
    };
  
    const fetchApprovedShortages = useCallback(async () => {
      setLoadingApproved(true);
      try {
        const projectId = activeProject?.id || '';
        const res = await fetch(`/api/shortage-requests?status=approved${projectId ? `&projectId=${projectId}` : ''}`);
        const result = await res.json();
        if (result.success) {
          setApprovedShortages(result.data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingApproved(false);
      }
    }, [activeProject?.id]);
  
    // ========== همه useEffectها ==========
    // گرفتن تعداد واقعی فاکتورهای در انتظار (pending)
    useEffect(() => {
      if (projectLoading) return; 
      if (!activeProject?.id && projects.length === 0) {
        return;
      }
      const projectId = activeProject?.id || '';
      const url = `/api/invoices?status=pending${projectId ? `&projectId=${projectId}` : ''}&pageSize=1`;
      fetch(url)
        .then(res => res.json())
        .then(data => setPendingCount(data.total || 0))
        .catch(() => setPendingCount(0));
    }, [activeProject?.id, projects.length ,projectLoading]);
  
    // گرفتن تعداد رسیدهای تحویل
    useEffect(() => {
      fetch('/api/deliveries')
        .then(res => res.json())
        .then(data => {
          const deliveries = Array.isArray(data) ? data : (data?.deliveries || []);
          setDeliveryCount(deliveries.length);
        })
        .catch(() => setDeliveryCount(0));
    }, []);
  
    // گرفتن تعداد فاکتورهای اصلاحی
    useEffect(() => {
      if (projectLoading) return;
      const projectId = activeProject?.id || '';
      const url = `/api/invoices?type=corrective${projectId ? `&projectId=${projectId}` : ''}&pageSize=1`;
      fetch(url)
        .then(res => res.json())
        .then(data => setCorrectiveCount(data.total || 0))
        .catch(() => setCorrectiveCount(0));
    }, [activeProject?.id,projectLoading]);
  
    // گرفتن تعداد تامین‌کنندگان جدید (فعال)
    useEffect(() => {
      fetch('/api/vendors?isActive=true')
        .then(res => res.json())
        .then(data => {
          const vendors = Array.isArray(data) ? data : (data?.vendors || []);
          setNewSuppliersCount(vendors.length);
        })
        .catch(() => setNewSuppliersCount(0));
    }, []);
  
useEffect(() => {
  if (activeProject?.id) {
    fetch(`/api/vendors?projectId=${activeProject.id}`)
      .then(res => res.json())
      .then(data => {
        const vendors = Array.isArray(data) ? data : (data?.vendors || []);
        setFilteredVendors(vendors);
      })
      .catch(err => {
        console.error('Error fetching vendors:', err);
        setFilteredVendors([]);
      });
  } else {
    setFilteredVendors(data?.creditorSuppliers || []);
  }
}, [activeProject?.id, data?.creditorSuppliers]);
  
    useEffect(() => {
      if (quickFormData.projectId) {
        loadMaterialsForProject(quickFormData.projectId);
      } else {
        setMaterials([]);
      }
    }, [quickFormData.projectId, loadMaterialsForProject]);
  
    useEffect(() => {
      fetchApprovedShortages();
    }, [activeProject?.id ,fetchApprovedShortages]);
  
    // ========== توابع معمولی (غیر Hook) ==========
    const addItemRow = () => {
      setItems((prev) => [...prev, createEmptyItemRow()]);
    };
  
    const removeItemRow = (key: string) => {
      if (items.length <= 1) {
        toast.error('حداقل یک آیتم فاکتور الزامی است');
        return;
      }
      setItems((prev) => prev.filter((r) => r._key !== key));
    };
  
    const updateItem = (key: string, field: keyof InvoiceItemRow, value: string | number | null) => {
      setItems((prev) =>
        prev.map((row) => {
          if (row._key !== key) return row;
          const updated = { ...row, [field]: value ?? '' };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.totalPrice = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
          }
          return updated;
        })
      );
    };
  
    const selectMaterial = (key: string, material: Material) => {
      setItems((prev) =>
        prev.map((row) => {
          if (row._key !== key) return row;
          return {
            ...row,
            materialId: material.id,
            materialName: material.name,
            unit: material.unit,
          };
        })
      );
      setOpenPopover((prev) => ({ ...prev, [key]: false }));
    };
  
    const itemsTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
    const getLinkWithProject = (baseLink: string) => {
      if (activeProject?.id) {
        const separator = baseLink.includes('?') ? '&' : '?';
        return `${baseLink}${separator}projectId=${activeProject.id}`;
      }
      return baseLink;
    };
  
    const handleQuickSubmit = async () => {
      if (!quickFormData.invoiceNumber || !quickFormData.projectId || !quickFormData.vendorId) {
        toast.error('لطفاً تمام فیلدهای الزامی را تکمیل کنید');
        return;
      }
      if (items.length === 0 || !items.some((i) => i.materialName.trim())) {
        toast.error('حداقل یک آیتم فاکتور با نام کالا وارد کنید');
        return;
      }
    
      setSubmitting(true);
      try {
        const miladiDate = fromShamsi(quickFormData.dueDate);
        const itemsData = items
          .filter(row => row.materialName.trim() !== '')
          .map((row) => ({
            materialId: row.materialId,
            materialName: row.materialName,
            quantity: row.quantity,
            unit: row.unit,
            unitPrice: row.unitPrice,
            totalPrice: row.totalPrice,
          }));
    
        // ✅ تبدیل فایل تصویر به base64 (مثل handleCreate)
        let imageBase64: string | null = null;
        if (quickFormData.imageFile) {
          imageBase64 = await fileToBase64(quickFormData.imageFile);
        }
    
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNumber: quickFormData.invoiceNumber,
            amount: itemsTotal,
            dueDate: miladiDate.toISOString(),
            projectId: quickFormData.projectId,
            supplierId: quickFormData.vendorId,
            purchaseDate: new Date().toISOString(),
            totalAmount: itemsTotal,
            paidAmount: 0,
            status: 'pending',
            items: itemsData,
            invoiceImage: imageBase64,  
          }),
        });
    
        if (response.ok) {
          toast.success('فاکتور با موفقیت ثبت شد');
    
          if (currentShortageRequestId) {
            await fetch('/api/shortage-requests', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: currentShortageRequestId,
                status: 'fulfilled',
              }),
            });
            setCurrentShortageRequestId(null);
            await fetchApprovedShortages();
          }
    
          setShowQuickForm(false);
          setQuickFormData({
            invoiceNumber: '',
            amount: '',
            dueDate: toShamsi(new Date()),
            projectId: '',
            vendorId: '',
            imageFile: null,
            imagePreview: null,
          });
          setItems([createEmptyItemRow()]);
    
          setTimeout(() => window.location.reload(), 1000);
    
        } else {
          const error = await response.json();
          toast.error(error.message || 'خطا در ثبت فاکتور');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('خطا در ارتباط با سرور');
      } finally {
        setSubmitting(false);
      }
    };

    // تابع کمکی برای تبدیل فایل به base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
  
    // ========== شرط‌های return در انتها (بعد از همه Hookها) ==========
    if (projectLoading) return <DashboardSkeleton cards={3} />;
    if (loading) return <DashboardSkeleton cards={3} />;
    if (!data) return <ErrorState />;
  
    // ========== متغیرهای مشتق شده از data ==========
    const { debtSummary, alertSummary, stats, urgentPurchases: _urgentPurchases, creditorSuppliers, recentPurchases } = data;
    const urgentPurchases = safeUrgentPurchases(_urgentPurchases);
  
    const myInvoicesCount = stats.totalPurchases;
    const myTotalAmount = debtSummary.totalPurchaseAmount;
    const myPendingCount = alertSummary.total;
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-[1400px] px-4 sm:px-6 space-y-5 pb-20">
          {/* دکمه بزرگ ثبت فاکتور */}
          <motion.button
            onClick={() => setShowQuickForm(true)}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white py-5 rounded-2xl shadow-xl shadow-blue-500/20 dark:shadow-blue-700/30 flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-2xl"
          >
            <Camera className="w-5 h-5" />
            <span className="text-base font-bold">ثبت فاکتور جدید</span>
            <Plus className="w-4 h-4 opacity-70" />
          </motion.button>
  
          {/* مودال ثبت سریع فاکتور */}
        {showQuickForm && (
  <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
      {/* هدر ثابت */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 px-5 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white">ثبت فاکتور سریع</h3>
          <button
            onClick={() => setShowQuickForm(false)}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-blue-100 text-[10px] mt-0.5">اطلاعات فاکتور را وارد کنید</p>
      </div>

      {/* محتوای قابل اسکرول */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* شماره فاکتور */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            شماره فاکتور <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="شماره فاکتور را وارد کنید"
            value={quickFormData.invoiceNumber}
            onChange={(e) => setQuickFormData({ ...quickFormData, invoiceNumber: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all text-sm"
            required
          />
        </div>

        {/* پروژه */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            پروژه <span className="text-red-500">*</span>
          </label>
          <select
            value={quickFormData.projectId}
            onChange={(e) => setQuickFormData({ ...quickFormData, projectId: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all text-sm"
            required
          >
            <option value="">انتخاب پروژه</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            {projects.length === 0 && (
              <option disabled>در حال بارگذاری...</option>
            )}
          </select>
        </div>

        {/* کالاها و خدمات */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            کالاها و خدمات <span className="text-red-500">*</span>
          </label>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold">نام کالا</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold">واحد</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold">تعداد</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold">قیمت واحد</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-semibold">مبلغ</th>
                    <th className="px-2 py-1.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row._key} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-1.5 min-w-[150px]">
                        <Popover open={openPopover[row._key]} onOpenChange={(open) => setOpenPopover(prev => ({ ...prev, [row._key]: open }))}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between h-7 text-[10px]">
                              {row.materialId ? materials.find(m => m.id === row.materialId)?.name : "انتخاب کالا..."}
                              <ChevronsUpDown className="mr-1 h-2.5 w-2.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0">
                            <Command>
                              <CommandInput placeholder="جستجوی کالا..." className="h-7 text-xs" />
                              <CommandList>
                                <CommandEmpty>کالایی یافت نشد</CommandEmpty>
                                <CommandGroup>
                                  {materials.map((material) => (
                                    <CommandItem
                                      key={material.id}
                                      value={material.name}
                                      onSelect={() => selectMaterial(row._key, material)}
                                      className="flex justify-between text-xs"
                                    >
                                      <span>{material.name}</span>
                                      <span className="text-[9px] text-gray-400">{UNIT_LABELS?.[material.unit] || material.unit}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                       </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.unit}
                          onChange={(e) => updateItem(row._key, 'unit', e.target.value)}
                          className="w-full h-7 text-[10px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                          <option value="KILOGRAM">کیلوگرم</option>
                          <option value="METRE">متر</option>
                          <option value="PIECE">عدد</option>
                          <option value="TON">تن</option>
                        </select>
                       </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.quantity || ''}
                          onChange={(e) => updateItem(row._key, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full h-7 text-center text-[10px] rounded-lg border border-gray-200 dark:border-gray-700"
                          dir="ltr"
                        />
                       </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.unitPrice || ''}
                          onChange={(e) => updateItem(row._key, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full h-7 text-center text-[10px] rounded-lg border border-gray-200 dark:border-gray-700"
                          dir="ltr"
                        />
                       </td>
                      <td className="px-2 py-1.5 text-center text-[10px] font-medium">
                        {toPersianDigits(row.totalPrice.toLocaleString())}
                       </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(row._key)}
                          className="p-0.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/30">
              <button type="button" onClick={addItemRow} className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-700">
                <Plus className="w-3 h-3" /> افزودن ردیف
              </button>
              <span className="text-xs font-bold">{formatCurrency(itemsTotal)}</span>
            </div>
          </div>
        </div>

        {/* تاریخ سررسید */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            تاریخ سررسید <span className="text-red-500">*</span>
          </label>
          <ShamsiDatePicker
            value={quickFormData.dueDate}
            onChange={(value) => setQuickFormData({ ...quickFormData, dueDate: value })}
            placeholder="انتخاب تاریخ سررسید"
          />
        </div>

        {/* تامین‌کننده */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            تامین‌کننده <span className="text-red-500">*</span>
          </label>
          <select
            value={quickFormData.vendorId}
            onChange={(e) => setQuickFormData({ ...quickFormData, vendorId: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all text-sm"
            required
            disabled={!quickFormData.projectId}
          >
            <option value="">
              {quickFormData.projectId ? 'انتخاب تامین‌کننده' : 'ابتدا پروژه را انتخاب کنید'}
            </option>
            {quickFormData.projectId && filteredVendors.map((supplier: any) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.companyName}
              </option>
            ))}
          </select>
          {quickFormData.projectId && filteredVendors.length === 0 && (
            <p className="text-[10px] text-amber-600 mt-1">
              هیچ تامین‌کننده‌ای به این پروژه متصل نیست
            </p>
          )}
        </div>
  {/* ثبت تصویر فاکتور */}
<div className="space-y-2">
  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
    تصویر فاکتور
  </label>
  
  <Button
    type="button"
    variant="outline"
    onClick={() => setCameraDialogOpen(true)}
    className="w-full gap-2 rounded-xl py-3 border-dashed"
  >
    <Camera className="w-4 h-4" />
    ثبت تصویر فاکتور
  </Button>

  {quickFormData.imagePreview && (
    <div className="relative inline-block w-full mt-2">
      <img
        src={quickFormData.imagePreview}
        alt="تصویر فاکتور"
        className="max-h-32 mx-auto rounded-lg border border-gray-200"
      />
      <button
        type="button"
        onClick={handleQuickImageRemove}
        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )}
</div>

{/* دیالوگ دوربین */}
<Dialog open={cameraDialogOpen} onOpenChange={setCameraDialogOpen}>
  <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden" dir="rtl">
    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
      <DialogTitle className="text-white text-center text-base">
        ثبت تصویر فاکتور
      </DialogTitle>
    </div>
    <div className="p-5 text-center">
      <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Receipt className="w-12 h-12 text-gray-400" />
      </div>
      <div className="flex gap-3 mt-2">
        <Button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleQuickImageSelect(file);
              setCameraDialogOpen(false);
            };
            input.click();
          }}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-3 text-sm font-bold gap-2"
        >
          <Camera className="w-4 h-4" />
          دوربین
        </Button>
        <Button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleQuickImageSelect(file);
              setCameraDialogOpen(false);
            };
            input.click();
          }}
          variant="outline"
          className="flex-1 rounded-xl py-3 text-sm font-bold gap-2"
        >
          <Upload className="w-4 h-4" />
          آپلود
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-4">
        از تصویر فاکتور عکس بگیرید یا از گالری انتخاب کنید
      </p>
    </div>
  </DialogContent>
</Dialog>
      </div>

      {/* دکمه ثبت - ثابت در پایین */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
        <button
          onClick={handleQuickSubmit}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              در حال ثبت...
            </span>
          ) : (
            'ثبت فاکتور'
          )}
        </button>
      </div>
    </div>
  </div>
)}
  
          {/* هدر */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                داشبورد خرید
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">آمار و عملکرد سریع خرید</p>
          </div>
  
          {/* 4 کارت Quick Access - با اعداد واقعی و لینک‌های دارای projectId */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'درخواست‌های رسیده', count: pendingCount, icon: ClipboardList, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', badge: true, href: getLinkWithProject('/invoices?status=pending') },
              { title: 'رسیدهای تحویل', count: deliveryCount, icon: FileCheck2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40', badge: deliveryCount > 0, href: getLinkWithProject('/deliveries') },
              { title: 'فاکتورهای اصلاحی', count: correctiveCount, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', badge: correctiveCount > 0, href: getLinkWithProject('/invoices?type=corrective') },
              { title: 'تامین‌کننده جدید', count: newSuppliersCount, icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', badge: false, href: getLinkWithProject('/vendors') },
            ].map((item) => (
              <motion.div 
                key={item.title} 
                whileTap={{ scale: 0.97 }} 
                className="cursor-pointer"
                onClick={() => window.location.href = item.href}
              >
                <Card className="border-0 shadow-soft dark:bg-gray-900/80 dark:backdrop-blur-sm rounded-2xl hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('p-2.5 rounded-xl', item.bg)}>
                        <item.icon className={cn('w-5 h-5', item.color)} />
                      </div>
                      {item.badge && item.count > 0 && (
                        <Badge className="bg-red-500 text-white text-xs rounded-full px-2">{item.count}</Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{item.title}</h4>
                    {item.count > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">{item.count} مورد جدید</p>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
  
          {/* آمار شخصی - 3 کارت */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GradientStatCard
              title="فاکتورهای ثبت‌شده"
              value={toPersianDigits(myInvoicesCount)}
              icon={Receipt}
              subtitle="تعداد کل"
              color="from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-600"
              delay={0}
            />
            <GradientStatCard
              title="مبلغ کل خرید"
              value={formatCurrencyShort(myTotalAmount)}
              icon={Wallet}
              subtitle="مجموع مبالغ"
              color="from-violet-600 to-indigo-700 dark:from-violet-500 dark:to-indigo-600"
              delay={75}
            />
            <GradientStatCard
              title="فاکتورهای باز"
              value={toPersianDigits(myPendingCount)}
              icon={Timer}
              subtitle="در انتظار پرداخت"
              color="from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-600"
              urgent={myPendingCount > 0}
              delay={150}
            />
          </div>
  
          {/* جستجوی تامین‌کننده + فاکتورهای اخیر */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* جستجوی تامین‌کننده */}
            <Card className="border-0 shadow-soft dark:bg-gray-900/80 rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200">جستجوی تامین‌کننده</CardTitle>
                </div>
                <CardDescription className="text-[11px]">یافتن تامین‌کننده برای ثبت فاکتور</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="نام شرکت یا شخص تماس..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="w-full pr-9 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {filteredSuppliers().map((supplier: any) => (
                    <div key={supplier.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-gray-800 dark:text-gray-200">{supplier.companyName}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{supplier.contactName}</p>
                      </div>
                    </div>
                  ))}
                  {filteredSuppliers().length === 0 && (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">تامین‌کننده‌ای یافت نشد</div>
                  )}
                </div>
              </CardContent>
            </Card>
  
            {/* فاکتورهای اخیر */}
            <Card className="border-0 shadow-soft dark:bg-gray-900/80 rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200">فاکتورهای اخیر</CardTitle>
                  </div>
                  <Link href="/invoices">
                    <Button variant="ghost" size="sm" className="text-xs gap-1 rounded-lg">
                      مشاهده همه
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {recentPurchases.slice(0, 6).map((purchase: any) => {
                    const getStatusBadge = (status: string) => {
                      switch (status) {
                        case 'paid': return <Badge className="text-[9px] bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0">پرداخت‌شده</Badge>;
                        case 'partial': return <Badge className="text-[9px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0">جزئی</Badge>;
                        case 'pending': return <Badge className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0">در انتظار</Badge>;
                        case 'overdue': return <Badge className="text-[9px] bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0">معوقه</Badge>;
                        default: return <Badge variant="secondary" className="text-[9px] px-1.5 py-0">نامشخص</Badge>;
                      }
                    };
                    return (
                      <div key={purchase.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate text-gray-800 dark:text-gray-200">{purchase.supplier?.companyName || '—'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">{formatCurrencyShort(purchase.totalAmount)}</span>
                            {getStatusBadge(purchase.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {recentPurchases.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">فاکتوری یافت نشد</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* درخواست‌های کسری تایید شده */}
<Card className="border-0 shadow-soft dark:bg-gray-900/80 rounded-2xl">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200">
          درخواست‌های کسری تایید شده
        </CardTitle>
      </div>
      {approvedShortages.length > 0 && (
        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
          {toPersianDigits(approvedShortages.length)}
        </Badge>
      )}
    </div>
    <CardDescription className="text-[11px]">
      درخواست‌هایی که مدیر پروژه تایید کرده، پس از ثبت فاکتور حذف می‌شوند
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2.5 max-h-72 overflow-y-auto">
      {loadingApproved ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : approvedShortages.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          درخواست تایید شده‌ای وجود ندارد
        </div>
      ) : (
        approvedShortages.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-500">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-gray-800 dark:text-gray-200">
                  {request.materialName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    مقدار: {toPersianDigits(request.quantity)} {request.unit === 'KILOGRAM' ? 'کیلوگرم' : 'عدد'}
                  </span>
                </div>
                {request.project?.name && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    پروژه: {request.project.name}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={async () => {
                // پر کردن فرم با اطلاعات پروژه
                setQuickFormData({
                  ...quickFormData,
                  projectId: request.projectId || '',
                });
                setCurrentShortageRequestId(request.id);
                setShowQuickForm(true);
  
              }}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold shrink-0"
            >
              ثبت فاکتور
            </Button>
          </div>
        ))
      )}
    </div>
  </CardContent>
</Card>
  
          {/* سررسیدهای نزدیک */}
          <Card className="border-0 shadow-soft dark:bg-gray-900/80 rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200">سررسیدهای نزدیک</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
                {[...urgentPurchases.red, ...urgentPurchases.orange, ...urgentPurchases.yellow].slice(0, 6).map((purchase: any) => {
                  const level = urgentPurchases.red.some((p: any) => p.id === purchase.id) ? 'red' :
                                urgentPurchases.orange.some((p: any) => p.id === purchase.id) ? 'orange' : 'yellow';
                  const colors = ALERT_COLORS[level];
                  return (
                    <div key={purchase.id} className={cn('p-3 rounded-xl border', colors.light, colors.border)}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold truncate">{purchase.supplier?.companyName || '—'}</p>
                        <span className={cn('text-xs font-bold', colors.text)}>{formatCurrencyShort(purchase.remainingAmount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{purchase.project?.name || '—'}</span>
                        <span className={cn('text-[11px] font-semibold', colors.text)}>سررسید: {formatDateShort(purchase.dueDate)}</span>
                      </div>
                    </div>
                  );
                })}
                {urgentPurchases.red.length === 0 && urgentPurchases.orange.length === 0 && urgentPurchases.yellow.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400 text-sm">سررسید نزدیکی وجود ندارد</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

/* ═══════════════════════════════════════════════════════════════════════════
   ۴. WarehouseKeeperDashboard — انباردار
   دید ساده تحویل: تحویل‌های امروز، تایید تحویل، تاریخچه
   ═══════════════════════════════════════════════════════════════════════════ */
export function WarehouseKeeperDashboard() {
  const { data, loading } = useDashboardData();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (loading) return <DashboardSkeleton cards={2} />;
  if (!data) return <ErrorState />;

  const { urgentPurchases: _urgentPurchases, recentPurchases, stats } = data;
  const urgentPurchases = safeUrgentPurchases(_urgentPurchases);

  // فاکتورهایی که هنوز تحویل نشدند (hasDelivery = false) — منتظر تحویل
  const pendingDelivery = [...urgentPurchases.red, ...urgentPurchases.orange, ...urgentPurchases.yellow]
    .filter(p => !p.hasDelivery && !confirmedIds.has(p.id));

  // تحویل‌های تاییدشده (hasDelivery = true)
  const confirmedDeliveries = [...urgentPurchases.red, ...urgentPurchases.orange, ...urgentPurchases.yellow]
    .filter(p => p.hasDelivery || confirmedIds.has(p.id));

  // تحویل‌های امروز
  const todayDeliveries = recentPurchases.filter(p => p.hasDelivery).length + confirmedIds.size;

  // تایید تحویل واقعی — فراخوانی API
  const handleConfirm = async (purchaseId: string) => {
    setConfirmingId(purchaseId);
    try {
      const purchase = [...urgentPurchases.red, ...urgentPurchases.orange, ...urgentPurchases.yellow]
        .find(p => p.id === purchaseId);
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId,
          projectId: purchase?.project?.id || '',
          confirmedBy: 'انباردار',
          notes: '',
        }),
      });
      if (res.ok) {
        setConfirmedIds(prev => new Set(prev).add(purchaseId));
      }
    } catch (err) {
      console.error('تایید تحویل ناموفق:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  // رد تحویل (شبیه‌سازی)
  const handleReject = async (purchaseId: string) => {
    setRejectingId(purchaseId);
    setTimeout(() => setRejectingId(null), 800);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* هدر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <WarehouseIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">داشبورد انبار</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            تحویل‌ها و تاییدات انبار
          </p>
        </div>
      </div>

      {/* کارت‌های اصلی — ساده و بزرگ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* تحویل‌های امروز */}
        <Card className="border-0 overflow-hidden animate-in-up neu-raised">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 sm:p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/20 mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <p className="text-5xl font-extrabold text-white mb-2">{toPersianDigits(todayDeliveries)}</p>
              <p className="text-white/70 text-sm font-medium">تحویل امروز</p>
            </div>
          </CardContent>
        </Card>

        {/* در انتظار تایید */}
        <Card className="border-0 overflow-hidden animate-in-up neu-raised" style={{ animationDelay: '75ms' }}>
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 sm:p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/20 mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <p className="text-5xl font-extrabold text-white mb-2">{toPersianDigits(pendingDelivery.length)}</p>
              <p className="text-white/70 text-sm font-medium">در انتظار تحویل</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تحویل‌های در انتظار تایید */}
      <Card className="border-0 animate-in-up overflow-hidden neu-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-amber-500" />
            <CardTitle className="text-sm font-bold">فاکتورهای در انتظار تحویل</CardTitle>
          </div>
          <CardDescription className="text-[11px]">فاکتورهایی که مصالحشان هنوز به انبار نرسیده</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5 max-h-96 overflow-y-auto scrollbar-thin">
            {pendingDelivery.map(purchase => (
              <div
                key={purchase.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 transition-all hover:shadow-soft-sm"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-500">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{purchase.supplier?.companyName || '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{purchase.project?.name || '—'}</span>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <span className="text-[11px] font-semibold">{toPersianDigits(purchase.itemsCount)} قلم</span>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <span className="text-[11px] text-muted-foreground">سررسید: {formatDateShort(purchase.dueDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs font-bold gradient-success text-white shadow-soft-sm"
                    onClick={() => handleConfirm(purchase.id)}
                    disabled={confirmingId === purchase.id}
                  >
                    {confirmingId === purchase.id ? (
                      <Timer className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    تایید
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                    onClick={() => handleReject(purchase.id)}
                    disabled={rejectingId === purchase.id}
                  >
                    <PackageX className="w-3.5 h-3.5" />
                    مغایرت
                  </Button>
                </div>
              </div>
            ))}
            {pendingDelivery.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PackageCheck className="w-10 h-10 mb-3 text-emerald-400" />
                <p className="text-sm font-medium">فاکتوری در انتظار تحویل نیست</p>
                <p className="text-[11px] mt-1">همه تحویل‌ها ثبت شده‌اند</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* تحویل‌های تاییدشده اخیر */}
      <Card className="border-0 animate-in-up overflow-hidden neu-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold">تحویل‌های تاییدشده اخیر</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {confirmedDeliveries.map(purchase => (
              <div
                key={purchase.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{purchase.supplier?.companyName || '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{purchase.project?.name || '—'}</span>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <span className="text-[11px] text-muted-foreground">{formatDateShort(purchase.dueDate)}</span>
                  </div>
                </div>
                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0 flex-shrink-0">
                  تاییدشده
                </Badge>
              </div>
            ))}
            {confirmedDeliveries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">تحویل تاییدشده‌ای یافت نشد</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   ۵. AdminDashboard — ادمین سیستم
   مدیریت فنی سیستم — Desktop Professional
   مدیریت کاربران، نقش‌ها، تنظیمات، لاگ‌ها، ورک‌فلو
   ═══════════════════════════════════════════════════════════════════════════ */
export function AdminDashboard() {
  const { data, loading } = useDashboardData();

  if (loading) return <DashboardSkeleton cards={4} />;
  if (!data) return <ErrorState />;

  const { stats, alertSummary } = data;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* هدر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">داشبورد ادمین</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            مدیریت فنی سیستم، کاربران و تنظیمات
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/users">
            <Button className="gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold">
              <Users className="w-4 h-4" />
              مدیریت کاربران
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="gap-1.5 rounded-xl text-xs font-bold">
              <Settings className="w-4 h-4" />
              تنظیمات
            </Button>
          </Link>
          <Link href="/permissions">
            <Button variant="outline" className="gap-1.5 rounded-xl text-xs font-bold">
              <Shield className="w-4 h-4" />
              دسترسی‌ها
            </Button>
          </Link>
        </div>
      </div>

      {/* کارت‌های آمار سیستم */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GradientStatCard
          title="کاربران فعال"
          value={toPersianDigits(stats.activeUsers ?? 0)}
          icon={Users}
          subtitle={`از ${toPersianDigits(stats.totalUsers ?? 0)} کاربر`}
          color="from-red-500 to-rose-600"
          delay={0}
        />
        <GradientStatCard
          title="پروژه‌های فعال"
          value={toPersianDigits(stats.activeProjects)}
          icon={FolderKanban}
          subtitle={`از ${toPersianDigits(stats.totalProjects)} پروژه`}
          color="from-blue-500 to-indigo-600"
          delay={75}
        />
        <GradientStatCard
          title="تامین‌کنندگان"
          value={toPersianDigits(stats.totalSuppliers)}
          icon={Truck}
          subtitle="ثبت‌شده در سیستم"
          color="from-amber-500 to-orange-600"
          delay={150}
        />
        <GradientStatCard
          title="فاکتورهای باز"
          value={toPersianDigits(stats.unpaidPurchases)}
          icon={FileText}
          subtitle={`از ${toPersianDigits(stats.totalPurchases)} فاکتور`}
          color="from-emerald-500 to-teal-600"
          delay={225}
        />
      </div>

      {/* مدیریت سریع سیستم */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* میانبرهای مدیریتی */}
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold">میانبرهای مدیریتی</CardTitle>
            </div>
            <CardDescription className="text-[11px]">دسترسی سریع به بخش‌های مدیریتی</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'مدیریت کاربران', icon: Users, href: '/users', color: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' },
                { label: 'مدیریت نقش‌ها', icon: Shield, href: '/permissions', color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300' },
                { label: 'تنظیمات سیستم', icon: Settings, href: '/settings', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' },
                { label: 'گزارش‌گیری', icon: BarChart3, href: '/reports', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
              ].map((item) => (
                <Link key={item.label} href={item.href}>
                  <div className={cn('flex items-center gap-3 p-4 rounded-xl border border-border/30 transition-all duration-200 hover:shadow-soft-sm cursor-pointer', item.color)}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-bold">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* وضعیت سیستم */}
        <Card className="border-0 animate-in-up overflow-hidden neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold">وضعیت سیستم</CardTitle>
            </div>
            <CardDescription className="text-[11px]">اطلاعات فنی و عملکرد سیستم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'وضعیت سرور', value: 'فعال', status: 'success' },
                { label: 'پایگاه داده', value: 'متصل', status: 'success' },
                { label: 'آخرین بکاپ', value: 'امروز', status: 'success' },
                { label: 'نقش‌های سیستمی', value: toPersianDigits(5), status: 'info' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.status === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    <span className="text-sm font-bold">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   انتخابگر داشبورد بر اساس نقش
   ═══════════════════════════════════════════════════════ */
export function getDashboardForRole(role: string): React.ComponentType {
  switch (role) {
    case 'SUPER_MANAGER':
      return SuperManagerDashboard;
    case 'PROJECT_MANAGER':
      return ProjectManagerDashboard;
    case 'PURCHASER':
      return PurchaserDashboard;
    case 'WAREHOUSE_KEEPER':
      return WarehouseKeeperDashboard;
    case 'ADMIN':
      return AdminDashboard;
    default:
      // اگر نقش مشخص نبود، داشبورد مدیر کل نمایش داده شود
      return SuperManagerDashboard;
  }
}
