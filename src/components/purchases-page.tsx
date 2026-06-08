'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  Upload,
  X,
  Trash2,
  Check,
  ShoppingCart,ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import ShamsiDatePicker from '@/components/ui/shamsi-date-picker';
import { toPersianDigits, formatCurrency, toPersianDate, toShamsi, fromShamsi, daysUntilDue, getDueDateAlertLevel, getAlertLevelColor, formatDaysRemaining, getPurchaseStatusInfo } from '@/lib/persian';
import type { AlertLevel } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Project { id: string; name: string; }
interface Supplier { id: string; companyName: string; }
interface PurchaseItem { id?: string; materialName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; }
interface Purchase {
  id: string; invoiceNumber: string; projectId: string; supplierId: string;
  purchaseDate: string; dueDate: string; totalAmount: number; paidAmount: number;
  status: string; invoiceImage: string | null; description: string | null;
  project?: Project; supplier?: Supplier;
  items: PurchaseItem[];
  delivery?: any; payments?: any[];
}

const UNITS = ['کیلوگرم', 'تن', 'متر', 'مترمربع', 'مترمکعب', 'عدد', 'لیتر', 'کیسه', 'قرص', 'دسته', 'رول', 'شاخه'];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form fields
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState(toShamsi(new Date()));
  const [formDueDate, setFormDueDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formItems, setFormItems] = useState<PurchaseItem[]>([
    { materialName: '', quantity: 0, unit: 'کیلوگرم', unitPrice: 0, totalPrice: 0 }
  ]);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(toShamsi(new Date()));

  const fetchPurchases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/purchases?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPurchases(json);
      }
    } catch { toast.error('خطا در بارگذاری خریدها'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  const fetchOptions = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/suppliers'),
      ]);
      if (pRes.ok) setProjects(await pRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
    } catch {}
  }, []);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);
  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const resetForm = () => {
    setFormInvoiceNumber(''); setFormProjectId(''); setFormSupplierId('');
    setFormPurchaseDate(toShamsi(new Date())); setFormDueDate('');
    setFormDescription('');
    setFormItems([{ materialName: '', quantity: 0, unit: 'کیلوگرم', unitPrice: 0, totalPrice: 0 }]);
    setFormImage(null); setFormImagePreview(null);
    setEditMode(false); setSelectedPurchase(null);
  };

  const openNewForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (p: Purchase) => {
    setFormInvoiceNumber(p.invoiceNumber);
    setFormProjectId(p.projectId);
    setFormSupplierId(p.supplierId);
    setFormPurchaseDate(toShamsi(new Date(p.purchaseDate)));
    setFormDueDate(toShamsi(new Date(p.dueDate)));
    setFormDescription(p.description || '');
    setFormItems(p.items.length > 0 ? p.items : [{ materialName: '', quantity: 0, unit: 'کیلوگرم', unitPrice: 0, totalPrice: 0 }]);
    setFormImagePreview(p.invoiceImage);
    setEditMode(true); setSelectedPurchase(p);
    setShowForm(true);
  };

  const updateFormItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...formItems];
    (newItems[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }
    setFormItems(newItems);
  };

  const addFormItem = () => {
    setFormItems([...formItems, { materialName: '', quantity: 0, unit: 'کیلوگرم', unitPrice: 0, totalPrice: 0 }]);
  };

  const removeFormItem = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const totalAmount = formItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImage(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!formInvoiceNumber || !formProjectId || !formSupplierId || !formDueDate) {
      toast.error('لطفاً تمام فیلدهای الزامی را پر کنید');
      return;
    }
    if (formItems.some(item => !item.materialName || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error('لطفاً تمام اقلام را تکمیل کنید');
      return;
    }

    setSaving(true);
    try {
      let imagePath = formImagePreview;
      // Upload image if new
      if (formImage) {
        const formData = new FormData();
        formData.append('file', formImage);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          imagePath = uploadJson.path;
        }
      }

      const body = {
        invoiceNumber: formInvoiceNumber,
        projectId: formProjectId,
        supplierId: formSupplierId,
        purchaseDate: fromShamsi(formPurchaseDate).toISOString(),
        dueDate: fromShamsi(formDueDate).toISOString(),
        totalAmount,
        description: formDescription || undefined,
        invoiceImage: imagePath || undefined,
        items: formItems.map(item => ({
          materialName: item.materialName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };

      const res = editMode && selectedPurchase
        ? await fetch('/api/purchases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedPurchase.id, ...body }) })
        : await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      if (res.ok) {
        toast.success(editMode ? 'فاکتور بروزرسانی شد' : 'فاکتور ثبت شد');
        setShowForm(false);
        resetForm();
        fetchPurchases();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ثبت فاکتور');
      }
    } catch {
      toast.error('خطا در ثبت فاکتور');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این فاکتور اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/purchases?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('فاکتور حذف شد'); fetchPurchases(); }
    } catch { toast.error('خطا در حذف'); }
  };

  const handlePayment = async () => {
    if (!selectedPurchase || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('مبلغ پرداخت را وارد کنید');
      return;
    }
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: selectedPurchase.id,
          amount: Number(paymentAmount),
          paymentDate: fromShamsi(paymentDate).toISOString(),
          note: paymentNote || undefined,
        }),
      });
      if (res.ok) {
        toast.success('پرداخت ثبت شد');
        setShowPayment(false);
        setPaymentAmount(''); setPaymentNote('');
        fetchPurchases();
      }
    } catch { toast.error('خطا در ثبت پرداخت'); }
  };

  const filteredPurchases = purchases.filter(p =>
    !search || p.invoiceNumber.includes(search) || p.project?.name.includes(search) || p.supplier?.companyName.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="md:hidden mb-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 text-lg font-medium hover:bg-muted"
        >
        <ArrowLeft className="w-6 h-6" />
       </Button>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">خریدها</h1>
          <p className="text-sm text-muted-foreground mt-1">ثبت و مدیریت فاکتورهای خرید مصالح</p>
        </div>
        <Button onClick={openNewForm} className="gradient-primary text-white border-0 gap-2">
          <Plus className="w-4 h-4" />
          ثبت فاکتور جدید
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو در شماره فاکتور، پروژه، تامین‌کننده..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="pending">در انتظار</SelectItem>
            <SelectItem value="partial">پرداخت جزئی</SelectItem>
            <SelectItem value="paid">تسویه شده</SelectItem>
            <SelectItem value="overdue">معوق</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Purchase list */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>فاکتوری یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPurchases.map((purchase) => {
            const alertLevel = getDueDateAlertLevel(purchase.dueDate);
            const colors = getAlertLevelColor(alertLevel);
            const days = daysUntilDue(purchase.dueDate);
            const statusInfo = getPurchaseStatusInfo(purchase.status);
            const remaining = purchase.totalAmount - (purchase.paidAmount || 0);

            return (
              <Card
                key={purchase.id}
                className={cn('shadow-soft hover:shadow-soft-md transition-all cursor-pointer group', `border-r-2`)}
                style={{ borderRightColor: colors.dot === 'bg-red-500' ? '#ef4444' : colors.dot === 'bg-orange-500' ? '#f97316' : colors.dot === 'bg-yellow-500' ? '#eab308' : '#10b981' }}
                onClick={() => { setSelectedPurchase(purchase); setShowDetail(true); }}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">فاکتور {toPersianDigits(purchase.invoiceNumber)}</span>
                        <Badge className={cn('text-[10px]', statusInfo.color)} variant="secondary">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{purchase.project?.name}</span>
                        <span>•</span>
                        <span>{purchase.supplier?.companyName}</span>
                      </div>
                    </div>
                    <div className="text-left min-w-[120px]">
                      <p className="font-bold text-sm">{formatCurrency(remaining)}</p>
                      <p className={cn('text-xs', colors.text)}>{formatDaysRemaining(days)}</p>
                    </div>
                    <div className="text-left text-xs text-muted-foreground min-w-[80px]">
                      <p>سررسید: {toPersianDate(purchase.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={e => { e.stopPropagation(); openEditForm(purchase); }}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {purchase.status !== 'paid' && (
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={e => { e.stopPropagation(); setSelectedPurchase(purchase); setShowPayment(true); }}>
                          <CreditCard className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(purchase.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── New/Edit Purchase Dialog ─── */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editMode ? 'ویرایش فاکتور' : 'ثبت فاکتور جدید'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>شماره فاکتور *</Label>
                <Input value={formInvoiceNumber} onChange={e => setFormInvoiceNumber(e.target.value)} placeholder="مثلاً ۱۴۰۳/۰۱۰" />
              </div>
              <div className="space-y-2">
                <Label>تاریخ خرید *</Label>
                <ShamsiDatePicker value={formPurchaseDate} onChange={setFormPurchaseDate} placeholder="انتخاب تاریخ خرید" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>پروژه *</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تامین‌کننده *</Label>
                <Select value={formSupplierId} onValueChange={setFormSupplierId}>
                  <SelectTrigger><SelectValue placeholder="انتخاب تامین‌کننده" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>سررسید پرداخت *</Label>
              <ShamsiDatePicker value={formDueDate} onChange={setFormDueDate} placeholder="انتخاب سررسید پرداخت" />
            </div>

            <div className="space-y-2">
              <Label>تصویر فاکتور</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">انتخاب فایل</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                {formImagePreview && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border">
                    <img src={formImagePreview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">اقلام فاکتور</Label>
                <Button variant="outline" size="sm" onClick={addFormItem} className="gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  افزودن ردیف
                </Button>
              </div>

              {formItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                  <div className="col-span-3">
                    <Label className="text-xs">نام کالا</Label>
                    <Input value={item.materialName} onChange={e => updateFormItem(index, 'materialName', e.target.value)} placeholder="میلگرد" className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">مقدار</Label>
                    <Input type="number" value={item.quantity || ''} onChange={e => updateFormItem(index, 'quantity', Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">واحد</Label>
                    <Select value={item.unit} onValueChange={v => updateFormItem(index, 'unit', v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">قیمت واحد</Label>
                    <Input type="number" value={item.unitPrice || ''} onChange={e => updateFormItem(index, 'unitPrice', Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">مبلغ</Label>
                    <p className="text-sm font-medium py-2">{formatCurrency(item.totalPrice)}</p>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeFormItem(index)} disabled={formItems.length <= 1}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-semibold">مبلغ کل فاکتور:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="توضیحات اختیاری..." rows={2} />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>انصراف</Button>
              <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white border-0">
                {saving ? 'در حال ثبت...' : editMode ? 'بروزرسانی' : 'ثبت فاکتور'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Purchase Detail Dialog ─── */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {selectedPurchase && (
            <>
              <DialogHeader>
                <DialogTitle>جزئیات فاکتور {toPersianDigits(selectedPurchase.invoiceNumber)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">پروژه</p>
                    <p className="font-medium">{selectedPurchase.project?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">تامین‌کننده</p>
                    <p className="font-medium">{selectedPurchase.supplier?.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">تاریخ خرید</p>
                    <p>{toPersianDate(selectedPurchase.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">سررسید</p>
                    <p>{toPersianDate(selectedPurchase.dueDate)}</p>
                  </div>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-xs border-b border-border">
                        <th className="text-right py-2">کالا</th>
                        <th className="text-right py-2">مقدار</th>
                        <th className="text-right py-2">واحد</th>
                        <th className="text-right py-2">قیمت واحد</th>
                        <th className="text-right py-2">مبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchase.items?.map((item, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2">{item.materialName}</td>
                          <td className="py-2">{toPersianDigits(item.quantity)}</td>
                          <td className="py-2 text-muted-foreground">{item.unit}</td>
                          <td className="py-2">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="font-semibold">مبلغ کل:</span>
                  <span className="text-lg font-bold">{formatCurrency(selectedPurchase.totalAmount)}</span>
                </div>
                {selectedPurchase.paidAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span>پرداخت شده:</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(selectedPurchase.paidAmount)}</span>
                  </div>
                )}
                {(selectedPurchase.totalAmount - selectedPurchase.paidAmount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span>مانده بدهی:</span>
                    <span className="font-bold text-red-600">{formatCurrency(selectedPurchase.totalAmount - selectedPurchase.paidAmount)}</span>
                  </div>
                )}

                {/* Invoice Image */}
                {selectedPurchase.invoiceImage && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">تصویر فاکتور</p>
                    <div className="rounded-lg overflow-hidden border border-border max-w-sm">
                      <img src={selectedPurchase.invoiceImage} alt="فاکتور" className="w-full" />
                    </div>
                  </div>
                )}

                {/* Delivery status */}
                {selectedPurchase.delivery && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="w-4 h-4 inline ml-1" />
                      تحویل تأیید شده — {selectedPurchase.delivery.confirmedBy} — {toPersianDate(selectedPurchase.delivery.deliveryDate)}
                    </p>
                  </div>
                )}

                {/* Payments */}
                {selectedPurchase.payments && selectedPurchase.payments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">سوابق پرداخت</p>
                    {selectedPurchase.payments.map((pay: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-lg text-sm">
                        <span>{toPersianDate(pay.paymentDate)}</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  {selectedPurchase.status !== 'paid' && (
                    <>
                      <Button variant="outline" onClick={() => { setShowDetail(false); openEditForm(selectedPurchase); }}>
                        ویرایش
                      </Button>
                      <Button onClick={() => { setShowDetail(false); setShowPayment(true); }} className="gradient-primary text-white border-0 gap-2">
                        <CreditCard className="w-4 h-4" />
                        ثبت پرداخت
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Payment Dialog ─── */}
      <Dialog open={showPayment} onOpenChange={v => { setShowPayment(v); if (!v) { setPaymentAmount(''); setPaymentNote(''); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت پرداخت</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">فاکتور {toPersianDigits(selectedPurchase.invoiceNumber)}</p>
                <p className="text-sm text-muted-foreground">
                  مانده: <span className="font-bold text-red-600">{formatCurrency(selectedPurchase.totalAmount - selectedPurchase.paidAmount)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>مبلغ پرداخت (تومان) *</Label>
                <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="مبلغ به تومان" />
              </div>
              <div className="space-y-2">
                <Label>تاریخ پرداخت</Label>
                <ShamsiDatePicker value={paymentDate} onChange={setPaymentDate} placeholder="انتخاب تاریخ پرداخت" />
              </div>
              <div className="space-y-2">
                <Label>یادداشت</Label>
                <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="اختیاری..." rows={2} />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowPayment(false)}>انصراف</Button>
                <Button onClick={handlePayment} className="gradient-primary text-white border-0">ثبت پرداخت</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
