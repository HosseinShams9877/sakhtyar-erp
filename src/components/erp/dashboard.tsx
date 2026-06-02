'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderKanban, Truck, DollarSign, CalendarClock, AlertTriangle,
  Wallet, Clock, TrendingUp, ArrowUpRight, CheckCircle2, Circle,
  ChevronLeft, Building2, Phone, FileText, Plus,
  CircleDot, Bell, BellRing, AlertCircle, AlertOctagon,
  ArrowDownLeft, ArrowUpRight as ArrowUpRightIcon,
  CreditCard, Receipt, ShoppingBag,
} from 'lucide-react';
import {
  formatNumber, formatCurrency, formatCurrencyShort,
  formatDate, formatDateShort, toPersianDigits,
} from '@/lib/rbac';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
  recentPurchases: any[];
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
   هدر خوش‌آمدگویی
   ═══════════════════════════════════════════════════════ */
function DashboardHeader() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = 'سلام!';
  if (hour < 12) greeting = 'صبح بخیر!';
  else if (hour < 17) greeting = 'ظهر بخیر!';
  else greeting = 'عصر بخیر!';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{greeting}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          وضعیت بدهی و سررسید پرداخت‌های خود را بررسی کنید
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/invoices">
          <Button className="gap-1.5 rounded-xl gradient-primary text-white shadow-glow-primary text-xs font-bold">
            <Plus className="w-4 h-4" />
            ثبت فاکتور جدید
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   کارت‌های آمار اصلی (استایل تصویر)
   ═══════════════════════════════════════════════════════ */
