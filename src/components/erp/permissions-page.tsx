'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  RESOURCES,
  ACTIONS,
  SCOPES,
  RESOURCE_LABELS,
  ACTION_LABELS,
  ROLE_COLORS,
  ROLE_LABELS,
  toPersianDigits,
} from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Users,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronLeft,
  Save,
  RefreshCw,
  Crown,
  FolderKanban,
  ShoppingBag,
  Warehouse,
  Eye,
  Settings,
  LayoutDashboard,
  FileText,
  Truck,
  BarChart3,
  Search,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface RolePermission {
  id: string;
  resource: string;
  action: string;
  scope: string;
}

interface Role {
  id: string;
  name: string;
  label: string;
  description: string | null;
  color: string;
  isSystem: boolean;
  priority: number;
  permissions: RolePermission[];
  _count?: { users: number };
}

type ScopeValue = 'all' | 'own' | 'assigned' | 'project' | '';

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const SCOPE_COLORS: Record<string, string> = {
  all: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  own: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  assigned: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  project: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  '': 'bg-gray-50 text-gray-400 dark:bg-gray-800/40 dark:text-gray-600 border-gray-200 dark:border-gray-700',
};

const SCOPE_LABELS: Record<string, string> = {
  all: 'همه',
  own: 'خود',
  assigned: 'اختصاصی',
  project: 'پروژه',
  '': '—',
};

const SCOPE_SHORT: Record<string, string> = {
  all: 'ه',
  own: 'خ',
  assigned: 'ا',
  project: 'پ',
  '': '—',
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  invoices: FileText,
  vendors: Truck,
  transactions: ShoppingBag,
  warehouse: Warehouse,
  reports: BarChart3,
  users: Users,
  settings: Settings,
};

const ROLE_ICON_MAP: Record<string, React.ElementType> = {
  SUPER_MANAGER: Crown,
  PROJECT_MANAGER: FolderKanban,
  PURCHASER: ShoppingBag,
  WAREHOUSE_KEEPER: Warehouse,
  ADMIN: Shield,
};

