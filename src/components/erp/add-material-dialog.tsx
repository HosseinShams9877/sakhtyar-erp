'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { UNIT_LABELS } from '@/lib/rbac';

interface Category {
  id: string;
  name: string;
}

interface AddMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onMaterialAdded: () => void;
}

const emptyForm = {
  name: '',
  code: '',
  categoryId: '',
  unit: 'KILOGRAM',
  minStock: '0',
  description: '',
};

export function AddMaterialDialog({
  open,
  onOpenChange,
  projectId,
  onMaterialAdded,
}: AddMaterialDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log('🔵 Dialog open changed:', open);
    if (open) {
      loadCategories();
      setForm(emptyForm);
    }
  }, [open]);

  // ✅ استفاده از API /api/materials برای دریافت categories
  const loadCategories = async () => {
    if (!projectId) {
      console.log('⚠️ No projectId, skipping categories load');
      return;
    }
    
    try {
      console.log('🔵 Loading categories from /api/materials...');
      const res = await fetch(`/api/materials?projectId=${projectId}`);
      console.log('🔵 Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('🔵 Response data:', data);
        
        // categories از data.categories میاد
        if (data.categories && Array.isArray(data.categories)) {
          console.log('🔵 Categories found:', data.categories);
          setCategories(data.categories);
        } else {
          console.warn('⚠️ No categories in response:', data);
          setCategories([]);
        }
      } else {
        console.error('Failed to load materials:', res.status);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code || !form.categoryId) {
      toast.error('لطفاً نام، کد و دسته‌بندی کالا را وارد کنید');
      return;
    }

    if (!projectId) {
      toast.error('لطفاً ابتدا پروژه را انتخاب کنید');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          categoryId: form.categoryId,
          unit: form.unit,
          minStock: parseFloat(form.minStock) || 0,
          description: form.description || null,
          projectId: projectId,
        }),
      });

      if (res.ok) {
        toast.success('کالا با موفقیت اضافه شد');
        setForm(emptyForm);
        onOpenChange(false);
        onMaterialAdded();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در افزودن کالا');
      }
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            افزودن کالای جدید
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* نام کالا */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              نام کالا <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="مثال: سیمان تیپ ۲"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* کد کالا */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              کد کالا <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="مثال: MT-001"
              value={form.code}
              onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
              className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* دسته‌بندی و واحد */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                دسته‌بندی <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm(prev => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="انتخاب دسته‌بندی" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {categories.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      در حال بارگذاری...
                    </div>
                  ) : (
                    categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-gray-900 dark:text-gray-100">
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">واحد</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm(prev => ({ ...prev, unit: v }))}
              >
                <SelectTrigger className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {Object.entries(UNIT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-gray-900 dark:text-gray-100">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* حداقل موجودی */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">حداقل موجودی</Label>
            <Input
              type="number"
              placeholder="۰"
              value={form.minStock}
              onChange={(e) => setForm(prev => ({ ...prev, minStock: e.target.value }))}
              className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* توضیحات */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">توضیحات</Label>
            <Textarea
              placeholder="توضیحات کالا..."
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="rounded-xl resize-none bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              rows={2}
            />
          </div>

          {/* دکمه‌ها */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'در حال ثبت...' : 'افزودن کالا'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}