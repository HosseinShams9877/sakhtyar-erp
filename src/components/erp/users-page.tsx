'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Power, PowerOff, Fingerprint, Smartphone, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, ROLE_COLORS, ROLE_ICONS, toPersianDigits, type Role } from '@/lib/rbac';

interface User {
  id: string;
  name: string;
  nationalCode: string;
  mobile: string;
  email: string | null;
  role: string;
  roleId: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

type RoleKey = keyof typeof ROLE_LABELS;

// ─── نقش‌های سیستم (هماهنگ با rbac.ts) ───
const ROLE_KEYS: RoleKey[] = ['SUPER_MANAGER', 'PROJECT_MANAGER', 'PURCHASER', 'WAREHOUSE_KEEPER', 'ADMIN'];

const ROLE_GRADIENTS: Record<string, string> = {
  SUPER_MANAGER: 'gradient-purple',
  PROJECT_MANAGER: 'gradient-info',
  PURCHASER: 'gradient-warning',
  WAREHOUSE_KEEPER: 'gradient-success',
  ADMIN: 'gradient-danger',
};

const emptyCreateForm = {
  name: '',
  nationalCode: '',
  mobile: '',
  email: '',
  roleId: '' as string,
  phone: '',
};

export default function UsersPage() {
  const { session } = useAuth();
  const currentUserRole = (session?.user as any)?.role as Role || 'WAREHOUSE_KEEPER';
  const currentUserId = (session?.user as any)?.id as string || '';
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_MANAGER';

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; label: string; color: string }[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [loading, setLoading] = useState(true);

const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
const [loadingProjects, setLoadingProjects] = useState(false);

const [editSelectedProjects, setEditSelectedProjects] = useState<string[]>([]);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });
  const [creating, setCreating] = useState(false);

  // Credential display after creation
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; nationalCode: string; mobile: string } | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '', name: '', nationalCode: '', mobile: '', email: '', roleId: '' as string,
    phone: '', isActive: true,
  });
  const [editing, setEditing] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle active
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // API returns { users: [...] } or just [...]
        const usersArr = Array.isArray(data) ? data : (data.users || []);
        setUsers(usersArr);
      }
    } catch {
      toast.error('خطا در بارگذاری کاربران');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        const rolesArr = Array.isArray(data) ? data : (data.roles || []);
        console.log('📋 [DEBUG] Roles loaded:', rolesArr); // ← لاگ اضافه کن
        setRoles(rolesArr);
      } else {
        // اگر API不存在، از نقش‌های ثابت استفاده کن
        const fallbackRoles = [
          { id: 'role_super_manager', name: 'SUPER_MANAGER', label: 'مدیر کل پروژه‌ها', color: 'purple' },
          { id: 'role_project_manager', name: 'PROJECT_MANAGER', label: 'مدیر پروژه', color: 'blue' },
          { id: 'role_purchaser', name: 'PURCHASER', label: 'مسئول خرید', color: 'amber' },
          { id: 'role_warehouse_keeper', name: 'WAREHOUSE_KEEPER', label: 'انباردار', color: 'emerald' },
          { id: 'role_admin', name: 'ADMIN', label: 'ادمین سیستم', color: 'red' },
        ];
        setRoles(fallbackRoles);
      }
    } catch {
      // در خطا هم از نقش‌های ثابت استفاده کن
      const fallbackRoles = [
        { id: 'role_super_manager', name: 'SUPER_MANAGER', label: 'مدیر کل پروژه‌ها', color: 'purple' },
        { id: 'role_project_manager', name: 'PROJECT_MANAGER', label: 'مدیر پروژه', color: 'blue' },
        { id: 'role_purchaser', name: 'PURCHASER', label: 'مسئول خرید', color: 'amber' },
        { id: 'role_warehouse_keeper', name: 'WAREHOUSE_KEEPER', label: 'انباردار', color: 'emerald' },
        { id: 'role_admin', name: 'ADMIN', label: 'ادمین سیستم', color: 'red' },
      ];
      setRoles(fallbackRoles);
    }
  }, []);
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/projects?status=active');
      if (res.ok) {
        const data = await res.json();
        const projectsArr = Array.isArray(data) ? data : (data.projects || []);
        setProjects(projectsArr);
      }
    } catch {
      toast.error('خطا در بارگذاری پروژه‌ها');
    } finally {
      setLoadingProjects(false);
    }
  }, []);
  
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => { loadUsers(); loadRoles(); }, [loadUsers, loadRoles]);

  // ─── نگاشت roleId به نام نقش ───
  const getRoleName = (user: User): string => {
    if (user.role) return user.role;
    // تلاش از لیست نقش‌ها
    const matchedRole = roles.find(r => r.id === user.roleId);
    return matchedRole?.name || 'WAREHOUSE_KEEPER';
  };

  // ─── Client-side search & filter ───
  const filteredUsers = users.filter((u) => {
    const roleName = getRoleName(u);
    const matchesSearch = !search ||
      u.name.includes(search) ||
      u.nationalCode?.includes(search) ||
      u.mobile?.includes(search);
    const matchesRole = !filterRole || filterRole === 'all' || roleName === filterRole;
    return matchesSearch && matchesRole;
  });

  // ─── کپی متن ───
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('خطا در کپی');
    }
  };

  // ─── Create ───
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.nationalCode || !createForm.mobile) {
      toast.error('نام، کد ملی و شماره موبایل الزامی است');
      return;
    }
    setCreating(true);
    try {
      // پیدا کردن نقش انتخاب شده و گرفتن name آن
      const selectedRole = roles.find(r => r.id === createForm.roleId);
      const roleNameToSend = selectedRole?.name || createForm.roleId;
      
      console.log('📤 Sending roleName:', roleNameToSend);
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          nationalCode: createForm.nationalCode,
          mobile: createForm.mobile,
          email: createForm.email || undefined,
          roleId: roleNameToSend,  // ← ارسال name نقش (مثلاً 'PURCHASER')
          phone: createForm.phone || undefined,
          projectIds: selectedProjects.length > 0 ? selectedProjects : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('کاربر جدید ثبت شد');
        setCreateForm({ ...emptyCreateForm });
        setSelectedProjects([]);
        setCreateOpen(false);
        setCreatedCredentials({
          name: createForm.name,
          nationalCode: createForm.nationalCode,
          mobile: createForm.mobile,
        });
        setCredentialsOpen(true);
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ثبت کاربر');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setCreating(false);
    }
  };

  // ─── Edit ───
  const openEdit = (user: User) => {

    console.log('🔍 [openEdit] User:', user);
    console.log('🔍 [openEdit] user.roleId:', user.roleId);
    console.log('🔍 [openEdit] user.role:', user.role);
    const roleName = getRoleName(user);
    const matchedRole = roles.find(r => r.name === roleName);
    setEditForm({
      id: user.id,
      name: user.name,
      nationalCode: user.nationalCode || '',
      mobile: user.mobile || '',
      email: user.email || '',
      roleId: user.roleId || '',
      phone: user.phone || '',
      isActive: user.isActive,
    });
    
    // دریافت پروژه‌های کاربر از users state
    const foundUser = users.find(u => u.id === user.id);
    // پشتیبانی از هر دو نام projectAccess و userProject
    const projectAccess = (foundUser as any)?.projectAccess || (foundUser as any)?.userProject || [];
    
    if (projectAccess.length > 0) {
      const projectIds = projectAccess.map((pa: any) => pa.project?.id || pa.projectId);
      setEditSelectedProjects(projectIds.filter(Boolean));
    } else {
      setEditSelectedProjects([]);
    }
    
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.nationalCode || !editForm.mobile) {
      toast.error('نام، کد ملی و شماره موبایل الزامی است');
      return;
    }
    setEditing(true);
    try {
      const body: Record<string, any> = {
        id: editForm.id,
        name: editForm.name,
        nationalCode: editForm.nationalCode,
        mobile: editForm.mobile,
        email: editForm.email || null,
        roleId: editForm.roleId || null,
        phone: editForm.phone || undefined,
        isActive: editForm.isActive,
        projectIds: editSelectedProjects,
      };
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('اطلاعات کاربر به‌روزرسانی شد');
        setEditOpen(false);
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در به‌روزرسانی');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setEditing(false);
    }
  };

  // ─── Toggle Active ───
  const handleToggleActive = async (user: User) => {
    setTogglingId(user.id);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(user.isActive ? 'کاربر غیرفعال شد' : 'کاربر فعال شد');
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در تغییر وضعیت');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('کاربر حذف شد');
        setDeleteTarget(null);
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در حذف کاربر');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Counters ───
  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = users.filter(u => !u.isActive).length;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">مدیریت کاربران</h3>
          <p className="text-sm text-muted-foreground">
            {toPersianDigits(users.length)} کاربر · {toPersianDigits(activeCount)} فعال · {toPersianDigits(inactiveCount)} غیرفعال
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5" />
            نام کاربری = کد ملی | رمز عبور = شماره موبایل
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="جستجوی نام، کد ملی..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 input-modern rounded-xl"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue placeholder="نقش" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نقش‌ها</SelectItem>
              {ROLE_KEYS.map((key) => (
                <SelectItem key={key} value={key}>{ROLE_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button
              className="gap-2 gradient-primary hover:opacity-90 rounded-xl shadow-soft"
              onClick={() => { setCreateForm({ ...emptyCreateForm }); setCreateOpen(true); }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">کاربر جدید</span>
            </Button>
            <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
  <DialogHeader className="sticky top-0 dark:bg-gray-900 z-10 pb-2">
    <DialogTitle className="text-base font-bold">ثبت کاربر جدید</DialogTitle>
    <p className="text-xs text-muted-foreground mt-1">
      کد ملی به عنوان نام کاربری و شماره موبایل به عنوان رمز عبور خودکار تنظیم می‌شود
    </p>
  </DialogHeader>
  <form onSubmit={handleCreate} className="space-y-3 mt-2">
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">نام و نام خانوادگی *</Label>
      <Input
        value={createForm.name}
        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
        className="input-modern rounded-xl h-9 text-sm"
        placeholder="مثال: احمد محمدی"
        required
      />
    </div>
    
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold flex items-center gap-1">
        <Fingerprint className="w-3 h-3" />
        کد ملی (نام کاربری) *
      </Label>
      <Input
        value={createForm.nationalCode}
        onChange={(e) => setCreateForm({ ...createForm, nationalCode: e.target.value.replace(/\D/g, '').slice(0, 10) })}
        className="input-modern rounded-xl h-9 text-sm"
        placeholder="کد ملی ۱۰ رقمی"
        dir="ltr"
        maxLength={10}
        required
      />
      <p className="text-[9px] text-muted-foreground">کد ملی ۱۰ رقمی بدون خط تیره</p>
    </div>
    
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold flex items-center gap-1">
        <Smartphone className="w-3 h-3" />
        شماره موبایل (رمز عبور) *
      </Label>
      <Input
        value={createForm.mobile}
        onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 11) })}
        className="input-modern rounded-xl h-9 text-sm"
        placeholder="مثال: 09121234567"
        dir="ltr"
        maxLength={11}
        required
      />
      <p className="text-[9px] text-amber-600 dark:text-amber-400">رمز عبور خودکار = شماره موبایل</p>
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">نقش *</Label>
        <Select value={createForm.roleId} onValueChange={(v) => setCreateForm({ ...createForm, roleId: v })}>
          <SelectTrigger className="rounded-xl h-9 text-sm">
            <SelectValue placeholder="انتخاب نقش" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">شماره تماس ثابت</Label>
        <Input
          value={createForm.phone}
          onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
          className="input-modern rounded-xl h-9 text-sm"
          dir="ltr"
          placeholder="اختیاری"
        />
      </div>
    </div>
    
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">ایمیل (اختیاری)</Label>
      <Input
        type="email"
        value={createForm.email}
        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
        className="input-modern rounded-xl h-9 text-sm"
        dir="ltr"
        placeholder="ایمیل (اختیاری)"
      />
    </div>

    {/* انتخاب پروژه‌ها - با ارتفاع محدود */}
<div className="space-y-1.5">
  <Label className="text-xs font-semibold">دسترسی به پروژه‌ها</Label>
  <div className="border rounded-xl max-h-28 overflow-y-auto p-2 space-y-1 bg-muted/20">
    {loadingProjects ? (
      <div className="text-center py-2 text-muted-foreground text-xs">در حال بارگذاری...</div>
    ) : projects.length === 0 ? (
      <div className="text-center py-2 text-muted-foreground text-xs">پروژه‌ای یافت نشد</div>
    ) : (
      projects.map((project) => (
        <label key={project.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedProjects.includes(project.id)}  // ← اینجا باید selectedProjects باشد نه editSelectedProjects
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedProjects([...selectedProjects, project.id]);  // ← اینجا setSelectedProjects
              } else {
                setSelectedProjects(selectedProjects.filter(id => id !== project.id));  // ← اینجا setSelectedProjects
              }
            }}
            className="rounded border-gray-300 w-3.5 h-3.5"
          />
          <span className="text-xs">{project.name}</span>
        </label>
      ))
    )}
  </div>
  <p className="text-[9px] text-muted-foreground">
    {selectedProjects.length === 0 ? 'بدون انتخاب = دسترسی به همه پروژه‌ها' : `${toPersianDigits(selectedProjects.length)} پروژه انتخاب شده`}
  </p>
