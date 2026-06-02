'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  Building2,
  Store,
  ChevronLeft,
  RefreshCw,
  CircleDollarSign,
  CalendarDays,
  ArrowUpLeft,
  Wallet,
  CheckCircle2,
  Timer,
  Zap,
  BarChart3,
  ArrowLeftRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toPersianDigits, formatCurrency, toPersianDate, daysUntilDue, getDueDateAlertLevel, getAlertLevelColor, formatDaysRemaining, getPurchaseStatusInfo, formatNumber } from '@/lib/persian';
import type { AlertLevel } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Page = 'dashboard' | 'purchases' | 'suppliers' | 'projects' | 'delivery' | 'reports';

interface DashboardData {
  alertSummary: {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    total: number;
  };
  alertAmounts: {
    red: number;
    orange: number;
    yellow: number;
    green: number;
  };
  debtSummary: {
    totalDebt: number;
    todayDue: number;
    weekDue: number;
    overdue: number;
    totalPaid: number;
    totalPurchaseAmount: number;
  };
  stats: {
    activeProjects: number;
    totalProjects: number;
    totalSuppliers: number;
    totalPurchases: number;
    unpaidPurchases: number;
  };
  urgentPurchases: {
    red: any[];
    orange: any[];
    yellow: any[];
  };
  creditorSuppliers: any[];
  debtorProjects: any[];
  recentPurchases: any[];
}

interface Props {
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error('خطا در بارگذاری داشبورد');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Run reminder check on load
  useEffect(() => {
    fetch('/api/reminders/check').catch(() => {});
  }, []);

