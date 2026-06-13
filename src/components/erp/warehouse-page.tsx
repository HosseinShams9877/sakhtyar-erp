'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Package, Warehouse, AlertTriangle, Plus, Search, Check, ArrowRight,
  TrendingDown, Layers, ShoppingCart, Truck, RotateCcw, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  toPersianDigits, formatNumber, formatCurrency, formatDate,
  UNIT_LABELS, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS,
} from '@/lib/rbac';
import { useProject } from '@/components/project-context';
import { cn } from '@/lib/utils';

// ─── Types ───

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  minStock: number;
  category: { id: string; name: string };
}

interface WarehouseStockItem {
  id: string;
  projectId: string;
  materialId: string;
  quantity: number;
  materialName: string;      
  unit: string;             
  minStock?: number; 
  reservedQuantity: number;
  availableQuantity: number;
  createdAt: string;
  updatedAt: string;
  material: Material;
  project: { id: string; name: string };
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description: string | null;
  deliveryPerson: string | null;
  date: string;
  warehouseConfirmed: boolean;
  actualQuantity: number | null;
  discrepancy: string | null;
  material: { id: string; name: string; unit: string };
  project: { id: string; name: string };
  vendor: { id: string; companyName: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

// ─── Stat Card ───

function StatCard({
  title, value, icon: Icon, description, gradient, badge,
}: {
  title: string; value: string | number; icon: React.ElementType;
  description?: string; gradient: string; badge?: React.ReactNode;
}) {
  return (
    <Card className="card-hover border-0 shadow-soft overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className={cn('w-14 flex items-center justify-center flex-shrink-0', gradient)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              {badge}
            </div>
            <p className="text-2xl font-extrabold mt-1 tracking-tight">{value}</p>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stock Level Bar ───

function StockLevelBar({ available, total }: { available: number; total: number }) {
  const percentage = total > 0 ? Math.max(0, Math.min(100, (available / total) * 100)) : 0;
  const barColor = percentage > 50
    ? 'bg-emerald-500'
    : percentage > 25
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2.5 bg-muted/60 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground w-10 text-left font-medium">
        {toPersianDigits(Math.round(percentage))}٪
      </span>
    </div>
  );
}

// ─── Transaction Type Icon ───

function TransactionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'PURCHASE': return <ShoppingCart className="w-3.5 h-3.5" />;
    case 'DELIVERY': return <Truck className="w-3.5 h-3.5" />;
    case 'CONSUMPTION': return <Package className="w-3.5 h-3.5" />;
    case 'RETURN': return <RotateCcw className="w-3.5 h-3.5" />;
    case 'ADJUSTMENT': return <Settings2 className="w-3.5 h-3.5" />;
    default: return <Package className="w-3.5 h-3.5" />;
  }
}

// ─── Empty Form ───

const emptyForm = {
  materialId: '',
  quantity: '',
  reservedQuantity: '0',
};

const emptyConfirmForm = {
  actualQuantity: '',
  discrepancy: '',
};

// ─── Main Component ───

export default function WarehousePage() {
  const [stocks, setStocks] = useState<WarehouseStockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirmForm, setConfirmForm] = useState(emptyConfirmForm);
  const { activeProject } = useProject();
  const selectedProjectId = activeProject?.id || '';

  // ─── Load Materials ───