</div>

    {/* پیش‌نمایش اطلاعات ورود */}
    {createForm.nationalCode && createForm.mobile && (
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 p-2 space-y-1">
        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300">اطلاعات ورود:</p>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">نام کاربری:</span>
          <span className="font-mono font-bold" dir="ltr">{createForm.nationalCode}</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">رمز عبور:</span>
          <span className="font-mono font-bold" dir="ltr">{createForm.mobile}</span>
        </div>
      </div>
    )}

    <div className="flex gap-3 justify-end pt-2 sticky bottom-0  dark:bg-gray-900 py-2 border-t">
      <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl h-8 text-xs">
        انصراف
      </Button>
      <Button type="submit" disabled={creating} className="gradient-primary hover:opacity-90 rounded-xl h-8 text-xs shadow-soft">
        {creating ? '...' : 'ثبت کاربر'}
      </Button>
    </div>
  </form>
</DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── Table ─── */}
      <Card className="border-0 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right text-xs font-semibold">نام</TableHead>
                  <TableHead className="text-right text-xs font-semibold">کد ملی (نام کاربری)</TableHead>
                  <TableHead className="text-right text-xs font-semibold">موبایل (رمز عبور)</TableHead>
                  <TableHead className="text-right text-xs font-semibold">نقش</TableHead>
                  <TableHead className="text-right text-xs font-semibold">وضعیت</TableHead>
                  <TableHead className="text-right text-xs font-semibold">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted/50 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      کاربری یافت نشد
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const roleName = getRoleName(user);
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                        {/* نام */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${ROLE_GRADIENTS[roleName] || 'gradient-primary'} rounded-lg flex items-center justify-center flex-shrink-0 shadow-soft`}>
                              <span className="text-xs font-bold text-white">{user.name.charAt(0)}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-sm block">{user.name}</span>
                              {user.email && <span className="text-[10px] text-muted-foreground" dir="ltr">{user.email}</span>}
                            </div>
                          </div>
                        </TableCell>
                        {/* کد ملی (نام کاربری) */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Fingerprint className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-mono text-sm" dir="ltr">{user.nationalCode || '—'}</span>
                          </div>
                        </TableCell>
                        {/* موبایل (رمز عبور) */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-mono text-sm" dir="ltr">{user.mobile || '—'}</span>
                          </div>
                        </TableCell>
                        {/* نقش */}
                        <TableCell>
                          <Badge className={`${ROLE_COLORS[roleName as RoleKey] || ''} text-[10px]`}>
                            {ROLE_LABELS[roleName as RoleKey] || '—'}
                          </Badge>
                        </TableCell>
                        {/* وضعیت */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            <span className={`text-xs font-medium ${user.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500'}`}>
                              {user.isActive ? 'فعال' : 'غیرفعال'}
                            </span>
                          </div>
                        </TableCell>
                        {/* عملیات */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              onClick={() => openEdit(user)}
                              title="ویرایش"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              onClick={() => handleToggleActive(user)}
                              disabled={togglingId === user.id}
                              title={user.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                            >
                              {user.isActive ? (
                                <PowerOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <Power className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </Button>
                            {isAdmin && user.id !== currentUserId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => setDeleteTarget(user)}
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
    <DialogHeader className="sticky top-0  dark:bg-gray-900 z-10 pb-2">
      <DialogTitle className="text-base font-bold">ویرایش کاربر</DialogTitle>

    </DialogHeader>
    <form onSubmit={handleEdit} className="space-y-3 mt-2">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">نام و نام خانوادگی *</Label>
        <Input
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className="input-modern rounded-xl h-9 text-sm"
          required
        />
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Fingerprint className="w-3 h-3" />
          کد ملی (نام کاربری) *
        </Label>
        <Input
          value={editForm.nationalCode}
          onChange={(e) => setEditForm({ ...editForm, nationalCode: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          className="input-modern rounded-xl h-9 text-sm"
          dir="ltr"
          maxLength={10}
          required
        />
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Smartphone className="w-3 h-3" />
          شماره موبایل (رمز عبور) *
        </Label>
        <Input
          value={editForm.mobile}
          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 11) })}
          className="input-modern rounded-xl h-9 text-sm"
          dir="ltr"
          maxLength={11}
          required
        />
        <p className="text-[9px] text-amber-600 dark:text-amber-400">
          اگر شماره موبایل تغییر کند، رمز عبور ورود هم خودکار به‌روزرسانی می‌شود
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">نقش *</Label>
          <Select
            value={editForm.roleId}
            onValueChange={(v) => setEditForm({ ...editForm, roleId: v })}
          >
            <SelectTrigger className="rounded-xl h-9 text-sm">
              <SelectValue placeholder="انتخاب نقش" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">شماره تماس ثابت</Label>
          <Input
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            className="input-modern rounded-xl h-9 text-sm"
            dir="ltr"
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">ایمیل (اختیاری)</Label>
        <Input
          type="email"
          value={editForm.email}
          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          className="input-modern rounded-xl h-9 text-sm"
          dir="ltr"
        />
      </div>

      {/* انتخاب پروژه‌ها */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">دسترسی به پروژه‌ها</Label>
        <div className="border rounded-xl max-h-28 overflow-y-auto p-2 space-y-1 bg-muted/20">
          {projects.map((project) => (
            <label key={project.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editSelectedProjects.includes(project.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setEditSelectedProjects([...editSelectedProjects, project.id]);
                  } else {
                    setEditSelectedProjects(editSelectedProjects.filter(id => id !== project.id));
                  }
                }}
                className="rounded border-gray-300 w-3.5 h-3.5"
              />
              <span className="text-xs">{project.name}</span>
            </label>
          ))}
          {projects.length === 0 && (
            <div className="text-center py-2 text-muted-foreground text-xs">پروژه‌ای یافت نشد</div>
          )}
        </div>
      </div>

      {/* وضعیت حساب */}
      <div className="flex items-center justify-between rounded-xl bg-muted/60 p-2.5">
        <div className="space-y-0.5">
          <Label className="text-xs font-semibold">وضعیت حساب کاربری</Label>
          <p className="text-[9px] text-muted-foreground">
            {editForm.isActive ? 'کاربر فعال است و می‌تواند وارد شود' : 'کاربر غیرفعال است و دسترسی ندارد'}
          </p>
        </div>
        <Switch
          checked={editForm.isActive}
          onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
        />
      </div>

      {/* دکمه‌ها */}
      <div className="flex gap-3 justify-end pt-2 sticky bottom-0 bg-white dark:bg-gray-900 py-2 border-t">
        <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl h-8 text-xs">
          انصراف
        </Button>
        <Button type="submit" disabled={editing} className="gradient-primary hover:opacity-90 rounded-xl h-8 text-xs shadow-soft">
          {editing ? '...' : 'به‌روزرسانی'}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

      {/* ─── Credential Display Dialog ─── */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-center">کاربر با موفقیت ایجاد شد</DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 p-4 space-y-3">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 text-center">
                  اطلاعات ورود {createdCredentials.name}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-emerald-200/30 dark:border-emerald-800/20">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">نام کاربری (کد ملی)</span>
                      <span className="font-mono font-bold text-sm" dir="ltr">{createdCredentials.nationalCode}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg"
                      onClick={() => copyToClipboard(createdCredentials.nationalCode)}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-emerald-200/30 dark:border-emerald-800/20">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">رمز عبور (شماره موبایل)</span>
                      <span className="font-mono font-bold text-sm" dir="ltr">{createdCredentials.mobile}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg"
                      onClick={() => copyToClipboard(createdCredentials.mobile)}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                این اطلاعات را به کاربر اطلاع دهید تا بتواند وارد سیستم شود
              </p>
              <Button
                className="w-full gradient-primary hover:opacity-90 rounded-xl shadow-soft"
                onClick={() => setCredentialsOpen(false)}
              >
                متوجه شدم
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">تأیید حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              آیا از حذف کاربر <span className="font-bold text-foreground">{deleteTarget?.name}</span> اطمینان دارید؟
              این کاربر غیرفعال خواهد شد و دیگر قادر به ورود به سیستم نخواهد بود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? '...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
