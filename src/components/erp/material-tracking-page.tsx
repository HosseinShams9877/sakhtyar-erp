'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/components/project-context';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Package, Truck, Warehouse, TrendingDown, ArrowRight,
  ShoppingCart, RotateCcw, Filter, MapPin, Building2,
  ChevronDown, ChevronUp, AlertTriangle, Plus,
} from 'lucide-react';
import {
  toPersianDigits, formatNumber, formatCurrency, formatDate,
  UNIT_LABELS, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS,
} from '@/lib/rbac';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ───

interface TrackingItem {
  materialId: string;
  materialName: string;
  materialCode: string;
  unit: string;
  category: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  totalPurchased: number;
  totalDelivered: number;
  totalConsumed: number;
  totalReturned: number;
  warehouseQty: number;
  reservedQty: number;
  availableQty: number;
  vendors: { vendorId: string; vendorName: string; totalQty: number; totalAmount: number }[];
  lastPurchaseDate: string | null;
  lastDeliveryDate: string | null;
}

interface TransactionDetail {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  description: string | null;
  warehouseConfirmed: boolean;
  actualQuantity: number | null;
  discrepancy: string | null;
  material: { id: string; name: string; code: string; unit: string };
  project: { id: string; name: string; code: string };
  vendor: { id: string; companyName: string };
  invoice: { id: string; invoiceNumber: string } | null;
}

interface FilterData {
  projects: { id: string; name: string; code: string }[];
  materials: { id: string; name: string; code: string; unit: string }[];
  vendors: { id: string; companyName: string }[];
}

// ─── Stage Badge ───

function StageIndicator({ purchased, delivered, consumed, warehouse }: {
  purchased: number; delivered: number; consumed: number; warehouse: number;
}) {
  const stages = [
    { label: 'خرید', active: purchased > 0, icon: ShoppingCart, count: purchased },
    { label: 'تحویل', active: delivered > 0, icon: Truck, count: delivered },
    { label: 'انبار', active: warehouse > 0, icon: Warehouse, count: warehouse },
    { label: 'مصرف', active: consumed > 0, icon: TrendingDown, count: consumed },
  ];

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, idx) => (
        <React.Fragment key={stage.label}>
          {idx > 0 && (
            <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
          )}
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium',
              stage.active
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/40 text-muted-foreground/60'
            )}
          >
            <stage.icon className="w-3 h-3 flex-shrink-0" />
            <span>{toPersianDigits(stage.count)}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main Component ───

