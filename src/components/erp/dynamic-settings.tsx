'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Settings, Building2, Globe, FileText, Bell, Palette, Shield, Save,
  RefreshCw, Plus, Trash2, Pencil, CheckCircle2, XCircle, Eye,
  Sliders, Wrench, Sparkles, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits } from '@/lib/rbac';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface SettingItem {
  key: string;
  value: string;
  category: string;
  label: string;
  type: string;
  options?: string;
  group: number;
  isPublic: boolean;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; description: string }> = {
  company: { label: 'اطلاعات سازمان', icon: Building2, color: 'from-violet-600 to-indigo-600', description: 'نام، لوگو و اطلاعات تماس سازمان' },
  regional: { label: 'تنظیمات منطقه‌ای', icon: Globe, color: 'from-blue-600 to-cyan-600', description: 'واحد پول، فرمت تاریخ و زبان' },
  invoice: { label: 'تنظیمات فاکتور', icon: FileText, color: 'from-amber-500 to-orange-600', description: 'پیشوند و شماره‌گذاری فاکتور' },
  notification: { label: 'نوتیفیکیشن‌ها', icon: Bell, color: 'from-emerald-600 to-teal-600', description: 'هشدارها و اعلان‌های سیستم' },
  appearance: { label: 'ظاهر و نمایش', icon: Palette, color: 'from-pink-600 to-rose-600', description: 'رنگ‌ها، تم و استایل برنامه' },
  security: { label: 'امنیت', icon: Shield, color: 'from-red-600 to-rose-700', description: 'تنظیمات امنیتی و محدودیت‌ها' },
  general: { label: 'عمومی', icon: Sliders, color: 'from-gray-600 to-gray-700', description: 'تنظیمات عمومی سیستم' },
};

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function DynamicSettings() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, SettingItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('company');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newField, setNewField] = useState({
    key: '',
    label: '',
    category: 'general',
    type: 'text',
    value: '',
    options: '',
    isPublic: false,
  });

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const raw: SettingItem[] = data.raw || [];
        setSettings(raw);
        // Group by category
        const g: Record<string, SettingItem[]> = {};
        for (const item of raw) {
          if (!g[item.category]) g[item.category] = [];
          g[item.category].push(item);
        }
        // Sort within each category by group
        for (const cat of Object.keys(g)) {
          g[cat].sort((a, b) => a.group - b.group);
        }
        setGrouped(g);
        // Initialize edit values
        const vals: Record<string, string> = {};
        for (const item of raw) {
          vals[item.key] = item.value;
        }
        setEditValues(vals);
      }
    } catch {
      toast.error('خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // Find changed values
      const changes: { key: string; value: string }[] = [];
      for (const item of settings) {
        if (editValues[item.key] !== undefined && editValues[item.key] !== item.value) {
          changes.push({ key: item.key, value: editValues[item.key] });
        }
      }
      if (changes.length === 0) {
        toast.info('تغییری برای ذخیره وجود ندارد');
        setSaving(false);
        return;
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      if (res.ok) {
        toast.success(`${toPersianDigits(changes.length)} تنظیمات ذخیره شد`);
        loadSettings();
      } else {
        toast.error('خطا در ذخیره تنظیمات');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  // Add custom field
  const handleAddField = async () => {
    if (!newField.key || !newField.label) {
      toast.error('کلید و عنوان الزامی است');
      return;
    }
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          key: newField.key,
          value: newField.value,
          category: newField.category,
          label: newField.label,
          type: newField.type,
          options: newField.type === 'select' ? newField.options : undefined,
          isPublic: newField.isPublic,
        }]),
      });
      if (res.ok) {
        toast.success('فیلد جدید اضافه شد');
        setNewField({ key: '', label: '', category: 'general', type: 'text', value: '', options: '', isPublic: false });
        setAddOpen(false);
        loadSettings();
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  // Render input based on type
  const renderInput = (item: SettingItem) => {
    const currentValue = editValues[item.key] ?? item.value;

    switch (item.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={currentValue === 'true'}
              onCheckedChange={(checked) =>
                setEditValues((prev) => ({ ...prev, [item.key]: checked ? 'true' : 'false' }))
              }
            />
            <span className="text-xs text-muted-foreground">
              {currentValue === 'true' ? 'فعال' : 'غیرفعال'}
            </span>
          </div>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
            className="rounded-xl max-w-[200px]"
          />
        );
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentValue}
              onChange={(e) => setEditValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
              className="w-10 h-10 rounded-lg border cursor-pointer"
            />
            <Input
              value={currentValue}
              onChange={(e) => setEditValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
              className="rounded-xl max-w-[140px]"
            />
          </div>
        );
      case 'select':
        const options = item.options ? JSON.parse(item.options) : [];
        return (
          <Select
            value={currentValue}
            onValueChange={(val) => setEditValues((prev) => ({ ...prev, [item.key]: val }))}
          >
            <SelectTrigger className="rounded-xl max-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'image':
        return (
          <Input
            value={currentValue}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
            placeholder="آدرس تصویر"
            className="rounded-xl"
          />
        );
      default:
        return (
          <Input
            value={currentValue}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
            className="rounded-xl"
          />
        );
    }
  };

  // Count changes
  const changedCount = settings.filter((s) => editValues[s.key] !== undefined && editValues[s.key] !== s.value).length;

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg flex-shrink-0">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold">تنظیمات پویای سیستم</h3>
            <p className="text-sm text-muted-foreground">
              شخصی‌سازی سیستم بدون نیاز به برنامه‌نویس
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={loadSettings}
            disabled={loading}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            بروزرسانی
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            فیلد جدید
          </Button>
          <Button
            size="sm"
            className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white shadow-lg"
            onClick={handleSave}
            disabled={saving || changedCount === 0}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? '...' : `ذخیره ${changedCount > 0 ? `(${toPersianDigits(changedCount)})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(CATEGORY_CONFIG).filter(([k]) => grouped[k]?.length).map(([key, config]) => (
          <button
            key={key}
            className={cn(
              'p-3 rounded-xl border transition-all text-right',
              activeCategory === key
                ? 'border-primary/30 bg-primary/5 shadow-md'
                : 'bg-muted/20 hover:bg-muted/40'
            )}
            onClick={() => setActiveCategory(key)}
          >
            <div className="flex items-center gap-2 mb-1">
              <config.icon className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">{config.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {toPersianDigits(grouped[key]?.length || 0)} تنظیم
            </span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Category sidebar */}
        <Card className="border-0 shadow-md lg:col-span-1">
          <CardContent className="p-3">
            <nav className="space-y-1">
              {categories.map((cat) => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
                const Icon = config.icon;
                const count = grouped[cat]?.length || 0;
                return (
                  <button
                    key={cat}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                      activeCategory === cat
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                    onClick={() => setActiveCategory(cat)}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-right">{config.label}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {toPersianDigits(count)}
                    </Badge>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Settings form */}
        <Card className="border-0 shadow-md lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {React.createElement(CATEGORY_CONFIG[activeCategory]?.icon || Settings, {
                  className: 'w-5 h-5 text-primary',
                })}
                <div>
                  <CardTitle className="text-sm font-bold">
                    {CATEGORY_CONFIG[activeCategory]?.label || activeCategory}
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {CATEGORY_CONFIG[activeCategory]?.description || ''}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-4 bg-muted/30 rounded w-24 animate-pulse" />
                    <div className="h-9 bg-muted/30 rounded-xl flex-1 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {(grouped[activeCategory] || []).map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold">{item.label}</Label>
                        {item.isPublic && (
                          <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-[9px] px-1.5 py-0">
                            عمومی
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{item.key}</span>
                    </div>
                    {renderInput(item)}
                    {editValues[item.key] !== undefined && editValues[item.key] !== item.value && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        تغییر یافته — مقدار قبلی: {item.value || '(خالی)'}
                      </p>
                    )}
                  </div>
                ))}
                {(!grouped[activeCategory] || grouped[activeCategory].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">تنظیماتی در این دسته وجود ندارد</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Field Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">افزودن فیلد تنظیمات جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">کلید</Label>
                <Input
                  value={newField.key}
                  onChange={(e) => setNewField((p) => ({ ...p, key: e.target.value.replace(/\s/g, '_') }))}
                  placeholder="مثلاً: alert_color"
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">عنوان</Label>
                <Input
                  value={newField.label}
                  onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                  placeholder="مثلاً: رنگ هشدار"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">دسته‌بندی</Label>
                <Select
                  value={newField.category}
                  onValueChange={(val) => setNewField((p) => ({ ...p, category: val }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">نوع فیلد</Label>
                <Select
                  value={newField.type}
                  onValueChange={(val) => setNewField((p) => ({ ...p, type: val }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">متن</SelectItem>
                    <SelectItem value="number">عدد</SelectItem>
                    <SelectItem value="boolean">بله/خیر</SelectItem>
                    <SelectItem value="color">رنگ</SelectItem>
                    <SelectItem value="select">انتخابی</SelectItem>
                    <SelectItem value="image">تصویر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block">مقدار اولیه</Label>
              <Input
                value={newField.value}
                onChange={(e) => setNewField((p) => ({ ...p, value: e.target.value }))}
                placeholder="مقدار پیش‌فرض"
                className="rounded-xl"
              />
            </div>
            {newField.type === 'select' && (
              <div>
                <Label className="text-xs font-bold mb-1.5 block">گزینه‌ها (JSON)</Label>
                <Input
                  value={newField.options}
                  onChange={(e) => setNewField((p) => ({ ...p, options: e.target.value }))}
                  placeholder='["گزینه۱","گزینه۲"]'
                  className="rounded-xl"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch
                checked={newField.isPublic}
                onCheckedChange={(checked) => setNewField((p) => ({ ...p, isPublic: checked }))}
              />
              <Label className="text-xs">نمایش عمومی (قابل دسترسی بدون احراز هویت)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
              انصراف
            </Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              onClick={handleAddField}
            >
              افزودن فیلد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
