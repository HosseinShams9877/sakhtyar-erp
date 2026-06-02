'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, FileText, BarChart3, Filter } from 'lucide-react';
import ShamsiDatePicker from '@/components/ui/shamsi-date-picker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS,
  UNIT_LABELS, formatNumber, formatCurrency, formatDate, formatDateMonthYear,
  toPersianDigits, PROJECT_STATUS_LABELS, ROLE_LABELS, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS,
} from '@/lib/rbac';

interface ReportData {
  transactions: any[];
  invoices: any[];
  materials: any[];
  projects: any[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [txRes, invRes, matRes, prjRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/invoices'),
        fetch('/api/materials'),
        fetch('/api/projects'),
      ]);
      const [txData, invData, matData, prjData] = await Promise.all([
        txRes.json(), invRes.json(), matRes.json(), prjRes.json(),
      ]);
      setData({
        transactions: Array.isArray(txData) ? txData : (txData?.transactions || []),
        invoices: Array.isArray(invData) ? invData : (invData?.invoices || invData || []),
        materials: Array.isArray(matData?.materials) ? matData.materials : Array.isArray(matData) ? matData : [],
        projects: Array.isArray(prjData) ? prjData : (prjData?.projects || []),
      });
    } catch { toast.error('خطا در بارگذاری داده‌ها'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportCSV = (reportType: string) => {
    if (!data) return;

    let csvContent = '';
    let filename = '';

    if (reportType === 'transactions') {
      csvContent = 'نوع,مصالح,پروژه,فروشنده,مقدار,قیمت واحد,مبلغ کل,تاریخ,توضیحات\n';
      const filtered = getFilteredTransactions();
      filtered.forEach((tx: any) => {
        csvContent += `${TRANSACTION_TYPE_LABELS[tx.type] || tx.type},${tx.material?.name || ''},${tx.project?.name || ''},${tx.vendor?.companyName || ''},${tx.quantity},${tx.unitPrice},${tx.totalPrice},${tx.date ? formatDate(tx.date) : ''},${tx.description || ''}\n`;
      });
      filename = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (reportType === 'invoices') {
      csvContent = 'شماره فاکتور,فروشنده,پروژه,مبلغ کل,مالیات,تاریخ,وضعیت\n';
      data.invoices.forEach((inv: any) => {
        csvContent += `${inv.invoiceNumber},${inv.vendor?.companyName || ''},${inv.project?.name || ''},${inv.totalAmount},${inv.taxAmount},${formatDate(inv.date)},${inv.status}\n`;
      });
      filename = `invoices-report-${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('فایل CSV دانلود شد');
  };

  const getFilteredTransactions = () => {
    if (!data) return [];
    let filtered = data.transactions;
    if (projectFilter !== 'all') {
      filtered = filtered.filter((tx: any) => tx.project?.id === projectFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tx: any) => tx.type === typeFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter((tx: any) => new Date(tx.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((tx: any) => new Date(tx.date) <= new Date(dateTo));
    }
    return filtered;
  };

  const getTotalPurchase = () => {
    return getFilteredTransactions()
      .filter((tx: any) => tx.type === 'PURCHASE')
      .reduce((sum: number, tx: any) => sum + (tx.totalPrice || 0), 0);
  };

  const getTotalDelivery = () => {
    return getFilteredTransactions()
      .filter((tx: any) => tx.type === 'DELIVERY')
      .reduce((sum: number, tx: any) => sum + (tx.totalPrice || 0), 0);
  };

  const getTotalReturns = () => {
    return getFilteredTransactions()
      .filter((tx: any) => tx.type === 'RETURN')
      .reduce((sum: number, tx: any) => sum + (tx.totalPrice || 0), 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-0 shadow-soft"><CardContent className="p-6"><div className="h-20 bg-muted/30 rounded-xl animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold">گزارش‌گیری</h3>
        <p className="text-sm text-muted-foreground">خروجی و تحلیل داده‌های سیستم</p>
      </div>

      {/* فیلترها */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="پروژه" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه پروژه‌ها</SelectItem>
                {data?.projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="نوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                {Object.entries(TRANSACTION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ShamsiDatePicker value={dateFrom} onChange={(v) => setDateFrom(v)} placeholder="از تاریخ" />
            <ShamsiDatePicker value={dateTo} onChange={(v) => setDateTo(v)} placeholder="تا تاریخ" />
            <Button variant="outline" size="sm" className="rounded-xl text-xs"
              onClick={() => { setProjectFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); }}>
              پاک کردن فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* خلاصه آماری */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مجموع خرید</p>
                <p className="text-xl font-extrabold mt-1">{formatCurrency(getTotalPurchase())}</p>
              </div>
              <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مجموع تحویل</p>
                <p className="text-xl font-extrabold mt-1">{formatNumber(getTotalDelivery())}</p>
              </div>
              <div className="w-10 h-10 gradient-info rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مرجوعی</p>
                <p className="text-xl font-extrabold mt-1">{formatNumber(getTotalReturns())}</p>
              </div>
              <div className="w-10 h-10 gradient-danger rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تب‌های گزارش */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="rounded-xl">
            <TabsTrigger value="transactions" className="rounded-lg text-xs">تراکنش‌ها</TabsTrigger>
            <TabsTrigger value="invoices" className="rounded-lg text-xs">فاکتورها</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg text-xs">خلاصه پروژه</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2 rounded-xl text-xs"
              onClick={() => handleExportCSV('transactions')}>
              <Download className="w-3.5 h-3.5" />
              خروجی CSV تراکنش‌ها
            </Button>
            <Button size="sm" variant="outline" className="gap-2 rounded-xl text-xs"
              onClick={() => handleExportCSV('invoices')}>
              <Download className="w-3.5 h-3.5" />
              خروجی CSV فاکتورها
            </Button>
          </div>
        </div>

        <TabsContent value="transactions">
          <Card className="border-0 shadow-soft overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-right text-xs">نوع</TableHead>
                      <TableHead className="text-right text-xs">مصالح</TableHead>
                      <TableHead className="text-right text-xs">پروژه</TableHead>
                      <TableHead className="text-right text-xs">فروشنده</TableHead>
                      <TableHead className="text-right text-xs">مقدار</TableHead>
                      <TableHead className="text-right text-xs">مبلغ کل</TableHead>
                      <TableHead className="text-right text-xs">تاریخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredTransactions().map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell><Badge className={TRANSACTION_TYPE_COLORS[tx.type] || ''} variant="secondary">{TRANSACTION_TYPE_LABELS[tx.type]}</Badge></TableCell>
                        <TableCell className="text-sm font-semibold">{tx.material?.name}</TableCell>
                        <TableCell className="text-sm">{tx.project?.name}</TableCell>
                        <TableCell className="text-sm">{tx.vendor?.companyName}</TableCell>
                        <TableCell className="text-sm">{formatNumber(tx.quantity)} {UNIT_LABELS[tx.material?.unit] || ''}</TableCell>
                        <TableCell className="text-sm font-semibold">{tx.totalPrice > 0 ? formatCurrency(tx.totalPrice) : '---'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="border-0 shadow-soft overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-right text-xs">شماره</TableHead>
                      <TableHead className="text-right text-xs">فروشنده</TableHead>
                      <TableHead className="text-right text-xs">پروژه</TableHead>
                      <TableHead className="text-right text-xs">مبلغ کل</TableHead>
                      <TableHead className="text-right text-xs">مالیات</TableHead>
                      <TableHead className="text-right text-xs">تاریخ</TableHead>
                      <TableHead className="text-right text-xs">وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-semibold text-sm">{toPersianDigits(inv.invoiceNumber)}</TableCell>
                        <TableCell className="text-sm">{inv.vendor?.companyName}</TableCell>
                        <TableCell className="text-sm">{inv.project?.name || '---'}</TableCell>
                        <TableCell className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(inv.taxAmount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(inv.date)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                            {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.projects.map((p: any) => {
              const projectTxs = data.transactions.filter((tx: any) => tx.project?.id === p.id);
              const totalPurchase = projectTxs.filter((tx: any) => tx.type === 'PURCHASE').reduce((s: number, tx: any) => s + tx.totalPrice, 0);
              const totalDelivery = projectTxs.filter((tx: any) => tx.type === 'DELIVERY').reduce((s: number, tx: any) => s + tx.totalPrice, 0);
              const budgetUsage = p.budget > 0 ? Math.round((totalPurchase / p.budget) * 100) : 0;
              return (
                <Card key={p.id} className="border-0 shadow-soft">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">{toPersianDigits(p.code)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div><span className="text-muted-foreground">وضعیت: </span>{PROJECT_STATUS_LABELS[p.status] || p.status}</div>
                      <div><span className="text-muted-foreground">بودجه: </span><span className="font-bold">{formatCurrency(p.budget)}</span></div>
                      <div><span className="text-muted-foreground">خرید: </span><span className="font-bold">{formatCurrency(totalPurchase)}</span></div>
                      <div><span className="text-muted-foreground">تعداد تراکنش: </span>{toPersianDigits(projectTxs.length)}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span>مصرف بودجه</span>
                        <span className="font-bold">{toPersianDigits(budgetUsage)}٪</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', budgetUsage > 90 ? 'bg-red-500' : budgetUsage > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                          style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


