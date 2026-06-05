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
  UNIT_LABELS, formatNumber, formatCurrency, formatDate,
  toPersianDigits, PROJECT_STATUS_LABELS, INVOICE_STATUS_LABELS,
} from '@/lib/rbac';
import { useProject } from '@/components/project-context';

// ✅ تعریف تایپ‌های دقیق
interface Transaction {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  material?: { id: string; name: string; unit: string };
  project?: { id: string; name: string };
  supplier?: { id: string; companyName: string };
  vendor?: { id: string; companyName: string };
  description?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  taxAmount: number;
  settlementDate?: string;
  date: string;
  status: string;
  supplier?: { id: string; companyName: string };
  vendor?: { id: string; companyName: string };
  project?: { id: string; name: string };
}

interface Material {
  id: string;
  name: string;
  unit: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  budget: number;
}

interface ReportData {
  transactions: Transaction[];
  invoices: Invoice[];
  materials: Material[];
  projects: Project[];
}

export default function ReportsPage() {
  const { activeProject } = useProject();
  const selectedProjectId = activeProject?.id || '';
  
  const [data, setData] = useState<ReportData>({
    transactions: [],
    invoices: [],
    materials: [],
    projects: [],
  });
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // تنظیم projectFilter بر اساس پروژه فعال در هدر
  useEffect(() => {
    if (selectedProjectId) {
      setProjectFilter(selectedProjectId);
    } else {
      setProjectFilter('all');
    }
  }, [selectedProjectId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const projectQuery = selectedProjectId ? `?projectId=${selectedProjectId}` : '';
      
      const [txRes, invRes, matRes, prjRes] = await Promise.all([
        fetch(`/api/transactions${projectQuery}`),
        fetch(`/api/invoices${projectQuery}`),
        fetch(`/api/materials${projectQuery}`),
        fetch('/api/projects'),
      ]);
      
      const txData = await txRes.json();
      let invData = await invRes.json();
      const matData = await matRes.json();
      const prjData = await prjRes.json();

      // پردازش فاکتورها
      let invoicesArray: Invoice[] = [];
      if (Array.isArray(invData)) {
        invoicesArray = invData;
      } else if (invData?.purchases && Array.isArray(invData.purchases)) {
        invoicesArray = invData.purchases;
      } else if (invData?.invoices && Array.isArray(invData.invoices)) {
        invoicesArray = invData.invoices;
      } else if (invData?.data && Array.isArray(invData.data)) {
        invoicesArray = invData.data;
      }
      
      setData({
        transactions: Array.isArray(txData) ? txData : (txData?.transactions || []),
        invoices: invoicesArray,
        materials: Array.isArray(matData?.materials) ? matData.materials : (Array.isArray(matData) ? matData : []),
        projects: Array.isArray(prjData) ? prjData : (prjData?.projects || []),
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('خطا در بارگذاری داده‌ها'); 
    } finally { 
      setLoading(false); 
    }
  }, [selectedProjectId]);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  const handleExportCSV = (reportType: string) => {
    if (!data) return;

    let csvContent = '';
    let filename = '';

    if (reportType === 'transactions') {
      csvContent = 'نوع,مصالح,پروژه,فروشنده,مقدار,قیمت واحد,مبلغ کل,تاریخ,توضیحات\n';
      const filtered = getFilteredTransactions();
      filtered.forEach((tx: Transaction) => {
        csvContent += `${TRANSACTION_TYPE_LABELS[tx.type] || tx.type},${tx.material?.name || ''},${tx.project?.name || ''},${tx.vendor?.companyName || ''},${tx.quantity},${tx.unitPrice},${tx.totalPrice},${tx.date ? formatDate(tx.date) : ''},${tx.description || ''}\n`;
      });
      filename = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (reportType === 'invoices') {
      csvContent = 'شماره فاکتور,فروشنده,پروژه,مبلغ کل,مالیات,تاریخ,وضعیت\n';
      data.invoices.forEach((inv: Invoice) => {
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

  const getFilteredTransactions = (): Transaction[] => {
    let filtered = data.transactions;
    if (selectedProjectId) {
      filtered = filtered.filter((tx) => tx.project?.id === selectedProjectId);
    } else if (projectFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.project?.id === projectFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === typeFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter((tx) => new Date(tx.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((tx) => new Date(tx.date) <= new Date(dateTo));
    }
    return filtered;
  };

  const getTotalPurchase = (): number => {
    return getFilteredTransactions()
      .filter((tx) => tx.type === 'PURCHASE')
      .reduce((sum, tx) => sum + (tx.totalPrice || 0), 0);
  };

  const getTotalDelivery = (): number => {
    return getFilteredTransactions()
      .filter((tx) => tx.type === 'DELIVERY')
      .reduce((sum, tx) => sum + (tx.totalPrice || 0), 0);
  };

  const getTotalReturns = (): number => {
    return getFilteredTransactions()
      .filter((tx) => tx.type === 'RETURN')
      .reduce((sum, tx) => sum + (tx.totalPrice || 0), 0);
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
        {selectedProjectId && activeProject && (
          <Badge variant="outline" className="mt-2 text-emerald-600 border-emerald-200">
            پروژه فعال: {activeProject.name}
          </Badge>
        )}
      </div>

      {/* فیلترها */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={projectFilter} onValueChange={setProjectFilter} disabled={!!selectedProjectId}>
              <SelectTrigger className="w-44 rounded-xl">
                <SelectValue placeholder="پروژه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه پروژه‌ها</SelectItem>
                {data?.projects.map((p) => (
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
              onClick={() => { setProjectFilter(selectedProjectId || 'all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); }}>
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
                    {getFilteredTransactions().map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="text-right">
                            <Badge className={TRANSACTION_TYPE_COLORS[tx.type] || ''} variant="secondary">
                              {TRANSACTION_TYPE_LABELS[tx.type]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-right">{tx.material?.name}</TableCell>
                        <TableCell className="text-sm text-right">{tx.project?.name}</TableCell>
                        <TableCell className="text-sm text-right">{tx.supplier?.companyName || '---'}</TableCell>
                        <TableCell className="text-sm text-right">
                          {formatNumber(tx.quantity)} {UNIT_LABELS[tx.material?.unit as string] || tx.material?.unit || ''}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-right">{tx.totalPrice > 0 ? formatCurrency(tx.totalPrice) : '---'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground text-right">{formatDate(tx.date)}</TableCell>
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
                <Table dir="rtl">
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
                    {data.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-semibold text-sm text-right">{toPersianDigits(inv.invoiceNumber)}</TableCell>
                        <TableCell className="text-sm text-right">{inv.supplier?.companyName || '---'}</TableCell>
                        <TableCell className="text-sm text-right">{inv.project?.name || '---'}</TableCell>
                        <TableCell className="text-sm font-semibold text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className="text-sm text-right">{formatCurrency(inv.taxAmount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground text-right">
  {inv.settlementDate ? formatDate(inv.settlementDate) : '---'}
</TableCell>
                        <TableCell className="text-right">
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
            {data.projects
              .filter(p => !selectedProjectId || p.id === selectedProjectId)
              .map((p) => {
              const projectTxs = data.transactions.filter((tx) => tx.project?.id === p.id);
              const totalPurchase = projectTxs.filter((tx) => tx.type === 'PURCHASE').reduce((s, tx) => s + (tx.totalPrice || 0), 0);
              const budgetUsage = p.budget > 0 ? Math.round((totalPurchase / p.budget) * 100) : 0;
              return (
                <Card key={p.id} className="border-0 shadow-soft">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">{toPersianDigits(p.code)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl">
                        <span className="text-muted-foreground">وضعیت</span>
                        <span className="font-semibold">{PROJECT_STATUS_LABELS[p.status] || p.status}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl">
                        <span className="text-muted-foreground">بودجه</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.budget)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl">
                        <span className="text-muted-foreground">خرید</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalPurchase)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl">
                        <span className="text-muted-foreground">تعداد تراکنش</span>
                        <span className="font-semibold bg-muted/50 px-2 py-0.5 rounded-full">{toPersianDigits(projectTxs.length)}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">مصرف بودجه</span>
                        <span className={cn(
                          "font-bold px-2 py-0.5 rounded-full",
                          budgetUsage > 90 ? "text-red-600 bg-red-50" : 
                          budgetUsage > 70 ? "text-amber-600 bg-amber-50" : 
                          "text-emerald-600 bg-emerald-50"
                        )}>
                          {toPersianDigits(budgetUsage)}٪
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', 
                            budgetUsage > 90 ? 'bg-gradient-to-r from-red-500 to-rose-500' : 
                            budgetUsage > 70 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 
                            'bg-gradient-to-r from-emerald-500 to-green-500'
                          )}
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