  // ─── Load Materials ───
useEffect(() => {
  async function loadMaterials() {
    if (!selectedProjectId) {
      setMaterials([]);
      return;
    }
    try {
      const res = await fetch(`/api/materials?projectId=${selectedProjectId}`);
      const data = await res.json();
      setMaterials(data.materials || []);
    } catch {
      // silent
    }
  }
  loadMaterials();
}, [selectedProjectId]); // ✅ اضافه کردن selectedProjectId به dependency

const loadTransactions = useCallback(async () => {
  if (!selectedProjectId) {
    setTransactions([]);
    return;
  }
  setLoadingTransactions(true);
  try {
    const res = await fetch(`/api/transactions?projectId=${selectedProjectId}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } else {
      setTransactions([]);
    }
  } catch {
    setTransactions([]);
  } finally {
    setLoadingTransactions(false);
  }
}, [selectedProjectId]);
  // ─── Load Warehouse Stock ───
 // ─── Load Warehouse Stock ───
const loadStocks = useCallback(async () => {
  if (!selectedProjectId) {
    setStocks([]);
    return;
  }
  setLoadingStocks(true);
  try {
    const res = await fetch(`/api/materials?projectId=${selectedProjectId}`);
    if (res.ok) {
      const data = await res.json();
      const materials = data.materials || [];
      
      const stocksData = materials.map((material: any) => ({
        id: material.id,
        projectId: selectedProjectId,
        materialId: material.id,
        quantity: material.stock || 0,
        materialName: material.name,
        unit: material.unit,
        minStock: material.minStock,
        reservedQuantity: 0,
        availableQuantity: material.stock || 0,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
        material: material,
        project: { id: selectedProjectId, name: activeProject?.name || '' }
      }));
      
      setStocks(stocksData);
    } else {
      setStocks([]);
    }
  } catch (error) {
    console.error('Error loading materials:', error);
    setStocks([]);
  } finally {
    setLoadingStocks(false);
  }
}, [selectedProjectId, activeProject?.name]);
 
  // ─── Load Recent Transactions ───

  useEffect(() => {
    loadStocks();
    loadTransactions();
  }, [loadStocks, loadTransactions]);

  // ─── Computed Stats ───

  const totalItems = stocks.reduce((sum, s) => sum + s.quantity, 0);
  const totalDistinctMaterials = stocks.length;
  const lowStockItems = stocks.filter(
    (s) => s.quantity < (s.minStock || 0)  // ✅ استفاده از minStock مستقیم
  ).length;

  // ─── Filtered Stocks ───

  const filteredStocks = (() => {
    const filtered = stocks.filter((s) => {
      if (!stockSearch) return true;
      const q = stockSearch.toLowerCase();
      return (
        s.materialName?.toLowerCase().includes(q) ||  
        s.material?.name?.toLowerCase().includes(q) ||
        s.material?.code?.toLowerCase().includes(q)
      );
    });
    return filtered;
  })();

  // ─── Filtered Transactions (limit 20 recent) ───

  const recentTransactions = transactions.slice(0, 20);

  // ─── Delivery transactions pending confirmation ───

  const deliveryTransactions = transactions.filter(
    (tx) => tx.type === 'DELIVERY' && !tx.warehouseConfirmed
  );

  // ─── Add Stock ───

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
          quantity: parseFloat(form.quantity), // مقدار جدید (جایگزین)
          description: `تنظیم موجودی به ${form.quantity}`,
        }),
      });
      if (res.ok) {
        toast.success(`موجودی با موفقیت به ${form.quantity} تغییر یافت`);
        setForm(emptyForm);
        setAddDialogOpen(false);
        loadStocks(); // reload موجودی جدید
        loadTransactions(); // reload تراکنش‌ها
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
  // ─── Confirm Delivery ───

  const openConfirmDialog = (txId: string) => {
    setConfirmingTxId(txId);
    setConfirmForm(emptyConfirmForm);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingTxId) return;
    if (!confirmForm.actualQuantity) {
      toast.error('مقدار واقعی تحویل‌شده را وارد کنید');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: confirmingTxId,
          warehouseConfirmed: true,
          actualQuantity: parseFloat(confirmForm.actualQuantity),
          discrepancy: confirmForm.discrepancy || null,
        }),
      });
      if (res.ok) {
        toast.success('تحویل با موفقیت تأیید شد');
        setConfirmDialogOpen(false);
        setConfirmingTxId(null);
        loadStocks();
        loadTransactions();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در تأیید تحویل');
      }
    } catch {
      toast.error('خطا در تأیید تحویل');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───

  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-primary" />
            مدیریت انبار
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            خرید ← تحویل ← انبار ← مصرف
          </p>
        </div>
       
      </div>

      {/* ─── Summary Stats ─── */}
      {selectedProjectId && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="مجموع اقلام انبار"
            value={toPersianDigits(totalItems)}
            icon={Layers}
            description="مجموع تعداد تمامی اقلام"
            gradient="gradient-primary"
          />
          <StatCard
            title="انواع مصالح"
            value={toPersianDigits(totalDistinctMaterials)}
            icon={Package}
            description="مصالح متمایز در انبار"
            gradient="gradient-success"
          />
          <StatCard
            title="مصالح کم‌موجی"
            value={toPersianDigits(lowStockItems)}
            icon={AlertTriangle}
            description="زیر حداقل موجودی"
            gradient={lowStockItems > 0 ? 'gradient-danger' : 'gradient-success'}
            badge={
              lowStockItems > 0 ? (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  هشدار
                </Badge>
              ) : undefined
            }
          />
        </div>
      )}

      {/* ─── No Project Selected ─── */}
      {!selectedProjectId && (
        <Card className="border-0 shadow-soft overflow-hidden">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
              <Warehouse className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-bold text-base mb-1">پروژه‌ای انتخاب نشده</h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              لطفاً از منوی بالا یک پروژه را انتخاب کنید تا موجودی انبار آن نمایش داده شود.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Warehouse Stock Table ─── */}
      {selectedProjectId && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجوی مصالح..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="pr-9 input-modern rounded-xl"
              />
            </div>
            {deliveryTransactions.length > 0 && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs border-amber-300 text-amber-700 bg-amber-50">
                <Truck className="w-3 h-3" />
                {toPersianDigits(deliveryTransactions.length)} تحویل در انتظار تأیید
              </Badge>
            )}
          </div>

          <Card className="border-0 shadow-soft overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-right text-xs font-semibold">نام مصالح</TableHead>
                      <TableHead className="text-right text-xs font-semibold">واحد</TableHead>
                      <TableHead className="text-right text-xs font-semibold">موجودی</TableHead>
                      <TableHead className="text-right text-xs font-semibold">رزرو شده</TableHead>
                      <TableHead className="text-right text-xs font-semibold">قابل استفاده</TableHead>
                      <TableHead className="text-right text-xs font-semibold min-w-[180px]">سطح موجودی</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
  {loadingStocks ? (
    [...Array(5)].map((_, i) => (
      <TableRow key={i}>
        {[...Array(6)].map((_, j) => (
          <TableCell key={j}>
            <div className="h-4 bg-muted/50 rounded animate-pulse" />
          </TableCell>
        ))}
      </TableRow>
    ))
  ) : filteredStocks.length === 0 ? (
    <TableRow>
      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
        {stockSearch ? 'مصالحی با این عبارت یافت نشد' : 'موجودی انبار برای این پروژه ثبت نشده است'}
      </TableCell>
    </TableRow>
  ) : (
    filteredStocks.map((stock) => {
      // ✅ استفاده از فیلدهای مستقیم API (بدون stock.material)
      const materialName = stock.materialName || '---';
      const unit = stock.unit || '---';
      const quantity = stock.quantity || 0;
      const reservedQuantity = stock.reservedQuantity || 0;
      const availableQuantity = stock.availableQuantity || 0;
      const isLow = quantity < (stock.minStock || 0);
      
      return (
        <TableRow
          key={stock.id}
          className={cn(
            'hover:bg-muted/30 transition-colors',
            isLow && 'bg-rose-50/50 dark:bg-rose-950/20'
          )}
        >
          <TableCell>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{materialName}</span>
              {isLow && (
                <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0">
                  <AlertTriangle className="w-3 h-3" />
                  کم‌موجی
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="text-sm">
            {UNIT_LABELS[unit] || unit}
          </TableCell>
          <TableCell className="text-sm font-semibold">
            {toPersianDigits(formatNumber(quantity))}
          </TableCell>
          <TableCell className="text-sm text-amber-600 dark:text-amber-400">
            {toPersianDigits(formatNumber(reservedQuantity))}
          </TableCell>
          <TableCell className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {toPersianDigits(formatNumber(availableQuantity))}
          </TableCell>
          <TableCell>
            <StockLevelBar
              available={availableQuantity}
              total={quantity}
            />
          </TableCell>
        </TableRow>
      );
    })
  )}
</TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ─── Recent Transactions ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-base font-extrabold">تراکنش‌های اخیر پروژه</h4>
              <Badge variant="secondary" className="text-[10px]">
                {toPersianDigits(recentTransactions.length)} تراکنش
              </Badge>
            </div>

            <Card className="border-0 shadow-soft overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                        <TableHead className="text-right text-xs font-semibold">نوع</TableHead>
                        <TableHead className="text-right text-xs font-semibold">مصالح</TableHead>
                        <TableHead className="text-right text-xs font-semibold">مقدار</TableHead>
                        <TableHead className="text-right text-xs font-semibold">تاریخ</TableHead>
                        <TableHead className="text-right text-xs font-semibold">فروشنده</TableHead>
                        <TableHead className="text-right text-xs font-semibold">وضعیت تحویل</TableHead>
                        <TableHead className="text-right text-xs font-semibold">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTransactions ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            {[...Array(7)].map((_, j) => (
                              <TableCell key={j}>
                                <div className="h-4 bg-muted/50 rounded animate-pulse" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : recentTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            تراکنشی برای این پروژه یافت نشد
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentTransactions.map((tx) => (
                          <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <Badge
                                className={cn(
                                  TRANSACTION_TYPE_COLORS[tx.type] || 'bg-gray-100 text-gray-800',
                                  'gap-1 text-[11px]'
                                )}
                                variant="secondary"
                              >
                                <TransactionTypeIcon type={tx.type} />
                                {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {tx.material?.name || '---'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {toPersianDigits(formatNumber(tx.quantity))}{' '}
                              <span className="text-muted-foreground text-[11px]">
                                {UNIT_LABELS[tx.material?.unit] || ''}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(tx.date)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {tx.vendor?.companyName || '---'}
                            </TableCell>
                            <TableCell>
                              {tx.type === 'DELIVERY' ? (
                                tx.warehouseConfirmed ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 gap-1 text-[11px]" variant="secondary">
                                    <Check className="w-3 h-3" />
                                    تأییدشده
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 gap-1 text-[11px]" variant="secondary">
                                    <AlertTriangle className="w-3 h-3" />
                                    در انتظار تأیید
                                  </Badge>
                                )
                              ) : (
                                <span className="text-muted-foreground text-[11px]">---</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {tx.type === 'DELIVERY' && !tx.warehouseConfirmed ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 rounded-lg text-[11px] h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                                  onClick={() => openConfirmDialog(tx.id)}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  تأیید تحویل
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">---</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ─── Confirm Delivery Dialog ─── */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              تأیید تحویل انبار
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmDelivery} className="space-y-4 mt-4">
            <div className="p-3 rounded-xl bg-muted/50 space-y-1">
              <p className="text-sm font-semibold">
                {confirmingTxId
                  ? transactions.find((t) => t.id === confirmingTxId)?.material?.name || ''
                  : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                تعداد فاکتوری:{' '}
                {toPersianDigits(
                  formatNumber(
                    confirmingTxId
                      ? transactions.find((t) => t.id === confirmingTxId)?.quantity || 0
                      : 0
                  )
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">مقدار واقعی تحویل‌شده *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={confirmForm.actualQuantity}
                onChange={(e) => setConfirmForm({ ...confirmForm, actualQuantity: e.target.value })}
                className="input-modern rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">توضیح مغایرت</Label>
              <Input
                value={confirmForm.discrepancy}
                onChange={(e) => setConfirmForm({ ...confirmForm, discrepancy: e.target.value })}
                placeholder="در صورت مغایرت وارد کنید..."
                className="input-modern rounded-xl"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDialogOpen(false)}
                className="rounded-xl"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-soft"
              >
                <Check className="w-4 h-4" />
                {submitting ? '...' : 'تأیید تحویل'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
