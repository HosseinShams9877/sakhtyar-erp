'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Download,
  Building2,
  Store,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toPersianDigits, formatCurrency, toPersianDate, getPurchaseStatusInfo } from '@/lib/persian';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Project { id: string; name: string; totalDebt: number; }
interface Supplier { id: string; companyName: string; totalDebt: number; }
interface Purchase {
  id: string; invoiceNumber: string; projectId: string; supplierId: string;
  purchaseDate: string; dueDate: string; totalAmount: number; paidAmount: number;
  status: string; project?: Project; supplier?: Supplier;
  items: any[];
}

export default function ReportsPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      const [pRes, prRes, sRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/projects'),
        fetch('/api/suppliers'),
      ]);
      if (pRes.ok) setPurchases(await pRes.json());
      if (prRes.ok) setProjects(await prRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = purchases.filter(p => {
    if (projectFilter !== 'all' && p.projectId !== projectFilter) return false;
    if (supplierFilter !== 'all' && p.supplierId !== supplierFilter) return false;
    return true;
  });

  const totalDebt = filtered.reduce((sum, p) => sum + (p.totalAmount - (p.paidAmount || 0)), 0);
  const totalPaid = filtered.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalAmount = filtered.reduce((sum, p) => sum + p.totalAmount, 0);

  const exportCSV = () => {
    const headers = ['شماره فاکتور', 'پروژه', 'تامین‌کننده', 'تاریخ خرید', 'سررسید', 'مبلغ کل', 'پرداخت شده', 'مانده', 'وضعیت'];
    const rows = filtered.map(p => [
      p.invoiceNumber,
      p.project?.name || '',
      p.supplier?.companyName || '',
      toPersianDate(p.purchaseDate),
      toPersianDate(p.dueDate),
      p.totalAmount,
      p.paidAmount || 0,
      p.totalAmount - (p.paidAmount || 0),
      p.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">گزارش‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">خلاصه مالی و گزارش خرید</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          خروجی CSV
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">مبلغ کل خریدها</p>
            <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">پرداخت شده</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">مانده بدهی</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Building2 className="w-4 h-4 ml-2" />
            <SelectValue placeholder="همه پروژه‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه پروژه‌ها</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Store className="w-4 h-4 ml-2" />
            <SelectValue placeholder="همه تامین‌کنندگان" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه تامین‌کنندگان</SelectItem>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Project debt summary */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            خلاصه بدهی پروژه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projects.map(project => {
              const projectPurchases = filtered.filter(p => p.projectId === project.id);
              const debt = projectPurchases.reduce((sum, p) => sum + (p.totalAmount - (p.paidAmount || 0)), 0);
              if (debt <= 0 && projectPurchases.length === 0) return null;
              const maxDebt = Math.max(...projects.map(p => p.totalDebt || 0), 1);
              const width = Math.max(5, (debt / maxDebt) * 100);
              return (
                <div key={project.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{project.name}</span>
                    <span className={cn('font-bold', debt > 0 ? 'text-red-600' : 'text-emerald-600')}>
                      {formatCurrency(debt)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', debt > 0 ? 'bg-red-400' : 'bg-emerald-400')}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Purchases table */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">لیست خریدها</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs border-b border-border">
                  <th className="text-right py-2 font-medium">شماره فاکتور</th>
                  <th className="text-right py-2 font-medium">پروژه</th>
                  <th className="text-right py-2 font-medium">تامین‌کننده</th>
                  <th className="text-right py-2 font-medium">تاریخ خرید</th>
                  <th className="text-right py-2 font-medium">سررسید</th>
                  <th className="text-right py-2 font-medium">مبلغ کل</th>
                  <th className="text-right py-2 font-medium">پرداخت شده</th>
                  <th className="text-right py-2 font-medium">مانده</th>
                  <th className="text-right py-2 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const statusInfo = getPurchaseStatusInfo(p.status);
                  const remaining = p.totalAmount - (p.paidAmount || 0);
                  return (
                    <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 font-mono text-xs">{toPersianDigits(p.invoiceNumber)}</td>
                      <td className="py-2.5">{p.project?.name}</td>
                      <td className="py-2.5 text-muted-foreground">{p.supplier?.companyName}</td>
                      <td className="py-2.5">{toPersianDate(p.purchaseDate)}</td>
                      <td className="py-2.5">{toPersianDate(p.dueDate)}</td>
                      <td className="py-2.5">{formatCurrency(p.totalAmount)}</td>
                      <td className="py-2.5 text-emerald-600">{formatCurrency(p.paidAmount || 0)}</td>
                      <td className={cn('py-2.5 font-medium', remaining > 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {formatCurrency(remaining)}
                      </td>
                      <td className="py-2.5">
                        <Badge className={cn('text-[10px]', statusInfo.color)} variant="secondary">
                          {statusInfo.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