const SCOPE_OPTIONS: { value: ScopeValue; label: string; description: string }[] = [
  { value: '', label: 'بدون دسترسی', description: 'دسترسی غیرفعال' },
  { value: 'all', label: 'همه موارد', description: 'دسترسی کامل به تمام موارد' },
  { value: 'own', label: 'فقط موارد خود', description: 'فقط موارد ایجادشده توسط خود کاربر' },
  { value: 'assigned', label: 'فقط اختصاص‌داده‌شده', description: 'فقط موارد اختصاص‌داده‌شده به کاربر' },
  { value: 'project', label: 'فقط پروژه‌های خود', description: 'فقط پروژه‌هایی که کاربر در آن‌ها عضو است' },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function PermissionsPage() {
  // ─── State ───
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('matrix');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    label: '',
    description: '',
    color: '#7c3aed',
  });
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    label: '',
    description: '',
    color: '#7c3aed',
  });

  // ─── Data Loading ───
  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      } else {
        toast.error('خطا در بارگذاری نقش‌ها');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // ─── Permission helpers ───
  const getPermissionKey = (resource: string, action: string) => `${resource}:${action}`;

  const buildPermissionMap = useCallback((role: Role): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const p of role.permissions) {
      map[getPermissionKey(p.resource, p.action)] = p.scope;
    }
    return map;
  }, []);

  const handleSelectRole = useCallback((role: Role) => {
    setSelectedRole(role);
    setEditingPermissions(buildPermissionMap(role));
    setActiveTab('editor');
  }, [buildPermissionMap]);

  const getScopeForCell = useCallback(
    (role: Role, resource: string, action: string): string => {
      const perm = role.permissions.find(
        (p) => p.resource === resource && p.action === action
      );
      return perm?.scope || '';
    },
    []
  );

  // ─── Permission Matrix Cell Click ───
  const handleMatrixCellClick = useCallback(
    (role: Role, resource: string, action: string) => {
      // Open that role in the editor, focused on the right permission
      handleSelectRole(role);
    },
    [handleSelectRole]
  );

  // ─── Save permissions ───
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const permissions = Object.entries(editingPermissions)
        .filter(([, scope]) => scope !== '')
        .map(([key, scope]) => {
          const [resource, action] = key.split(':');
          return { resource, action, scope };
        });

      const res = await fetch('/api/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRole.id,
          permissions,
        }),
      });

      if (res.ok) {
        toast.success('مجوزهای نقش با موفقیت ذخیره شد');
        await loadRoles();
        // Re-select the role to refresh
        const updated = await fetch('/api/roles');
        if (updated.ok) {
          const data = await updated.json();
          const refreshed = (data.roles || []).find((r: Role) => r.id === selectedRole.id);
          if (refreshed) {
            setSelectedRole(refreshed);
            setEditingPermissions(buildPermissionMap(refreshed));
          }
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ذخیره مجوزها');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  // ─── Create Role ───
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.label) {
      toast.error('نام و عنوان نقش الزامی است');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        toast.success('نقش جدید با موفقیت ایجاد شد');
        setCreateForm({ name: '', label: '', description: '', color: '#7c3aed' });
        setCreateOpen(false);
        loadRoles();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ایجاد نقش');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setCreating(false);
    }
  };

  // ─── Edit Role Info ───
  const openEditRole = (role: Role) => {
    setEditForm({
      id: role.id,
      name: role.name,
      label: role.label,
      description: role.description || '',
      color: role.color,
    });
    setEditOpen(true);
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.label) {
      toast.error('عنوان نقش الزامی است');
      return;
    }
    try {
      const res = await fetch('/api/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id,
          label: editForm.label,
          description: editForm.description,
          color: editForm.color,
        }),
      });
      if (res.ok) {
        toast.success('اطلاعات نقش به‌روزرسانی شد');
        setEditOpen(false);
        loadRoles();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در به‌روزرسانی');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  // ─── Delete Role ───
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/roles?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('نقش با موفقیت حذف شد');
        if (selectedRole?.id === deleteTarget.id) {
          setSelectedRole(null);
          setEditingPermissions({});
        }
        setDeleteTarget(null);
        loadRoles();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در حذف نقش');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Scope toggle in editor ───
  const toggleScope = (resource: string, action: string) => {
    const key = getPermissionKey(resource, action);
    const current = editingPermissions[key] || '';
    const scopeCycle: ScopeValue[] = ['', 'all', 'own', 'assigned', 'project'];
    const idx = scopeCycle.indexOf(current as ScopeValue);
    const next = scopeCycle[(idx + 1) % scopeCycle.length];
    setEditingPermissions((prev) => ({
      ...prev,
      [key]: next,
    }));
  };

  const setScope = (resource: string, action: string, scope: ScopeValue) => {
    const key = getPermissionKey(resource, action);
    setEditingPermissions((prev) => ({
      ...prev,
      [key]: scope,
    }));
  };

  // ─── Bulk actions ───
  const setAllForResource = (resource: string, scope: ScopeValue) => {
    const updates: Record<string, string> = {};
    ACTIONS.forEach((action) => {
      updates[getPermissionKey(resource, action)] = scope;
    });
    setEditingPermissions((prev) => ({ ...prev, ...updates }));
  };

  const setAllForAction = (action: string, scope: ScopeValue) => {
    const updates: Record<string, string> = {};
    RESOURCES.forEach((resource) => {
      updates[getPermissionKey(resource, action)] = scope;
    });
    setEditingPermissions((prev) => ({ ...prev, ...updates }));
  };

  // ─── Computed stats ───
  const totalPermissions = useMemo(() => {
    if (!selectedRole) return 0;
    return Object.values(editingPermissions).filter((s) => s !== '').length;
  }, [selectedRole, editingPermissions]);

  const maxPermissions = RESOURCES.length * ACTIONS.length;

  // ─── Color palette for new roles ───
  const COLOR_PALETTE = [
    '#7c3aed', '#2563eb', '#0891b2', '#059669',
    '#d97706', '#dc2626', '#db2777', '#4f46e5',
    '#0d9488', '#ca8a04',
  ];

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold">ماتریس مجوزها</h3>
            <p className="text-sm text-muted-foreground">
              مدیریت دسترسی نقش‌ها به منابع سیستم
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={loadRoles}
            disabled={loading}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            بروزرسانی
          </Button>
          <Button
            className="gap-2 gradient-primary hover:opacity-90 rounded-xl shadow-soft"
            onClick={() => {
              setCreateForm({ name: '', label: '', description: '', color: '#7c3aed' });
              setCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">نقش جدید</span>
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">تعداد نقش‌ها</p>
                <p className="text-lg font-extrabold">{toPersianDigits(roles.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-success flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">کل کاربران</p>
                <p className="text-lg font-extrabold">
                  {toPersianDigits(roles.reduce((sum, r) => sum + (r._count?.users || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-warning flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">نقش‌های سیستمی</p>
                <p className="text-lg font-extrabold">
                  {toPersianDigits(roles.filter((r) => r.isSystem).length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-info flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">کل مجوزها</p>
                <p className="text-lg font-extrabold">
                  {toPersianDigits(roles.reduce((sum, r) => sum + r.permissions.length, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="matrix" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-soft">
            <Eye className="w-3.5 h-3.5" />
            ماتریس مجوزها
          </TabsTrigger>
          <TabsTrigger value="editor" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-soft">
            <Pencil className="w-3.5 h-3.5" />
            ویرایشگر نقش
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            Tab 1: Permission Matrix
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="matrix" className="space-y-4">
          {/* Scope Legend */}
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold">راهنمای محدوده دسترسی</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SCOPES.map((scope) => (
                  <Badge
                    key={scope.value}
                    variant="outline"
                    className={cn('text-[11px] px-2.5 py-1 border', SCOPE_COLORS[scope.value])}
                  >
                    {scope.label}
                  </Badge>
                ))}
                <Badge
                  variant="outline"
                  className={cn('text-[11px] px-2.5 py-1 border', SCOPE_COLORS[''])}
                >
                  بدون دسترسی
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Matrix Table */}
          <Card className="border-0 shadow-soft overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      {/* Role names row */}
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-right text-xs font-bold sticky right-0 bg-muted/40 z-10 min-w-[140px] border-l border-border">
                          منبع / عملیات
                        </TableHead>
                        {roles.map((role) => (
                          <TableHead
                            key={role.id}
                            className="text-center text-[11px] font-bold min-w-[100px] px-2 cursor-pointer hover:bg-muted/60 transition-colors"
                            onClick={() => handleSelectRole(role)}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                className={cn(
                                  'text-[9px] px-1.5 py-0.5 border whitespace-nowrap',
                                  ROLE_COLORS[role.name] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200'
                                )}
                              >
                                {role.label}
                              </Badge>
                              <span className="text-[9px] text-muted-foreground font-normal">
                                {toPersianDigits(role._count?.users || 0)} کاربر
                              </span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        // Skeleton
                        [...Array(RESOURCES.length)].map((_, ri) => (
                          <TableRow key={ri}>
                            <TableCell className="sticky right-0 bg-card z-10 border-l border-border">
                              <div className="h-4 bg-muted/50 rounded animate-pulse w-24" />
                            </TableCell>
                            {[...Array(roles.length)].map((_, ci) => (
                              <TableCell key={ci}>
                                <div className="h-6 bg-muted/30 rounded animate-pulse w-16 mx-auto" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        RESOURCES.map((resource) => {
                          const ResIcon = RESOURCE_ICONS[resource] || Shield;
                          return (
                            <React.Fragment key={resource}>
                              {/* Resource header row */}
                              <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableCell
                                  className="sticky right-0 bg-muted/20 z-10 border-l border-border font-bold text-xs py-2"
                                  colSpan={roles.length + 1}
                                >
                                  <div className="flex items-center gap-2">
                                    <ResIcon className="w-4 h-4 text-primary" />
                                    <span>{RESOURCE_LABELS[resource]}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {/* Action rows under this resource */}
                              {ACTIONS.map((action) => (
                                <TableRow
                                  key={`${resource}-${action}`}
                                  className="hover:bg-muted/30 transition-colors"
                                >
                                  <TableCell className="sticky right-0 bg-card z-10 border-l border-border text-xs text-muted-foreground py-2 pr-8">
                                    {ACTION_LABELS[action]}
                                  </TableCell>
                                  {roles.map((role) => {
                                    const scope = getScopeForCell(role, resource, action);
                                    return (
                                      <TableCell
                                        key={`${role.id}-${resource}-${action}`}
                                        className="text-center py-1.5 px-1 cursor-pointer"
                                        onClick={() => handleMatrixCellClick(role, resource, action)}
                                      >
                                        <div
                                          className={cn(
                                            'inline-flex items-center justify-center min-w-[32px] h-6 rounded-md text-[10px] font-medium border transition-all duration-150 hover:scale-105',
                                            SCOPE_COLORS[scope]
                                          )}
                                        >
                                          {SCOPE_SHORT[scope]}
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </React.Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Roles Quick List */}
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-bold">فهرست نقش‌ها</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roles.map((role) => {
                  const RoleIcon = ROLE_ICON_MAP[role.name] || Shield;
                  return (
                    <div
                      key={role.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-primary/20',
                        selectedRole?.id === role.id && 'border-primary/30 bg-primary/5'
                      )}
                      onClick={() => handleSelectRole(role)}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: role.color + '20' }}
                      >
                        <RoleIcon className="w-4 h-4" style={{ color: role.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{role.label}</span>
                          {role.isSystem && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[9px] px-1.5 py-0">
                              سیستمی
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">
                            {toPersianDigits(role._count?.users || 0)} کاربر
                          </span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[11px] text-muted-foreground">
                            {toPersianDigits(role.permissions.length)} مجوز
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditRole(role);
                          }}
                          title="ویرایش"
                        >
                          <Pencil className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(role);
                            }}
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            Tab 2: Role Editor
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="editor" className="space-y-4">
          {!selectedRole ? (
            <Card className="border-0 shadow-soft">
              <CardContent className="py-16 text-center">
                <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h4 className="text-sm font-bold text-muted-foreground mb-1">
                  نقشی انتخاب نشده
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  برای ویرایش مجوزها، از ماتریس یا فهرست نقش‌ها یک نقش انتخاب کنید
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => setActiveTab('matrix')}
                >
                  <ChevronLeft className="w-4 h-4" />
                  رفتن به ماتریس
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Role Info Header */}
              <Card className="border-0 shadow-soft">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft"
                        style={{ backgroundColor: selectedRole.color + '20' }}
                      >
                        {React.createElement(ROLE_ICON_MAP[selectedRole.name] || Shield, {
                          className: 'w-5 h-5',
                          style: { color: selectedRole.color },
                        })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{selectedRole.label}</h4>
                          {selectedRole.isSystem && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[9px]">
                              سیستمی
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span>{ROLE_LABELS[selectedRole.name] || selectedRole.label || '—'}</span>
                          {selectedRole.description && ` · ${selectedRole.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-none text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        {toPersianDigits(totalPermissions)} / {toPersianDigits(maxPermissions)} مجوز فعال
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl text-xs"
                        onClick={() => openEditRole(selectedRole)}
                      >
                        <Pencil className="w-3 h-3" />
                        ویرایش نقش
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 rounded-xl gradient-primary hover:opacity-90 shadow-soft text-xs"
                        onClick={handleSavePermissions}
                        disabled={saving}
                      >
                        <Save className="w-3 h-3" />
                        {saving ? '...' : 'ذخیره مجوزها'}
                      </Button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all duration-500"
                      style={{ width: `${(totalPermissions / maxPermissions) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Permission Grid Editor */}
              <Card className="border-0 shadow-soft overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">ویرایش مجوزها</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">تنظیم سریع:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-[10px] h-7 gap-1"
                        onClick={() => {
                          const updates: Record<string, string> = {};
                          RESOURCES.forEach((r) =>
                            ACTIONS.forEach((a) => {
                              updates[getPermissionKey(r, a)] = 'all';
                            })
                          );
                          setEditingPermissions(updates);
                        }}
                      >
                        دسترسی کامل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-[10px] h-7 gap-1"
                        onClick={() => {
                          setEditingPermissions({});
                        }}
                      >
                        حذف همه
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="w-full">
                    <div className="min-w-[700px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="text-right text-xs font-bold sticky right-0 bg-muted/40 z-10 min-w-[130px] border-l border-border">
                              منبع
                            </TableHead>
                            {ACTIONS.map((action) => (
                              <TableHead
                                key={action}
                                className="text-center text-[11px] font-semibold min-w-[90px]"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span>{ACTION_LABELS[action]}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 rounded text-[9px] hover:bg-primary/10"
                                    onClick={() => setAllForAction(action, 'all')}
                                    title={`فعال‌سازی همه برای ${ACTION_LABELS[action]}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center text-[11px] min-w-[70px]">
                              همه
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {RESOURCES.map((resource) => {
                            const ResIcon = RESOURCE_ICONS[resource] || Shield;
                            return (
                              <TableRow
                                key={resource}
                                className="hover:bg-muted/30 transition-colors"
                              >
                                <TableCell className="sticky right-0 bg-card z-10 border-l border-border py-2">
                                  <div className="flex items-center gap-2">
                                    <ResIcon className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-semibold">
                                      {RESOURCE_LABELS[resource]}
                                    </span>
                                  </div>
                                </TableCell>
                                {ACTIONS.map((action) => {
                                  const key = getPermissionKey(resource, action);
                                  const scope = (editingPermissions[key] || '') as ScopeValue;
                                  // Use __none__ for empty scope since Select doesn't accept empty value
                                  const selectValue = scope || '__none__';
                                  return (
                                    <TableCell
                                      key={key}
                                      className="text-center py-1.5 px-1"
                                    >
                                      <Select
                                        value={selectValue}
                                        onValueChange={(val: string) =>
                                          setScope(resource, action, (val === '__none__' ? '' : val) as ScopeValue)
                                        }
                                      >
                                        <SelectTrigger
                                          className={cn(
                                            'h-7 rounded-md text-[10px] font-medium border px-1.5 w-full justify-center',
                                            SCOPE_COLORS[scope]
                                          )}
                                        >
                                          <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent dir="rtl">
                                          {SCOPE_OPTIONS.map((opt) => (
                                            <SelectItem
                                              key={opt.value || '__none__'}
                                              value={opt.value || '__none__'}
                                              className="text-xs"
                                            >
                                              <div className="flex items-center gap-2">
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    'text-[9px] px-1 py-0 border',
                                                    SCOPE_COLORS[opt.value]
                                                  )}
                                                >
                                                  {opt.label}
                                                </Badge>
                                                <span className="text-muted-foreground text-[10px]">
                                                  {opt.description}
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center py-1.5 px-1">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 rounded text-[9px] hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                      onClick={() => setAllForResource(resource, 'all')}
                                      title="فعال‌سازی همه"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 rounded text-[9px] hover:bg-red-50 dark:hover:bg-red-950/30"
                                      onClick={() => setAllForResource(resource, '')}
                                      title="غیرفعال‌سازی همه"
                                    >
                                      <XCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Quick Scope Reference */}
              <Card className="border-0 shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold">توضیحات محدوده‌ها</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {SCOPES.map((scope) => (
                      <div
                        key={scope.value}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 border whitespace-nowrap',
                            SCOPE_COLORS[scope.value]
                          )}
                        >
                          {scope.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {scope.value === 'all' && 'دسترسی کامل'}
                          {scope.value === 'own' && 'موارد خود کاربر'}
                          {scope.value === 'assigned' && 'موارد اختصاصی'}
                          {scope.value === 'project' && 'پروژه‌های عضو'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
          Dialogs
          ═══════════════════════════════════════════════════════════ */}

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              ایجاد نقش جدید
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">کلید نقش (انگلیسی) *</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value.toUpperCase().replace(/\s/g, '_') })
                }
                placeholder="مثلاً: SITE_ENGINEER"
                className="input-modern rounded-xl"
                dir="ltr"
                required
              />
              <p className="text-[10px] text-muted-foreground">فقط حروف انگلیسی بزرگ و آندرلاین</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">عنوان نمایشی (فارسی) *</Label>
              <Input
                value={createForm.label}
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                placeholder="مثلاً: مهندس سایت"
                className="input-modern rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">توضیحات</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="توضیح مختصر درباره نقش..."
                className="input-modern rounded-xl min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">رنگ نقش</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all hover:scale-110',
                      createForm.color === color
                        ? 'border-foreground scale-110 shadow-soft'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setCreateForm({ ...createForm, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="gradient-primary hover:opacity-90 rounded-xl shadow-soft"
              >
                {creating ? '...' : 'ایجاد نقش'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              ویرایش اطلاعات نقش
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditRole} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">کلید نقش</Label>
              <Input
                value={editForm.name}
                className="input-modern rounded-xl bg-muted/50"
                dir="ltr"
                disabled
              />
              <p className="text-[10px] text-muted-foreground">کلید نقش قابل تغییر نیست</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">عنوان نمایشی *</Label>
              <Input
                value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                className="input-modern rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">توضیحات</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="input-modern rounded-xl min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">رنگ نقش</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all hover:scale-110',
                      editForm.color === color
                        ? 'border-foreground scale-110 shadow-soft'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditForm({ ...editForm, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="rounded-xl"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                className="gradient-primary hover:opacity-90 rounded-xl shadow-soft"
              >
                به‌روزرسانی
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              تأیید حذف نقش
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              آیا از حذف نقش{' '}
              <span className="font-bold text-foreground">{deleteTarget?.label}</span>{' '}
              اطمینان دارید؟
              {deleteTarget && deleteTarget._count?.users ? (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 text-xs">
                  ⚠️ این نقش {toPersianDigits(deleteTarget._count.users)} کاربر دارد. با حذف نقش، کاربران فاقد نقش خواهند شد.
                </span>
              ) : null}
              <span className="block mt-1 text-xs">این عمل قابل بازگشت نیست.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? '...' : 'حذف نقش'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
