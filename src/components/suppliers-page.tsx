'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Store,
  Phone,
  User,
  TrendingDown,
  ChevronLeft,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
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
import { toPersianDigits, formatCurrency } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  address: string | null;
  totalDebt: number;
  purchaseCount: number;
  createdAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);

  const [formCompanyName, setFormCompanyName] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) setSuppliers(await res.json());
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const resetForm = () => {
    setFormCompanyName(''); setFormContactName(''); setFormPhone(''); setFormAddress('');
    setEditItem(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setFormCompanyName(s.companyName); setFormContactName(s.contactName);
    setFormPhone(s.phone); setFormAddress(s.address || '');
    setEditItem(s); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formCompanyName || !formContactName || !formPhone) {
      toast.error('لطفاً فیلدهای الزامی را پر کنید');
      return;
    }
    try {
      const body = { companyName: formCompanyName, contactName: formContactName, phone: formPhone, address: formAddress || undefined };
      const res = editItem
        ? await fetch('/api/suppliers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editItem.id, ...body }) })
        : await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      if (res.ok) {
        toast.success(editItem ? 'تامین‌کننده بروزرسانی شد' : 'تامین‌کننده ثبت شد');
        setShowForm(false); resetForm(); fetchSuppliers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا');
      }
    } catch { toast.error('خطا'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('حذف شد'); fetchSuppliers(); }
    } catch { toast.error('خطا'); }
  };

  const filtered = suppliers.filter(s =>
    !search || s.companyName.includes(search) || s.contactName.includes(search) || s.phone.includes(search)
  );

  const totalDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">تامین‌کنندگان</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت فروشگاه‌ها و تامین‌کنندگان مصالح</p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-white border-0 gap-2">
          <Plus className="w-4 h-4" />
          افزودن تامین‌کننده
        </Button>
      </div>

      {/* Summary card */}
      <Card className="shadow-soft-md bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="py-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">تعداد:</span>
            <span className="font-bold">{toPersianDigits(suppliers.length)}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-sm text-muted-foreground">مجموع بدهی:</span>
            <span className="font-bold text-red-600">{formatCurrency(totalDebt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو در نام فروشگاه، فروشنده، تلفن..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      {/* Suppliers grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>تامین‌کننده‌ای یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(supplier => (
            <Card key={supplier.id} className="shadow-soft card-hover group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{supplier.companyName}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <User className="w-3 h-3" />
                        {supplier.contactName}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(supplier)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(supplier.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    {toPersianDigits(supplier.phone)}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">تعداد خرید: {toPersianDigits(supplier.purchaseCount || 0)}</span>
                    <span className={cn('font-bold text-sm', (supplier.totalDebt || 0) > 0 ? 'text-red-600' : 'text-emerald-600')}>
                      {formatCurrency(supplier.totalDebt || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'ویرایش تامین‌کننده' : 'افزودن تامین‌کننده جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>نام فروشگاه *</Label>
              <Input value={formCompanyName} onChange={e => setFormCompanyName(e.target.value)} placeholder="آهن‌فروشی مرکزی" />
            </div>
            <div className="space-y-2">
              <Label>نام فروشنده *</Label>
              <Input value={formContactName} onChange={e => setFormContactName(e.target.value)} placeholder="محمد احمدی" />
            </div>
            <div className="space-y-2">
              <Label>تلفن *</Label>
              <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="۰۹۱۲۱۲۳۴۵۶۷" />
            </div>
            <div className="space-y-2">
              <Label>آدرس</Label>
              <Input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="اختیاری" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>انصراف</Button>
              <Button onClick={handleSave} className="gradient-primary text-white border-0">ثبت</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