function StatsCards({ debtSummary, stats, alertSummary }: { debtSummary: DebtSummary; stats: Stats; alertSummary: AlertSummary }) {
  const paymentProgress = debtSummary.totalPurchaseAmount > 0
    ? Math.round((debtSummary.totalPaid / debtSummary.totalPurchaseAmount) * 100)
    : 0;

  const cards = [
    {
      title: 'مجموع بدهی',
      value: formatCurrencyShort(debtSummary.totalDebt),
      icon: Wallet,
      subtitle: `${toPersianDigits(alertSummary.total)} فاکتور باز`,
      color: 'from-violet-600 to-indigo-700',
      iconBg: 'bg-white/20',
      trend: null,
    },
    {
      title: 'سررسید گذشته',
      value: formatCurrencyShort(debtSummary.overdue),
      icon: AlertTriangle,
      subtitle: `${toPersianDigits(alertSummary.red)} فاکتور معوقه`,
      color: 'from-red-500 to-rose-600',
      iconBg: 'bg-white/20',
      trend: debtSummary.overdue > 0 ? 'up' : null,
      urgent: debtSummary.overdue > 0,
    },
    {
      title: 'بدهی این هفته',
      value: formatCurrencyShort(debtSummary.weekDue),
      icon: CalendarClock,
      subtitle: 'سررسید ۷ روز آینده',
      color: 'from-amber-500 to-orange-600',
      iconBg: 'bg-white/20',
      trend: null,
    },
    {
      title: 'پرداخت‌شده',
      value: formatCurrencyShort(debtSummary.totalPaid),
      icon: CheckCircle2,
      subtitle: `${toPersianDigits(paymentProgress)}٪ از کل`,
      color: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-white/20',
      trend: 'down',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => (
        <Card
          key={idx}
          className={cn(
            'border-0 shadow-soft overflow-hidden transition-all duration-300 hover:shadow-soft-md hover:-translate-y-0.5 animate-in-up',
            card.urgent && 'ring-2 ring-red-500/30',
          )}
          style={{ animationDelay: `${idx * 75}ms` }}
        >
          <CardContent className="p-0">
            <div className={cn('bg-gradient-to-br p-4 sm:p-5', card.color)}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.iconBg)}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                {card.trend && (
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                    card.trend === 'up' ? 'bg-red-500/30 text-white' : 'bg-emerald-500/30 text-white'
                  )}>
                    {card.trend === 'up'
                      ? <ArrowUpRightIcon className="w-3 h-3" />
                      : <ArrowDownLeft className="w-3 h-3" />
                    }
                    {card.trend === 'up' ? 'فوری' : 'خوب'}
                  </div>
                )}
                {card.urgent && (
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[9px] font-bold text-white">فوری</span>
                  </div>
                )}
              </div>
              <p className="text-white/70 text-[11px] font-medium mb-1">{card.title}</p>
              <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{card.value}</p>
              <p className="text-white/50 text-[10px] mt-1.5">{card.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   نوار پیشرفت پرداخت + نمودار دایره‌ای
   ═══════════════════════════════════════════════════════ */
function PaymentProgress({ debtSummary, alertSummary, alertAmounts }: {
  debtSummary: DebtSummary; alertSummary: AlertSummary; alertAmounts: AlertAmounts;
}) {
  const paymentProgress = debtSummary.totalPurchaseAmount > 0
    ? Math.round((debtSummary.totalPaid / debtSummary.totalPurchaseAmount) * 100)
    : 0;

  const total = alertSummary.total || 1;
  const pieData = [
    { name: 'سررسید گذشته', value: alertSummary.red, fill: '#ef4444' },
    { name: '≤ ۳ روز', value: alertSummary.orange, fill: '#f97316' },
    { name: '≤ ۷ روز', value: alertSummary.yellow, fill: '#f59e0b' },
    { name: '> ۷ روز', value: alertSummary.green, fill: '#10b981' },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* پیشرفت پرداخت */}
      <Card className="border-0 shadow-soft animate-in-up lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold">پیشرفت پرداخت</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {toPersianDigits(paymentProgress)}٪ تکمیل
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={paymentProgress} className="h-3" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-muted/40">
              <p className="text-xs text-muted-foreground mb-1">کل خرید</p>
              <p className="text-sm font-extrabold">{formatCurrencyShort(debtSummary.totalPurchaseAmount)}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xs text-muted-foreground mb-1">پرداخت‌شده</p>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrencyShort(debtSummary.totalPaid)}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
              <p className="text-xs text-muted-foreground mb-1">باقیمانده</p>
              <p className="text-sm font-extrabold text-red-600 dark:text-red-400">{formatCurrencyShort(debtSummary.totalDebt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* نمودار دایره‌ای توزیع هشدار */}
      <Card className="border-0 shadow-soft animate-in-up">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold">توزیع هشدار</CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {toPersianDigits(alertSummary.total)} فاکتور
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="h-44" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [toPersianDigits(value) + ' فاکتور', name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">بدون هشدار</p>
            </div>
          )}
          {/* افسانه */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { color: 'bg-red-500', label: 'سررسید گذشته', count: alertSummary.red },
              { color: 'bg-orange-500', label: '≤ ۳ روز', count: alertSummary.orange },
              { color: 'bg-amber-500', label: '≤ ۷ روز', count: alertSummary.yellow },
              { color: 'bg-emerald-500', label: '> ۷ روز', count: alertSummary.green },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', item.color)} />
                <span className="text-[10px] text-muted-foreground truncate">{item.label}</span>
                <span className="text-[10px] font-bold ms-auto">{toPersianDigits(item.count)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   نمودارها
   ═══════════════════════════════════════════════════════ */
function DuePaymentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl shadow-soft-lg p-3 text-sm border-0" dir="rtl">
      <p className="font-bold mb-2 text-foreground">{label ? formatDateShort(label) : ''}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground text-xs">{entry.name}:</span>
            <span className="font-semibold text-xs">{formatCurrencyShort(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VendorDebtTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="glass-card rounded-xl shadow-soft-lg p-3 text-sm border-0" dir="rtl">
      <p className="font-bold">{data?.vendor}</p>
      <p className="text-muted-foreground text-xs">{formatCurrencyShort(data?.amount)}</p>
      {data?.overdueCount > 0 && (
        <p className="text-red-500 text-xs mt-1">{toPersianDigits(data.overdueCount)} فاکتور معوقه</p>
      )}
    </div>
  );
}

function DashboardCharts({
  duePaymentsChart,
  vendorDebtChart,
}: {
  duePaymentsChart: DashboardData['duePaymentsChart'];
  vendorDebtChart: DashboardData['vendorDebtChart'];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* نمودار پرداخت‌های سررسید */}
      <Card className="border-0 shadow-soft card-hover animate-in-up overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">سررسید پرداخت‌های ۳۰ روز آینده</CardTitle>
              <CardDescription className="text-[11px]">مبالغ معلق به تفکیک وضعیت</CardDescription>
            </div>
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {duePaymentsChart.length > 0 ? (
            <div className="h-64 sm:h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={duePaymentsChart} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatDateShort(v)} />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatCurrencyShort(v)} />
                  <Tooltip content={<DuePaymentTooltip />} />
                  <Area type="monotone" dataKey="pending" name="در انتظار" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="partial" name="پرداخت جزئی" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 sm:h-72 flex items-center justify-center text-muted-foreground text-sm">
              پرداخت سررسیدی در ۳۰ روز آینده یافت نشد
            </div>
          )}
        </CardContent>
      </Card>

      {/* نمودار بدهی تامین‌کنندگان */}
      <Card className="border-0 shadow-soft card-hover animate-in-up overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">بدهی به تفکیک تامین‌کننده</CardTitle>
              <CardDescription className="text-[11px]">مبالغ معلق هر تامین‌کننده</CardDescription>
            </div>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {vendorDebtChart.length > 0 ? (
            <div className="h-64 sm:h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorDebtChart} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatCurrencyShort(v)} />
                  <YAxis type="category" dataKey="vendor" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<VendorDebtTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                  <Bar dataKey="amount" name="مبلغ معلق" fill="#7c3aed" radius={[0, 6, 6, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 sm:h-72 flex items-center justify-center text-muted-foreground text-sm">
              بدهی معلق یافت نشد
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   خریدهای فوری (تب‌دار)
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

function UrgentPurchases({ urgentPurchases }: { urgentPurchases: DashboardData['urgentPurchases'] }) {
  const [activeTab, setActiveTab] = useState<AlertLevel>('red');
  const tabs: { level: AlertLevel; icon: React.ElementType }[] = [
    { level: 'red', icon: AlertOctagon },
    { level: 'orange', icon: AlertCircle },
    { level: 'yellow', icon: Bell },
  ];

  const items = urgentPurchases[activeTab] || [];

  return (
    <Card className="border-0 shadow-soft animate-in-up overflow-hidden">
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
        <CardDescription className="text-[11px]">
          {ALERT_COLORS[activeTab].label}
        </CardDescription>
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

/* ═══════════════════════════════════════════════════════
   تامین‌کنندگان طلبکار
   ═══════════════════════════════════════════════════════ */
function CreditorSuppliersList({ suppliers }: { suppliers: CreditorSupplier[] }) {
  return (
    <Card className="border-0 shadow-soft animate-in-up overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">تامین‌کنندگان طلبکار</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {toPersianDigits(suppliers.length)} تامین‌کننده
          </Badge>
        </div>
        <CardDescription className="text-[11px]">تامین‌کنندگانی که بدهی معلق دارید</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
          {suppliers.slice(0, 6).map((supplier, idx) => (
            <div
              key={supplier.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white',
                idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : 'bg-muted-foreground/30',
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
                    <Badge variant="secondary" className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0">
                      {toPersianDigits(supplier.overdueCount)} معوقه
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">تامین‌کننده طلبکاری یافت نشد</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   پروژه‌های بدهکار
   ═══════════════════════════════════════════════════════ */
function DebtorProjectsCards({ projects }: { projects: DebtorProject[] }) {
  return (
    <Card className="border-0 shadow-soft animate-in-up overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">پروژه‌های بدهکار</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {toPersianDigits(projects.length)} پروژه
          </Badge>
        </div>
        <CardDescription className="text-[11px]">پروژه‌هایی که بدهی معلق دارند</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto scrollbar-thin">
          {projects.slice(0, 6).map((project) => (
            <div
              key={project.id}
              className={cn(
                'p-3.5 rounded-xl border transition-all duration-200 hover:shadow-soft-sm',
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
                <p className="text-[11px] text-muted-foreground mb-2">{project.location}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{toPersianDigits(project.purchaseCount)} فاکتور</span>
                <span className="text-sm font-extrabold text-destructive">{formatCurrencyShort(project.totalDebt)}</span>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">پروژه بدهکاری یافت نشد</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   آخرین تراکنش‌ها (جدول)
   ═══════════════════════════════════════════════════════ */
function RecentTransactions({ purchases }: { purchases: any[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0">پرداخت‌شده</Badge>;
      case 'partial':
        return <Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0">جزئی</Badge>;
      case 'pending':
        return <Badge className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0">در انتظار</Badge>;
      case 'overdue':
        return <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0">معوقه</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{status}</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-soft animate-in-up overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">آخرین فاکتورها</CardTitle>
          </div>
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="text-xs gap-1 rounded-lg">
              مشاهده همه
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* دسکتاپ: جدول */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">شماره فاکتور</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">تامین‌کننده</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">پروژه</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">مبلغ کل</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">مانده</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">وضعیت</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground">سررسید</th>
              </tr>
            </thead>
            <tbody>
              {purchases.slice(0, 6).map((p) => (
                <tr key={p.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{toPersianDigits(p.invoiceNumber)}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{p.supplier?.companyName || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.project?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold">{formatCurrencyShort(p.totalAmount)}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-destructive">
                    {formatCurrencyShort(p.totalAmount - (p.paidAmount || 0))}
                  </td>
                  <td className="px-4 py-2.5 text-center">{getStatusBadge(p.status)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateShort(p.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* موبایل: کارت */}
        <div className="md:hidden space-y-2 p-3">
          {purchases.slice(0, 5).map((p) => (
            <div key={p.id} className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs">{toPersianDigits(p.invoiceNumber)}</span>
                {getStatusBadge(p.status)}
              </div>
              <p className="text-sm font-bold">{p.supplier?.companyName || '—'}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{p.project?.name || '—'}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">مانده:</span>
                <span className="text-sm font-extrabold text-destructive">
                  {formatCurrencyShort(p.totalAmount - (p.paidAmount || 0))}
                </span>
              </div>
            </div>
          ))}
        </div>

        {purchases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">فاکتوری یافت نشد</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   آمار سریع
   ═══════════════════════════════════════════════════════ */
function QuickStats({ stats }: { stats: Stats }) {
  const statItems = [
    { label: 'پروژه‌های فعال', value: stats.activeProjects, total: stats.totalProjects, icon: FolderKanban, color: 'text-violet-600 dark:text-violet-400' },
    { label: 'تامین‌کنندگان', value: stats.totalSuppliers, icon: Truck, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'کل خریدها', value: stats.totalPurchases, icon: FileText, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'فاکتورهای باز', value: stats.unpaidPurchases, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {statItems.map((stat, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30 transition-colors hover:bg-muted/50"
        >
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-muted/80', stat.color)}>
            <stat.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-extrabold">{toPersianDigits(stat.value)}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   داشبورد اصلی — انتخاب بر اساس نقش
   ═══════════════════════════════════════════════════════ */
import { useAuth } from '@/components/auth-provider';
import { SuperManagerDashboard, ProjectManagerDashboard, PurchaserDashboard, WarehouseKeeperDashboard, AdminDashboard } from '@/components/erp/role-dashboards';

export default function Dashboard() {
  const { session } = useAuth();
  const role = (session?.user as any)?.role as string || 'SUPER_MANAGER';

  // انتخاب داشبورد اختصاصی بر اساس نقش
  switch (role) {
    case 'SUPER_MANAGER':
      return <SuperManagerDashboard />;
    case 'PROJECT_MANAGER':
      return <ProjectManagerDashboard />;
    case 'PURCHASER':
      return <PurchaserDashboard />;
    case 'WAREHOUSE_KEEPER':
      return <WarehouseKeeperDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    default:
      // fallback: داشبورد کامل (برای مدیر کل و نقش‌های ناشناخته)
      return <FullDashboard />;
  }
}

/* ═══════════════════════════════════════════════════════
   داشبورد کامل — مدیر کل و ناشناخته
   ═══════════════════════════════════════════════════════ */
function FullDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (!json.error) setData(json);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-52 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mb-4 text-amber-400" />
        <p className="text-lg font-bold">خطا در بارگذاری داده‌ها</p>
        <p className="text-sm mt-1">لطفاً صفحه را رفرش کنید</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ۱. هدر خوش‌آمدگویی + دکمه ثبت فاکتور */}
      <DashboardHeader />

      {/* ۲. کارت‌های آمار اصلی */}
      <StatsCards debtSummary={data.debtSummary} stats={data.stats} alertSummary={data.alertSummary} />

      {/* ۳. پیشرفت پرداخت + نمودار دایره‌ای هشدار */}
      <PaymentProgress
        debtSummary={data.debtSummary}
        alertSummary={data.alertSummary}
        alertAmounts={data.alertAmounts}
      />

      {/* ۴. نمودارها */}
      <DashboardCharts
        duePaymentsChart={data.duePaymentsChart}
        vendorDebtChart={data.vendorDebtChart}
      />

      {/* ۵. خریدهای فوری + تامین‌کنندگان طلبکار */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <UrgentPurchases urgentPurchases={data.urgentPurchases} />
        <CreditorSuppliersList suppliers={data.creditorSuppliers} />
      </div>

      {/* ۶. آخرین فاکتورها (جدول/کارت) */}
      <RecentTransactions purchases={data.recentPurchases} />

      {/* ۷. پروژه‌های بدهکار */}
      <DebtorProjectsCards projects={data.debtorProjects} />

      {/* ۸. آمار سریع */}
      <QuickStats stats={data.stats} />
    </div>
  );
}
