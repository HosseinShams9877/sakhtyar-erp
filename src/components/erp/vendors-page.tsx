'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter ,useSearchParams  } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/components/project-context';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus, Search, Phone, Mail, Building2, Pencil, Trash2,
  Smartphone, Landmark, FileText, CreditCard, Receipt, TrendingUp,ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits, formatCurrency } from '@/lib/rbac';

interface Vendor {
  id: string;
  companyName: string;
  contactName: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  bankAccount: string | null;
  settlementTerms: string | null;
  debtCeiling: number | null;
  isActive: boolean;
  totalInvoiceAmount: number;
  invoiceCount: number;
  projects?: { id: string; name: string }[];
}

const emptyForm = {
  companyName: '',
  contactName: '',
  mobile: '',
  phone: '',
  email: '',
  address: '',
  bankAccount: '',
  settlementTerms: '',
  debtCeiling: '',
  taxId: '',
  isActive: 'true',
  projectIds: [] as string[],
};

export default function VendorsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allProjects, setAllProjects] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const { activeProject } = useProject(); 
  const { session } = useAuth();
  const userRole = session?.user?.role;
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => {
    setForm({
      companyName: '',
      contactName: '',
      mobile: '',
      phone: '',
      email: '',
      address: '',
      bankAccount: '',
      settlementTerms: '',
      debtCeiling: '',
      taxId: '',
      isActive: 'true',
      projectIds: [] as string[],
    });
  };

  const loadData = useCallback(async () => {
    try {
      const projectId = activeProject?.id || '';
      const url = `/api/vendors?search=${search}&projectId=${projectId}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('🔍 API response sample:', data[0]); // ← ببین projects دارد یا نه
      console.log('🔍 Full response:', data);
      setVendors(Array.isArray(data) ? data : (data?.vendors || []));
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeProject?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (userRole === 'PURCHASER' && activeProject?.id) {
          setAllProjects([activeProject]);
        } else {
          const res = await fetch('/api/projects');
          const data = await res.json();
          setAllProjects(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setAllProjects([]);
      }
    };
    
    fetchProjects();
  }, [userRole, activeProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error('نام فروشگاه الزامی است');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          contactName: form.contactName || undefined,
          mobile: form.mobile || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          bankAccount: form.bankAccount || undefined,
          settlementTerms: form.settlementTerms || undefined,
          debtCeiling: form.debtCeiling ? parseFloat(form.debtCeiling) : undefined,
          taxId: form.taxId || undefined,
          isActive: true,
          projectIds: form.projectIds || [],
        }),
      });
      if (res.ok) {
        toast.success('فروشنده با موفقیت ثبت شد');
        setForm(emptyForm);
        setDialogOpen(false);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ثبت فروشنده');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (v: Vendor) => {
    console.log('✏️ Editing vendor:', v);
    console.log('📁 Projects:', v.projects);
    setEditingId(v.id);
    setForm({
      companyName: v.companyName,
      contactName: v.contactName || '',
      mobile: v.mobile || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      bankAccount: v.bankAccount || '',
      settlementTerms: v.settlementTerms || '',
      debtCeiling: v.debtCeiling ? String(v.debtCeiling) : '',
      taxId: v.taxId || '',
      isActive: v.isActive ? 'true' : 'false',
      projectIds: v.projects?.map(p => p.id) || []
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.companyName.trim()) {
      toast.error('نام فروشگاه الزامی است');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          companyName: form.companyName,
          contactName: form.contactName || null,
          mobile: form.mobile || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          bankAccount: form.bankAccount || null,
          settlementTerms: form.settlementTerms || null,
          debtCeiling: form.debtCeiling ? parseFloat(form.debtCeiling) : null,
          taxId: form.taxId || null,
          isActive: form.isActive === 'true',
          projectIds: form.projectIds || [],
        }),
      });
      if (res.ok) {
        toast.success('فروشنده با موفقیت ویرایش شد');
        setEditDialogOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ویرایش فروشنده');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('فروشنده غیرفعال شد');
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در غیرفعال‌سازی');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  const getDebtUsagePercent = (vendor: Vendor): number => {
    if (!vendor.debtCeiling || vendor.debtCeiling <= 0) return 0;
    return Math.min(Math.round((vendor.totalInvoiceAmount / vendor.debtCeiling) * 100), 100);
  };

  const getDebtBarColor = (percent: number): string => {
    if (percent >= 90) return 'bg-rose-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getDebtBgColor = (percent: number): string => {
    if (percent >= 90) return 'bg-rose-100 dark:bg-rose-950/40';
    if (percent >= 70) return 'bg-amber-100 dark:bg-amber-950/40';
    return 'bg-emerald-100 dark:bg-emerald-950/40';
  };

  const getDebtTextColor = (percent: number): string => {
    if (percent >= 90) return 'text-rose-700 dark:text-rose-400';
    if (percent >= 70) return 'text-amber-700 dark:text-amber-400';
    return 'text-emerald-700 dark:text-emerald-400';
  };

  const renderForm = (isEdit: boolean = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">نام فروشگاه *</Label>
          <Input
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            placeholder="مثال: فروشگاه آهن‌فروشی رضایی"
            className="input-modern rounded-xl"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">نام فروشنده</Label>
          <Input
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            placeholder="مثال: علی رضایی"
            className="input-modern rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">موبایل</Label>
          <Input
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            className="input-modern rounded-xl"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">تلفن</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="۰۲۱۱۲۳۴۵۶۷۸"
            className="input-modern rounded-xl"
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">ایمیل</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ایمیل (اختیاری)"
            className="input-modern rounded-xl"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">شماره حساب</Label>
          <Input
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
            placeholder="شماره حساب بانکی"
            className="input-modern rounded-xl"
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">آدرس</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="آدرس فروشگاه"
          className="input-modern rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">شرایط تسویه</Label>
        <Textarea
          value={form.settlementTerms}
          onChange={(e) => setForm({ ...form, settlementTerms: e.target.value })}
          placeholder="مثال: تسویه ۳۰ روزه، چک ۶۰ روزه و ..."
          className="input-modern rounded-xl min-h-20"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">سقف بدهی (ریال)</Label>
          <Input
            type="number"
            value={form.debtCeiling}
            onChange={(e) => setForm({ ...form, debtCeiling: e.target.value })}
            placeholder="مثال: ۵۰۰۰۰۰۰۰۰"
            className="input-modern rounded-xl"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">شناسه مالیاتی</Label>
          <Input
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            placeholder="شناسه مالیاتی"
            className="input-modern rounded-xl"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
  <Label className="text-xs font-semibold">پروژه‌های مرتبط</Label>
  <div className="border rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
    {allProjects.length === 0 ? (
      <p className="text-xs text-muted-foreground text-center py-2">پروژه‌ای یافت نشد</p>
    ) : (
      allProjects.map((project) => (
        <div key={project.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`project-${project.id}`}
            checked={form.projectIds?.includes(project.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setForm({ ...form, projectIds: [...(form.projectIds || []), project.id] });
              } else {
                setForm({ ...form, projectIds: (form.projectIds || []).filter(id => id !== project.id) });
              }
            }}
            className="w-4 h-4 rounded border-gray-300"
          />
          <Label htmlFor={`project-${project.id}`} className="text-sm font-normal cursor-pointer">
            {project.name}
          </Label>
        </div>
      ))
    )}
  </div>
  <p className="text-[10px] text-muted-foreground">فروشنده فقط در پروژه‌های انتخاب شده قابل انتخاب خواهد بود</p>
</div>
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">وضعیت</Label>
          <Select value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">فعال</SelectItem>
              <SelectItem value="false">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => { setDialogOpen(false); setEditDialogOpen(false); }}
          className="rounded-xl"
        >
          انصراف
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="gradient-primary hover:opacity-90 rounded-xl shadow-soft"
        >
          {submitting ? '...' : isEdit ? 'ویرایش' : 'ثبت'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">مدیریت فروشندگان</h3>
          <p className="text-sm text-muted-foreground">اطلاعات تامین‌کنندگان مصالح ساختمانی</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="جستجو..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 input-modern rounded-xl"
            />
          </div>
          <Dialog 
  open={dialogOpen} 
  onOpenChange={(open) => {
    setDialogOpen(open);
    if (open) {
      resetForm();  
    }
  }}
>
  <DialogTrigger asChild>
    <Button className="gap-2 gradient-primary hover:opacity-90 rounded-xl shadow-soft">
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">فروشنده جدید</span>
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
    <DialogHeader>
      <DialogTitle className="text-base font-bold">ثبت فروشنده جدید</DialogTitle>
    </DialogHeader>
    {renderForm(false)}
  </DialogContent>
</Dialog>
        </div>
      </div>

      {searchParams.get('projectId') && (<div className="md:hidden fixed top-4 right-4 z-50">
           <Button
             variant="default"
             size="icon"
             onClick={() => router.back()}
             className="w-12 h-12 rounded-2xl shadow-lg bg-white dark:bg-zinc-900 border border-border"
          >
          <ArrowLeft className="w-6 h-6" />
      </Button>
      </div>)}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">ویرایش فروشنده</DialogTitle>
          </DialogHeader>
          {renderForm(true)}
        </DialogContent>
      </Dialog>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : vendors.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            فروشنده‌ای یافت نشد
          </div>
        ) : (
          vendors.map((v, idx) => {
            const debtPercent = getDebtUsagePercent(v);
            return (
              <Card
                key={v.id}
                className="border-0 shadow-soft card-hover animate-in-up overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-5">
                  {/* Header: Store name + Status indicator */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 gradient-info rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-black" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm truncate">{v.companyName}</h4>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            v.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      {v.contactName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{v.contactName}</p>
                      )}
                    </div>
                    <Badge
                      className={`text-[10px] font-semibold gap-1 ${
                        v.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          v.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      {v.isActive ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs mb-3">
                    {v.mobile && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Smartphone className="w-3 h-3 flex-shrink-0" />
                        <span dir="ltr">{toPersianDigits(v.mobile)}</span>
                      </div>
                    )}
                    {v.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span dir="ltr">{toPersianDigits(v.phone)}</span>
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate" dir="ltr">{v.email}</span>
                      </div>
                    )}
                    {v.bankAccount && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Landmark className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate" dir="ltr">{toPersianDigits(v.bankAccount)}</span>
                      </div>
                    )}
                    {v.settlementTerms && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{v.settlementTerms}</span>
                      </div>
                    )}
                  </div>

                  {/* Debt Ceiling Progress Bar */}
                  {v.debtCeiling !== null && v.debtCeiling > 0 && (
                    <div className={`rounded-lg p-2.5 mb-3 ${getDebtBgColor(debtPercent)}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className={`w-3 h-3 ${getDebtTextColor(debtPercent)}`} />
                          <span className={`text-[10px] font-semibold ${getDebtTextColor(debtPercent)}`}>
                            سقف بدهی
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold ${getDebtTextColor(debtPercent)}`}>
                          {toPersianDigits(debtPercent)}٪
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getDebtBarColor(debtPercent)}`}
                          style={{ width: `${debtPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-muted-foreground">
                          {formatCurrency(v.totalInvoiceAmount)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          از {formatCurrency(v.debtCeiling)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Purchase History */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30">
                      <Receipt className="w-3 h-3 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground">تعداد فاکتور</p>
                        <p className="text-[11px] font-semibold truncate">
                          {toPersianDigits(v.invoiceCount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                      <TrendingUp className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground">مجموع خرید</p>
                        <p className="text-[11px] font-semibold truncate">
                          {v.totalInvoiceAmount > 0
                            ? formatCurrency(v.totalInvoiceAmount)
                            : '---'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tax ID */}
                  {v.taxId && (
                    <p className="text-[10px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
                      شناسه مالیاتی: {toPersianDigits(v.taxId)}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="px-5 pb-4 pt-0 flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs"
                    onClick={() => handleEdit(v)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    ویرایش
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>غیرفعال‌سازی فروشنده</AlertDialogTitle>
                        <AlertDialogDescription>
                          آیا از غیرفعال‌سازی فروشنده &laquo;{v.companyName}&raquo; اطمینان دارید؟ فروشنده دیگر فعال نخواهد بود.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(v.id)}
                          className="bg-rose-600 hover:bg-rose-700"
                        >
                          غیرفعال‌سازی
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
