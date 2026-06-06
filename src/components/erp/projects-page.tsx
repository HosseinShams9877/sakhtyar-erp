'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ShamsiDatePicker from '@/components/ui/shamsi-date-picker';
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
import { Plus, Search, MapPin, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PROJECT_STATUS_LABELS, formatCurrency, formatDate, toPersianDigits } from '@/lib/rbac';

interface Project {
  id: string; name: string; code: string; location: string | null;
  status: string; budget: number; startDate: string | null; endDate: string | null;
  description: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400', dot: 'bg-emerald-500' },
  COMPLETED: { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400', dot: 'bg-blue-500' },
  ON_HOLD: { bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400', dot: 'bg-amber-500' },
  CANCELLED: { bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400', dot: 'bg-rose-500' },
};

const emptyForm = {
  name: '', code: '', location: '', status: 'ACTIVE', budget: '',
  startDate: '', endDate: '', description: '',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    try {
      const prjRes = await fetch(`/api/projects?search=${search}&status=${statusFilter}`);
      const prjData = await prjRes.json();
      setProjects(Array.isArray(prjData) ? prjData : (prjData?.projects || []));
    } catch { } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error('فیلدهای الزامی'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          budget: parseFloat(form.budget) || 0,
        }),
      });
      if (res.ok) { toast.success('پروژه ثبت شد'); setForm(emptyForm); setDialogOpen(false); loadData(); }
      else { const err = await res.json(); toast.error(err.error); }
    } catch { toast.error('خطا'); } finally { setSubmitting(false); }
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id);
    setForm({
      name: p.name, code: p.code, location: p.location || '', status: p.status,
      budget: p.budget ? String(p.budget) : '', startDate: p.startDate ? p.startDate.split('T')[0] : '',
      endDate: p.endDate ? p.endDate.split('T')[0] : '', description: p.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.name || !form.code) { toast.error('فیلدهای الزامی'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId, name: form.name, code: form.code, location: form.location || null,
          status: form.status, budget: parseFloat(form.budget) || 0,
          startDate: form.startDate || null, endDate: form.endDate || null, description: form.description || null,
        }),
      });
      if (res.ok) { toast.success('پروژه ویرایش شد'); setEditDialogOpen(false); setEditingId(null); setForm(emptyForm); loadData(); }
      else { const err = await res.json(); toast.error(err.error || 'خطا'); }
    } catch { toast.error('خطا'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('پروژه لغو شد'); loadData(); }
      else { const err = await res.json(); toast.error(err.error || 'خطا در حذف'); }
    } catch { toast.error('خطا'); }
  };

  const renderForm = (isEdit: boolean = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">نام پروژه *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: برج الهیه" className="input-modern rounded-xl" required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">کد پروژه *</Label>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="پروژه-XXX" className="input-modern rounded-xl" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">آدرس پروژه</Label>
        <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="مثال: الهیه، خیابان ولیعصر" className="input-modern rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">وضعیت</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">بودجه (ریال)</Label>
          <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}
            className="input-modern rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">تاریخ شروع</Label>
          <ShamsiDatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} placeholder="انتخاب تاریخ شروع" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">تاریخ پایان</Label>
          <ShamsiDatePicker value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} placeholder="انتخاب تاریخ پایان" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">توضیحات</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-modern rounded-xl" />
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditDialogOpen(false); }} className="rounded-xl">انصراف</Button>
        <Button type="submit" disabled={submitting} className="gradient-primary hover:opacity-90 rounded-xl shadow-soft">
          {submitting ? '...' : isEdit ? 'ویرایش' : 'ثبت'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">مدیریت پروژه‌ها</h3>
          <p className="text-sm text-muted-foreground">ثبت و پیگیری پروژه‌های عمرانی و ساختمانی</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 input-modern rounded-xl" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="وضعیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary hover:opacity-90 rounded-xl shadow-soft">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">پروژه جدید</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">ثبت پروژه جدید</DialogTitle>
              </DialogHeader>
              {renderForm(false)}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">ویرایش پروژه</DialogTitle>
          </DialogHeader>
          {renderForm(true)}
        </DialogContent>
      </Dialog>

      {/* کارت‌های پروژه */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="h-28 bg-muted/30 rounded-xl animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : projects.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-muted-foreground">پروژه‌ای یافت نشد</div>
        ) : (
          projects.map((p, idx) => {
            const style = STATUS_STYLES[p.status] || { bg: 'bg-gray-50 text-gray-700', dot: 'bg-gray-500' };
            return (
              <Card key={p.id} className="border-0 shadow-soft card-hover animate-in-up overflow-hidden" style={{ animationDelay: `${idx * 60}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-sm">{p.name}</h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {p.location || '---'}
                      </p>
                    </div>
                    <Badge className={`${style.bg} text-[10px] font-semibold gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {PROJECT_STATUS_LABELS[p.status] || 'نامشخص'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground">کد: </span>
                      <Badge variant="outline" className="text-[10px] font-mono">{toPersianDigits(p.code)}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">بودجه: </span>
                      <span className="font-bold">{p.budget ? formatCurrency(p.budget) : '---'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">شروع: </span>
                      <span className="font-medium">{p.startDate ? formatDate(p.startDate) : '---'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">پایان: </span>
                      <span className="font-medium">{p.endDate ? formatDate(p.endDate) : '---'}</span>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-[11px] text-muted-foreground mt-3 border-t border-border/50 pt-2">{p.description}</p>
                  )}
                </CardContent>
                <CardFooter className="px-5 pb-4 pt-0 flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs" onClick={() => handleEdit(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                    ویرایش
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200">
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>لغو پروژه</AlertDialogTitle>
                        <AlertDialogDescription>
                          آیا از لغو پروژه &laquo;{p.name}&raquo; اطمینان دارید؟ وضعیت پروژه به لغوشده تغییر می‌یابد.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-rose-600 hover:bg-rose-700">
                          لغو پروژه
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