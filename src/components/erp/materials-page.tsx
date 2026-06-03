'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/components/project-context';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UNIT_LABELS, toPersianDigits } from '@/lib/rbac';

interface Material {
  id: string; name: string; code: string; unit: string; minStock: number; description: string | null;
  stock: number;
  category: { id: string; name: string }; categoryId: string;
}
interface Category { id: string; name: string; }

const emptyForm = { name: '', code: '', categoryId: '', unit: 'KILOGRAM', minStock: '0', description: '' };

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const { activeProject } = useProject();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    try {
      const projectId = activeProject?.id || '';
      const res = await fetch(`/api/materials?search=${search}&categoryId=${filterCat}&projectId=${projectId}`);
      const data = await res.json();
      setMaterials(data.materials || []);
      setCategories(data.categories || []);
    } catch { } finally { setLoading(false); }
  }, [search, filterCat , activeProject?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.categoryId) { toast.error('فیلدهای الزامی را تکمیل کنید'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, minStock: parseFloat(form.minStock) || 0 }),
      });
      if (res.ok) { toast.success('مصالح ثبت شد'); setForm(emptyForm); setDialogOpen(false); loadData(); }
      else { const err = await res.json(); toast.error(err.error || 'خطا'); }
    } catch { toast.error('خطا'); } finally { setSubmitting(false); }
  };

  const handleEdit = (m: Material) => {
    setEditingId(m.id);
    setForm({
      name: m.name, code: m.code, categoryId: m.categoryId, unit: m.unit,
      minStock: String(m.minStock), description: m.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.name || !form.code || !form.categoryId) { toast.error('فیلدهای الزامی را تکمیل کنید'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/materials', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: form.name, code: form.code, categoryId: form.categoryId, unit: form.unit, minStock: parseFloat(form.minStock) || 0, description: form.description || null }),
      });
      if (res.ok) { toast.success('مصالح ویرایش شد'); setEditDialogOpen(false); setEditingId(null); setForm(emptyForm); loadData(); }
      else { const err = await res.json(); toast.error(err.error || 'خطا'); }
    } catch { toast.error('خطا'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/materials?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('مصالح حذف شد'); loadData(); }
      else { const err = await res.json(); toast.error(err.error || 'خطا در حذف'); }
    } catch { toast.error('خطا'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">مدیریت مصالح</h3>
          <p className="text-sm text-muted-foreground">تعریف و مدیریت انواع مصالح ساختمانی</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 input-modern rounded-xl" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="دسته‌بندی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary hover:opacity-90 rounded-xl shadow-soft"><Plus className="w-4 h-4" /><span className="hidden sm:inline">مصالح جدید</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl" dir="rtl">
              <DialogHeader><DialogTitle className="text-base font-bold">ثبت مصالح جدید</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2"><Label className="text-xs font-semibold">نام مصالح *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-modern rounded-xl" required /></div>
                <div className="space-y-2"><Label className="text-xs font-semibold">کد مصالح *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="مصالح-XXX" className="input-modern rounded-xl" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs font-semibold">دسته‌بندی *</Label>
                    <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="text-xs font-semibold">واحد</Label>
                    <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(UNIT_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label className="text-xs font-semibold">حداقل موجودی</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="input-modern rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-xs font-semibold">توضیحات</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-modern rounded-xl" /></div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">انصراف</Button>
                  <Button type="submit" disabled={submitting} className="gradient-primary hover:opacity-90 rounded-xl shadow-soft">{submitting ? '...' : 'ثبت'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-base font-bold">ویرایش مصالح</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-2"><Label className="text-xs font-semibold">نام مصالح *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-modern rounded-xl" required /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold">کد مصالح *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-modern rounded-xl" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs font-semibold">دسته‌بندی *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-xs font-semibold">واحد</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(UNIT_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-xs font-semibold">حداقل موجودی</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="input-modern rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold">توضیحات</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-modern rounded-xl" /></div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">انصراف</Button>
              <Button type="submit" disabled={submitting} className="gradient-primary hover:opacity-90 rounded-xl shadow-soft">{submitting ? '...' : 'ویرایش'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-0 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
  <TableRow className="bg-muted/40 hover:bg-muted/40">
    <TableHead className="text-right text-xs font-semibold">کد</TableHead>
    <TableHead className="text-right text-xs font-semibold">نام</TableHead>
    <TableHead className="text-right text-xs font-semibold">دسته‌بندی</TableHead>
    <TableHead className="text-right text-xs font-semibold">واحد</TableHead>
    <TableHead className="text-right text-xs font-semibold">موجودی فعلی</TableHead>
    <TableHead className="text-right text-xs font-semibold">حداقل موجودی</TableHead>
    <TableHead className="text-right text-xs font-semibold">عملیات</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {loading ? (
    [...Array(5)].map((_, i) => (<TableRow key={i}>{[...Array(7)].map((_, j) => (<TableCell key={j}><div className="h-4 bg-muted/50 rounded animate-pulse" /></TableCell>))}</TableRow>))
  ) : materials.length === 0 ? (
    <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">یافت نشد</TableCell></TableRow>
  ) : (
    materials.map((m) => (
      <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
        <TableCell><Badge variant="outline" className="text-[10px] font-mono">{toPersianDigits(m.code)}</Badge></TableCell>
        <TableCell className="font-semibold text-sm">{m.name}</TableCell>
        <TableCell className="text-sm">{m.category?.name || '—'}</TableCell>
        <TableCell className="text-sm">{UNIT_LABELS[m.unit] || m.unit}</TableCell>
        {/* ✅ ستون موجودی فعلی با رنگ‌بندی */}
        <TableCell className="text-sm">
          <span className={m.stock <= m.minStock ? 'text-red-600 font-bold' : 'text-emerald-600 font-medium'}>
            {toPersianDigits(m.stock)} {UNIT_LABELS[m.unit] || m.unit}
          </span>
        </TableCell>
        <TableCell className="text-sm">{toPersianDigits(m.minStock)}</TableCell>
        <TableCell>
          {/* دکمه‌های عملیات */}
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
  );
}