  const handleSeed = async () => {
    try {
      const res = await fetch('/api/seed');
      if (res.ok) {
        toast.success('داده‌های نمونه با موفقیت ایجاد شد');
        fetchDashboard();
      }
    } catch {
      toast.error('خطا در ایجاد داده‌های نمونه');
    }
  };

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        {/* Hero skeleton */}
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
        {/* Cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        {/* List skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-52 rounded-xl bg-muted animate-pulse" />
          <div className="h-52 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  // ─── Empty state ───
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">خطا در بارگذاری اطلاعات</p>
        <Button onClick={fetchDashboard} variant="outline">تلاش مجدد</Button>
        <Button onClick={handleSeed} variant="outline" className="mt-2">
          ایجاد داده‌های نمونه
        </Button>
      </div>
    );
  }

  const hasData = data.stats?.totalPurchases > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center">
          <CircleDollarSign className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold">به ساخت‌یار خوش آمدید!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          سیستم مدیریت بدهی و سررسید خرید مصالح پروژه‌های ساختمانی
        </p>
        <Button onClick={handleSeed} className="mt-4 gradient-primary text-white border-0">
          ایجاد داده‌های نمونه
        </Button>
      </div>
    );
  }

  const ds = data.debtSummary;
  const paidPercentage = ds.totalPurchaseAmount > 0
    ? Math.round((ds.totalPaid / ds.totalPurchaseAmount) * 100)
    : 0;

  // ─── Merge all urgent purchases with alert level ───
  const urgentPurchases = [
    ...(data.urgentPurchases?.red || []).map((p: any) => ({ ...p, alertLevel: 'red' as AlertLevel })),
    ...(data.urgentPurchases?.orange || []).map((p: any) => ({ ...p, alertLevel: 'orange' as AlertLevel })),
    ...(data.urgentPurchases?.yellow || []).map((p: any) => ({ ...p, alertLevel: 'yellow' as AlertLevel })),
  ].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">داشبورد</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            نمای کلی بدهی‌ها و سررسید پرداخت‌ها
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboard} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">بروزرسانی</span>
        </Button>
      </div>

      {/* ─── Hero: Total Debt Card ─── */}
      <Card className="overflow-hidden border-0 shadow-soft-md">
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-l from-red-500/10 via-orange-500/5 to-transparent dark:from-red-500/20 dark:via-orange-500/10" />
          <CardContent className="relative py-5 px-4 sm:py-6 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">مجموع بدهی باز</p>
                  <p className="text-xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(ds.totalDebt)}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                {/* Payment progress ring */}
                <div className="text-center">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="4" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="4"
                        strokeDasharray={`${paidPercentage * 1.76} 176`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {toPersianDigits(paidPercentage)}٪
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">پرداخت شده</p>
                </div>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground">سررسید امروز</p>
                <p className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(ds.todayDue)}
                </p>
              </div>
              <div className="text-center border-x border-border/30">
                <p className="text-[10px] sm:text-xs text-muted-foreground">هفته جاری</p>
                <p className="text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(ds.weekDue)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground">معوق</p>
                <p className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(ds.overdue)}
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ─── Alert Level Cards (4-column grid) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          { label: 'معوق / امروز', count: data.alertSummary.red, amount: data.alertAmounts.red, level: 'red' as AlertLevel, icon: Zap },
          { label: 'کمتر از ۳ روز', count: data.alertSummary.orange, amount: data.alertAmounts.orange, level: 'orange' as AlertLevel, icon: Timer },
          { label: 'کمتر از ۷ روز', count: data.alertSummary.yellow, amount: data.alertAmounts.yellow, level: 'yellow' as AlertLevel, icon: Clock },
          { label: 'عادی', count: data.alertSummary.green, amount: data.alertAmounts.green, level: 'green' as AlertLevel, icon: CheckCircle2 },
        ].map((stat) => {
          const colors = getAlertLevelColor(stat.level);
          return (
            <Card key={stat.level} className={cn('shadow-soft border card-hover overflow-hidden', colors.border, colors.bg)}>
              <CardContent className="py-3 px-3 sm:py-4 sm:px-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn('w-2.5 h-2.5 rounded-full mt-1', colors.dot)} />
                  <stat.icon className={cn('w-4 h-4', colors.text)} />
                </div>
                <p className={cn('text-2xl sm:text-3xl font-bold leading-none', colors.text)}>
                  {toPersianDigits(stat.count)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{stat.label}</p>
                <p className={cn('text-[10px] sm:text-xs font-medium mt-1', colors.text)}>
                  {formatCurrency(stat.amount)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Alert distribution bar ─── */}
      {data.alertSummary.total > 0 && (
        <Card className="shadow-soft">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">توزیع هشدارها</p>
              <p className="text-xs text-muted-foreground">
                {toPersianDigits(data.alertSummary.total)} فاکتور باز
              </p>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/50 gap-0.5">
              {data.alertSummary.red > 0 && (
                <div
                  className="bg-red-500 rounded-full transition-all duration-700"
                  style={{ width: `${(data.alertSummary.red / data.alertSummary.total) * 100}%` }}
                />
              )}
              {data.alertSummary.orange > 0 && (
                <div
                  className="bg-orange-500 rounded-full transition-all duration-700"
                  style={{ width: `${(data.alertSummary.orange / data.alertSummary.total) * 100}%` }}
                />
              )}
              {data.alertSummary.yellow > 0 && (
                <div
                  className="bg-yellow-500 rounded-full transition-all duration-700"
                  style={{ width: `${(data.alertSummary.yellow / data.alertSummary.total) * 100}%` }}
                />
              )}
              {data.alertSummary.green > 0 && (
                <div
                  className="bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${(data.alertSummary.green / data.alertSummary.total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              {[
                { label: 'معوق', color: 'bg-red-500', count: data.alertSummary.red },
                { label: '۳ روزه', color: 'bg-orange-500', count: data.alertSummary.orange },
                { label: '۷ روزه', color: 'bg-yellow-500', count: data.alertSummary.yellow },
                { label: 'عادی', color: 'bg-emerald-500', count: data.alertSummary.green },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', item.color)} />
                  <span className="text-[10px] text-muted-foreground">
                    {item.label} ({toPersianDigits(item.count)})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Urgent Alerts Section ─── */}
      {urgentPurchases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <div className="w-5 h-5 rounded-md gradient-danger flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-white" />
              </div>
              هشدارهای سررسید
            </h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => onNavigate('purchases')}>
              مشاهده همه
              <ChevronLeft className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            {urgentPurchases.slice(0, 6).map((purchase: any) => {
              const colors = getAlertLevelColor(purchase.alertLevel);
              const days = daysUntilDue(purchase.dueDate);
              const statusInfo = getPurchaseStatusInfo(purchase.status);
              const remainingAmount = purchase.remainingAmount || (purchase.totalAmount - (purchase.paidAmount || 0));
              return (
                <Card key={purchase.id} className={cn('shadow-soft overflow-hidden card-hover')}>
                  <div className="flex">
                    {/* Right color indicator bar */}
                    <div className={cn('w-1 shrink-0', colors.dot)} />
                    <CardContent className="py-3 px-3 sm:px-4 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm truncate">{purchase.project?.name}</span>
                            <span className="text-muted-foreground text-[10px]">•</span>
                            <span className="text-xs text-muted-foreground truncate">{purchase.supplier?.companyName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span className="font-mono">{toPersianDigits(purchase.invoiceNumber)}</span>
                            <span>•</span>
                            <span>سررسید: {toPersianDate(purchase.dueDate)}</span>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="font-bold text-sm">{formatCurrency(remainingAmount)}</p>
                          <p className={cn('text-[11px] font-medium', colors.text)}>
                            {formatDaysRemaining(days)}
                          </p>
                        </div>
                      </div>
                      {/* Mobile: show badge on next line */}
                      <div className="mt-1.5 sm:hidden">
                        <Badge className={cn('text-[9px] h-5', statusInfo.color)} variant="secondary">
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </CardContent>
                    {/* Desktop: badge inline */}
                    <div className="hidden sm:flex items-center pl-3">
                      <Badge className={cn('text-[10px] h-5', statusInfo.color)} variant="secondary">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Two Columns: Creditor Suppliers + Debtor Projects ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Creditor Suppliers */}
        <Card className="shadow-soft">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Store className="w-3.5 h-3.5 text-primary" />
                </div>
                تامین‌کنندگان طلبکار
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-[11px] h-6" onClick={() => onNavigate('suppliers')}>
                همه
                <ChevronLeft className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-0">
              {(data.creditorSuppliers || []).slice(0, 5).map((s: any, idx: number) => (
                <div key={s.id} className={cn(
                  'flex items-center gap-3 py-2.5',
                  idx < (data.creditorSuppliers || []).slice(0, 5).length - 1 ? 'border-b border-border/50' : ''
                )}>
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.companyName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.contactName} • {toPersianDigits(s.purchaseCount)} فاکتور
                      {s.overdueCount > 0 && (
                        <span className="text-red-500 mr-1">
                          ({toPersianDigits(s.overdueCount)} معوق)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(s.totalDebt)}
                    </p>
                  </div>
                </div>
              ))}
              {(!data.creditorSuppliers || data.creditorSuppliers.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">بدهی باز وجود ندارد</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debtor Projects */}
        <Card className="shadow-soft">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                </div>
                پروژه‌های بدهکار
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-[11px] h-6" onClick={() => onNavigate('projects')}>
                همه
                <ChevronLeft className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-0">
              {(data.debtorProjects || []).slice(0, 5).map((p: any, idx: number) => {
                // Calculate progress (paid vs total) — approximate
                return (
                  <div key={p.id} className={cn(
                    'flex items-center gap-3 py-2.5',
                    idx < (data.debtorProjects || []).slice(0, 5).length - 1 ? 'border-b border-border/50' : ''
                  )}>
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.location}
                        {p.overdueCount > 0 && (
                          <span className="text-red-500 mr-1">
                            ({toPersianDigits(p.overdueCount)} معوق)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(p.totalDebt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!data.debtorProjects || data.debtorProjects.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">بدهی باز وجود ندارد</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Payment Overview ─── */}
      <Card className="shadow-soft">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
              </div>
              خلاصه مالی
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Wallet className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">کل خرید</p>
              <p className="text-sm font-bold">{formatCurrency(ds.totalPurchaseAmount)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-[10px] text-muted-foreground">پرداخت شده</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(ds.totalPaid)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <TrendingDown className="w-4 h-4 mx-auto mb-1.5 text-red-600 dark:text-red-400" />
              <p className="text-[10px] text-muted-foreground">بدهی باز</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(ds.totalDebt)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <ArrowLeftRight className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">درصد پرداخت</p>
              <p className="text-sm font-bold">{toPersianDigits(paidPercentage)}٪</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>پرداخت شده</span>
              <span>{toPersianDigits(paidPercentage)}٪</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Recent Purchases Table ─── */}
      <Card className="shadow-soft">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <ArrowUpLeft className="w-3.5 h-3.5 text-primary" />
              </div>
              آخرین خریدها
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-[11px] h-6" onClick={() => onNavigate('purchases')}>
              همه خریدها
              <ChevronLeft className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-4">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-[11px] border-b border-border">
                  <th className="text-right py-2 font-medium pr-2">شماره فاکتور</th>
                  <th className="text-right py-2 font-medium">پروژه</th>
                  <th className="text-right py-2 font-medium">تامین‌کننده</th>
                  <th className="text-right py-2 font-medium">مبلغ</th>
                  <th className="text-right py-2 font-medium">سررسید</th>
                  <th className="text-right py-2 font-medium pl-2">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentPurchases || []).map((p: any) => {
                  const statusInfo = getPurchaseStatusInfo(p.status);
                  const alertLevel = getDueDateAlertLevel(p.dueDate);
                  const colors = getAlertLevelColor(alertLevel);
                  return (
                    <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-2 font-mono text-xs">{toPersianDigits(p.invoiceNumber)}</td>
                      <td className="py-2.5">{p.project?.name}</td>
                      <td className="py-2.5 text-muted-foreground">{p.supplier?.companyName}</td>
                      <td className="py-2.5 font-medium">{formatCurrency(p.totalAmount)}</td>
                      <td className="py-2.5">
                        <span className={cn('text-xs', colors.text)}>{toPersianDate(p.dueDate)}</span>
                      </td>
                      <td className="py-2.5 pl-2">
                        <Badge className={cn('text-[10px] h-5', statusInfo.color)} variant="secondary">
                          {statusInfo.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {(data.recentPurchases || []).slice(0, 5).map((p: any) => {
              const statusInfo = getPurchaseStatusInfo(p.status);
              const alertLevel = getDueDateAlertLevel(p.dueDate);
              const colors = getAlertLevelColor(alertLevel);
              return (
                <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                  <div className={cn('w-1 h-8 rounded-full shrink-0', colors.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted-foreground">{toPersianDigits(p.invoiceNumber)}</span>
                      <Badge className={cn('text-[9px] h-4', statusInfo.color)} variant="secondary">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium truncate mt-0.5">{p.project?.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{p.supplier?.companyName}</span>
                      <span className="text-xs font-medium">{formatCurrency(p.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Stats footer ─── */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 text-[11px] text-muted-foreground">
        <span>{toPersianDigits(data.stats.activeProjects)} پروژه فعال</span>
        <span>•</span>
        <span>{toPersianDigits(data.stats.totalSuppliers)} تامین‌کننده</span>
        <span>•</span>
        <span>{toPersianDigits(data.stats.unpaidPurchases)} فاکتور باز</span>
      </div>
    </div>
  );
}
