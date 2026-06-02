'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Edit2,
  Trash2,
  CircleDollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { toPersianDigits, formatCurrency, toPersianDate, getProjectStatusInfo } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  totalDebt: number;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);

  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const resetForm = () => {
    setFormName(''); setFormLocation(''); setFormStatus('active');
    setEditItem(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (p: Project) => {
    setFormName(p.name); setFormLocation(p.location); setFormStatus(p.status);
    setEditItem(p); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName || !formLocation) {
      toast.error('لطفاً نام و آدرس پروژه را وارد کنید');
      return;
    }
    try {
      const body = { name: formName, location: formLocation, status: formStatus };
      const res = editItem
        ? await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editItem.id, ...body }) })
        : await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      if (res.ok) {
        toast.success(editItem ? 'پروژه بروزرسانی شد' : 'پروژه ثبت شد');
        setShowForm(false); resetForm(); fetchProjects();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا');
      }
    } catch { toast.error('خطا'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('حذف شد'); fetchProjects(); }
    } catch { toast.error('خطا'); }
  };

  const filtered = projects.filter(p =>
    !search || p.name.includes(search) || p.location.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">پروژه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت پروژه‌های ساختمانی و پیگیری بدهی</p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-white border-0 gap-2">
          <Plus className="w-4 h-4" />
          پروژه جدید
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو در نام یا آدرس پروژه..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>پروژه‌ای یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => {
            const statusInfo = getProjectStatusInfo(project.status);
            return (
              <Card key={project.id} className="shadow-soft card-hover group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{project.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={cn('text-[10px]', statusInfo.color)} variant="secondary">
                        {statusInfo.label}
                      </Badge>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(project)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(project.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CircleDollarSign className="w-3.5 h-3.5" />
                      بدهی باز
                    </div>
                    <span className={cn('font-bold text-sm', (project.totalDebt || 0) > 0 ? 'text-red-600' : 'text-emerald-600')}>
                      {formatCurrency(project.totalDebt || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'ویرایش پروژه' : 'پروژه جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>نام پروژه *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="برج الهیه" />
            </div>
            <div className="space-y-2">
              <Label>آدرس *</Label>
              <Input value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="تهران، الهیه" />
            </div>
            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="completed">تکمیل شده</SelectItem>
                  <SelectItem value="on_hold">متوقف</SelectItem>
                </SelectContent>
              </Select>
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
