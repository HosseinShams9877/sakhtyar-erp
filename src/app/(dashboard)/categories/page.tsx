'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react';
import { toPersianDigits } from '@/lib/rbac';

interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { materials: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch { toast.error('خطا در بارگذاری دسته‌بندی‌ها'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null); setName(''); setDescription(''); setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat); setName(cat.name); setDescription(cat.description || ''); setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('نام دسته‌بندی الزامی است'); return; }
    setSaving(true);
    try {
      const url = '/api/material-categories';
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { id: editing.id, name, description } : { name, description };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(editing ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی ایجاد شد');
        setDialogOpen(false);
        loadCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || 'خطا در ذخیره');
      }
    } catch { toast.error('خطا در ارتباط'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('آیا مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/material-categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('حذف شد'); loadCategories(); }
      else { const d = await res.json(); toast.error(d.error || 'خطا در حذف'); }
    } catch { toast.error('خطا'); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold">مدیریت دسته‌بندی مصالح</h2>
          <p className="text-sm text-muted-foreground mt-0.5">تعریف و مدیریت دسته‌بندی‌های مصالح ساختمانی</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />دسته‌بندی جدید</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>{editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>نام دسته‌بندی</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: سیمان و چسب" />
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="توضیحات اختیاری" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نام</TableHead>
                <TableHead className="text-right">توضیحات</TableHead>
                <TableHead className="text-right">تعداد مصالح</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-violet-500" />{cat.name}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cat.description || '---'}</TableCell>
                  <TableCell><Badge variant="secondary">{toPersianDigits(cat._count?.materials || 0)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cat.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">دسته‌بندی یافت نشد</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