export default function MaterialTrackingPage() {
  const [summary, setSummary] = useState<TrackingItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [filters, setFilters] = useState<FilterData>({ projects: [], materials: [], vendors: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [detailItem, setDetailItem] = useState<TrackingItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { activeProject } = useProject();
  const selectedProjectId = activeProject?.id || '';
  // اصلاح موجودی
const [addDialogOpen, setAddDialogOpen] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [materials, setMaterials] = useState<any[]>([]);
const [form, setForm] = useState({ materialId: '', quantity: '' });

useEffect(() => {
  async function loadMaterials() {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/materials?projectId=${selectedProjectId}`);
      const data = await res.json();
      setMaterials(data.materials || []);
    } catch {
      // silent
    }
  }
  loadMaterials();
}, [selectedProjectId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set('projectId', projectFilter);
      if (materialFilter) params.set('materialId', materialFilter);
      if (vendorFilter) params.set('vendorId', vendorFilter);

      const res = await fetch(`/api/material-tracking?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || []);
        setTransactions(data.transactions || []);
        if (data.filters) setFilters(data.filters);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectFilter, materialFilter, vendorFilter]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !form.materialId || !form.quantity) {
      toast.error('لطفاً پروژه، مصالح و مقدار را وارد کنید');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/warehouse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          materialId: form.materialId,
          quantity: parseFloat(form.quantity),
          description: `تنظیم موجودی به ${form.quantity}`,
        }),
      });
      if (res.ok) {
        toast.success(`موجودی با موفقیت به ${form.quantity} تغییر یافت`);
        setForm({ materialId: '', quantity: '' });
        setAddDialogOpen(false);
        loadData(); // reload داده‌ها
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ثبت موجودی');
      }
    } catch {
      toast.error('خطا در ثبت موجودی');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  // فیلتر متنی
  const filteredSummary = summary.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.materialName.toLowerCase().includes(q) ||
      item.materialCode.toLowerCase().includes(q) ||
      item.projectName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.vendors.some(v => v.vendorName.toLowerCase().includes(q))
    );
  });

  // باز کردن جزئیات
  const openDetail = (item: TrackingItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  // تراکنش‌های مربوط به آیتم انتخاب‌شده
  const detailTransactions = detailItem
    ? transactions.filter(
        tx => tx.material.id === detailItem.materialId && tx.project.id === detailItem.projectId
      )
    : [];

  // آمار کلی
  const totalMaterials = filteredSummary.length;
  const totalInWarehouse = filteredSummary.reduce((s, i) => s + i.warehouseQty, 0);
  const totalPendingDelivery = filteredSummary.reduce(
    (s, i) => s + Math.max(0, i.totalPurchased - i.totalDelivered), 0
  );
  const totalConsumed = filteredSummary.reduce((s, i) => s + i.totalConsumed, 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* هدر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            رهگیری مصالح
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            چه کالایی از کدام فروشگاه برای کدام پروژه و اکنون کجاست؟
          </p>
        </div>
      </div>

      {/* فیلترها */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجوی مصالح، پروژه، فروشنده..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 input-modern rounded-xl"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48 rounded-xl">
                <SelectValue placeholder="همه پروژه‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه پروژه‌ها</SelectItem>
                {filters.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="w-48 rounded-xl">
                <SelectValue placeholder="همه مصالح" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مصالح</SelectItem>
                {filters.materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-48 rounded-xl">
                <SelectValue placeholder="همه فروشندگان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه فروشندگان</SelectItem>
                {filters.vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* آمار خلاصه */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">قلم مصالح</p>
              <p className="text-xl font-extrabold">{toPersianDigits(totalMaterials)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">موجودی انبار</p>
              <p className="text-xl font-extrabold">{toPersianDigits(totalInWarehouse)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 gradient-warning rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">در انتظار تحویل</p>
              <p className="text-xl font-extrabold">{toPersianDigits(totalPendingDelivery)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 gradient-danger rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">مصرف‌شده</p>
              <p className="text-xl font-extrabold">{toPersianDigits(totalConsumed)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول رهگیری */}
      <Card className="border-0 shadow-soft overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              زنجیره رهگیری مصالح
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {toPersianDigits(filteredSummary.length)} قلم
            </Badge>
          </div>
          <CardDescription className="text-[11px]">
            خرید ← تحویل ← انبار ← مصرف
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right text-[11px] font-semibold">مصالح</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold">پروژه</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold">فروشنده</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold min-w-[220px]">زنجیره رهگیری</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold">موجودی انبار</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold">آخرین تحویل</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted/50 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      داده‌ای برای نمایش یافت نشد
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSummary.map((item) => (
                    <TableRow
                      key={`${item.materialId}-${item.projectId}`}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openDetail(item)}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold">{item.materialName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.category && `${item.category} • `}{UNIT_LABELS[item.unit] || item.unit}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{item.projectName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.vendors.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.vendors.slice(0, 2).map((v) => (
                              <div key={v.vendorId} className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs truncate max-w-[120px]">{v.vendorName}</span>
                              </div>
                            ))}
                            {item.vendors.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{toPersianDigits(item.vendors.length - 2)} فروشنده دیگر
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">---</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StageIndicator
                          purchased={item.totalPurchased}
                          delivered={item.totalDelivered}
                          warehouse={item.warehouseQty}
                          consumed={item.totalConsumed}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-bold">{toPersianDigits(formatNumber(item.warehouseQty))}</span>
                          {item.reservedQty > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 mr-1">
                              ({toPersianDigits(formatNumber(item.reservedQty))} رزرو)
                            </span>
                          )}
                        </div>
                        {item.availableQty < item.warehouseQty && item.availableQty < item.totalPurchased && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              آزاد: {toPersianDigits(formatNumber(item.availableQty))}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.lastDeliveryDate ? formatDate(item.lastDeliveryDate) : '---'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* دیالوگ جزئیات */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              جزئیات رهگیری مصالح
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-5 mt-4">
              {/* اطلاعات مصالح */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30">
                  <p className="text-[10px] text-muted-foreground">مصالح</p>
                  <p className="text-sm font-bold">{detailItem.materialName}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-[10px] text-muted-foreground">پروژه</p>
                  <p className="text-sm font-bold">{detailItem.projectName}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <p className="text-[10px] text-muted-foreground">موجودی انبار</p>
                  <p className="text-sm font-bold">
                    {toPersianDigits(formatNumber(detailItem.warehouseQty))} {UNIT_LABELS[detailItem.unit] || detailItem.unit}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                  <p className="text-[10px] text-muted-foreground">رزرو شده</p>
                  <p className="text-sm font-bold">
                    {toPersianDigits(formatNumber(detailItem.reservedQty))} {UNIT_LABELS[detailItem.unit] || detailItem.unit}
                  </p>
                </div>
              </div>

              {/* زنجیره رهگیری */}
              <div>
                <h4 className="text-sm font-bold mb-3">زنجیره رهگیری</h4>
                <div className="flex items-center justify-between gap-2 p-4 rounded-xl bg-muted/30">
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center mb-1">
                      <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">خرید</p>
                    <p className="text-sm font-bold">{toPersianDigits(formatNumber(detailItem.totalPurchased))}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center mb-1">
                      <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">تحویل</p>
                    <p className="text-sm font-bold">{toPersianDigits(formatNumber(detailItem.totalDelivered))}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center mb-1">
                      <Warehouse className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">انبار</p>
                    <p className="text-sm font-bold">{toPersianDigits(formatNumber(detailItem.warehouseQty))}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mb-1">
                      <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">مصرف</p>
                    <p className="text-sm font-bold">{toPersianDigits(formatNumber(detailItem.totalConsumed))}</p>
                  </div>
                </div>
              </div>

              {/* فروشندگان */}
              {detailItem.vendors.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-2">فروشندگان</h4>
                  <div className="space-y-2">
                    {detailItem.vendors.map((v) => (
                      <div
                        key={v.vendorId}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{v.vendorName}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold">
                            {toPersianDigits(formatNumber(v.totalQty))} {UNIT_LABELS[detailItem.unit] || detailItem.unit}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(v.totalAmount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* تاریخچه تراکنش‌ها */}
              <div>
                <h4 className="text-sm font-bold mb-2">تاریخچه تراکنش‌ها</h4>
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-right text-[11px]">نوع</TableHead>
                        <TableHead className="text-right text-[11px]">مقدار</TableHead>
                        <TableHead className="text-right text-[11px]">فروشنده</TableHead>
                        <TableHead className="text-right text-[11px]">تاریخ</TableHead>
                        <TableHead className="text-right text-[11px]">وضعیت تحویل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                            تراکنشی یافت نشد
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailTransactions.map((tx) => (
                          <TableRow key={tx.id} className="hover:bg-muted/20">
                            <TableCell>
                              <Badge
                                className={cn(TRANSACTION_TYPE_COLORS[tx.type] || '', 'text-[11px]')}
                                variant="secondary"
                              >
                                {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                              {toPersianDigits(formatNumber(tx.quantity))} {UNIT_LABELS[tx.material?.unit] || ''}
                            </TableCell>
                            <TableCell className="text-sm">{tx.vendor?.companyName || '---'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(tx.date)}</TableCell>
                            <TableCell>
                              {tx.type === 'DELIVERY' ? (
                                tx.warehouseConfirmed ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]" variant="secondary">
                                    تأییدشده
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 text-[10px]" variant="secondary">
                                    در انتظار تأیید
                                  </Badge>
                                )
                              ) : (
                                <span className="text-[11px] text-muted-foreground">---</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
