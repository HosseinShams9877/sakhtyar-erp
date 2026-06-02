'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ShamsiDatePicker from '@/components/ui/shamsi-date-picker';
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
import {
  TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS,
  UNIT_LABELS, formatNumber, formatCurrency, formatDate, toPersianDigits,
} from '@/lib/rbac';

interface Transaction {
  id: string; type: string; quantity: number; unitPrice: number; totalPrice: number;
  description: string | null; deliveryPerson: string | null; date: string;
  material: { id: string; name: string; unit: string };
  project: { id: string; name: string };
  vendor: { id: string; companyName: string };
}

const emptyForm = {
  materialId: '', projectId: '', vendorId: '', type: 'PURCHASE',
  quantity: '', unitPrice: '', description: '', deliveryPerson: '', date: new Date().toISOString().split('T')[0],
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    try {
      const [txRes, matRes, prjRes, vndRes, usrRes] = await Promise.all([
        fetch(`/api/transactions?search=${search}&type=${typeFilter}&projectId=${projectFilter}`),
        fetch('/api/materials'), fetch('/api/projects'), fetch('/api/vendors'), fetch('/api/users'),
      ]);
      const [txData, matData, prjData, vndData, usrData] = await Promise.all([
        txRes.json(), matRes.json(), prjRes.json(), vndRes.json(), usrRes.json(),
      ]);
      setTransactions(Array.isArray(txData) ? txData : (txData?.transactions || []));
      setMaterials(Array.isArray(matData?.materials) ? matData.materials : Array.isArray(matData) ? matData : []);
      setProjects(Array.isArray(prjData) ? prjData : (prjData?.projects || []));
      setVendors(Array.isArray(vndData) ? vndData : (vndData?.vendors || []));
      setUsers(Array.isArray(usrData) ? usrData : (usrData?.users || []));
    } catch {
      // خطای شبکه — حفظ وضعیت فعلی
    } finally { setLoading(false); }
  }, [search, typeFilter, projectFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.materialId || !form.projectId || !form.vendorId || !form.quantity) { toast.error('فیلدهای الزامی'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: parseFloat(form.quantity), unitPrice: parseFloat(form.unitPrice) || 0, userId: (Array.isArray(users) && users[0]?.id) ? users[0].id : 'unknown' }),
      });
      if (res.ok) { toast.success('تراکنش ثبت شد'); setForm(emptyForm); setDialogOpen(false); loadData(); }
      else { const err = await res.json(); toast.error(err.error); }
    } catch { toast.error('خطا'); } finally { setSubmitting(false); }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setForm({
      materialId: tx.material.id, projectId: tx.project.id, vendorId: tx.vendor.id,
      type: tx.type, quantity: String(tx.quantity), unitPrice: String(tx.unitPrice),
      description: tx.description || '', deliveryPerson: tx.deliveryPerson || '',
      date: tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.materialId || !form.projectId || !form.vendorId || !form.quantity) { toast.error('فیلدهای الزامی'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId, materialId: form.materialId, projectId: form.projectId,
          vendorId: form.vendorId, type: form.type,
          quantity: parseFloat(form.quantity), unitPrice: parseFloat(form.unitPrice) || 0,
          description: form.description || null, deliveryPerson: form.deliveryPerson || null,
          date: form.date || null,
        }),
      });
      if (res.ok) { toast.success('تراکنش ویرایش شد'); setEditDialogOpen(false); setEditingId(null); setForm(emptyForm); loadData(); }
      else { const err = await res.json(); toast.error(err.error || 'خطا'); }
    } catch { toast.error('خطا'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('تراکنش حذف شد'); loadData(); }
      else { const err = await res.json(); toast.error(err.error || 'خطا در حذف'); }
    } catch { toast.error('خطا'); }
  };

  const formFields = (
    <>
      <div className="space-y-2"><Label className="text-xs font-semibold">نوع *</Label>
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(TRANSACTION_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label className="text-xs font-semibold">مصالح *</Label>
        <Select value={form.materialId} onValueChange={(v) => setForm({ ...form, materialId: v })}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب" /></SelectTrigger>
          <SelectContent>{materials.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label className="text-xs font-semibold">پروژه *</Label>
          <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب" /></SelectTrigger>
            <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label className="text-xs font-semibold">فروشنده *</Label>
          <Select value={form.vendorId} onValueChange={(v) => setForm({ ...form, vendorId: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب" /></SelectTrigger>
            <SelectContent>{vendors.map((v: any) => (<SelectItem key={v.id} value={v.id}>{v.companyName}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label className="text-xs font-semibold">مقدار *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-modern rounded-xl" required /></div>
        <div className="space-y-2"><Label className="text-xs font-semibold">قیمت واحد</Label><Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="input-modern rounded-xl" /></div>
      </div>
      <div className="space-y-2"><Label className="text-xs font-semibold">تاریخ</Label><ShamsiDatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} placeholder="انتخاب تاریخ" /></div>
      <div className="space-y-2"><Label className="text-xs font-semibold">تحویل‌گیرنده</Label><Input value={form.deliveryPerson} onChange={(e) => setForm({ ...form, deliveryPerson: e.target.value })} className="input-modern rounded-xl" /></div>
      <div className="space-y-2"><Label className="text-xs font-semibold">توضیحات</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-modern rounded-xl" /></div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">مدیریت تراکنش‌ها</h3>
          <p className="text-sm text-muted-foreground">ثبت و رهگیری خرید، تحویل و مرجوعی مصالح</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 input-modern rounded-xl" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-28 rounded-xl"><SelectValue placeholder="نوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="پروژه" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary hover:opacity-90 rounded-xl shadow-soft"><Plus className="w-4 h-4" /><span className="hidden sm:inline">تراکنش جدید</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
              <DialogHeader><DialogTitle className="text-base font-bold">ثبت تراکنش جدید</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {formFields}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-base font-bold">ویرایش تراکنش</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            {formFields}
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
                  <TableHead className="text-right text-xs font-semibold">نوع</TableHead>
                  <TableHead className="text-right text-xs font-semibold">مصالح</TableHead>
                  <TableHead className="text-right text-xs font-semibold">پروژه</TableHead>
                  <TableHead className="text-right text-xs font-semibold">فروشنده</TableHead>
                  <TableHead className="text-right text-xs font-semibold">مقدار</TableHead>
                  <TableHead className="text-right text-xs font-semibold">مبلغ</TableHead>
                  <TableHead className="text-right text-xs font-semibold">تاریخ</TableHead>
                  <TableHead className="text-right text-xs font-semibold">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (<TableRow key={i}>{[...Array(8)].map((_, j) => (<TableCell key={j}><div className="h-4 bg-muted/50 rounded animate-pulse" /></TableCell>))}</TableRow>))
                ) : transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">یافت نشد</TableCell></TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><Badge className={TRANSACTION_TYPE_COLORS[tx.type] || ''} variant="secondary">{TRANSACTION_TYPE_LABELS[tx.type]}</Badge></TableCell>
                      <TableCell className="font-semibold text-sm">{tx.material?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{tx.project?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{tx.vendor?.companyName || '—'}</TableCell>
                      <TableCell className="text-sm">{formatNumber(tx.quantity)} {UNIT_LABELS[tx.material?.unit] || ''}</TableCell>
                      <TableCell className="text-sm font-semibold">{tx.totalPrice > 0 ? formatCurrency(tx.totalPrice) : '---'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(tx)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف تراکنش</AlertDialogTitle>
                                <AlertDialogDescription>
                                  آیا از حذف این تراکنش اطمینان دارید؟ این عمل فقط توسط مدیران قابل انجام است و قابل بازگشت نیست.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tx.id)} className="bg-rose-600 hover:bg-rose-700">حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
