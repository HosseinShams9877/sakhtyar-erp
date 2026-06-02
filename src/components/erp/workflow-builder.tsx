'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  GripVertical, Plus, Trash2, Save, RefreshCw, ArrowDown,
  Workflow, Shield, FolderKanban, ShoppingBag, Warehouse,
  CheckCircle2, XCircle, ArrowRight, ChevronDown, Settings2,
  Play, Pencil, Eye, Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, toPersianDigits } from '@/lib/rbac';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface WorkflowStep {
  id?: string;
  stepOrder: number;
  stepName: string;
  requiredRole: string;
  isRequired: boolean;
}

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
}

interface WorkflowConfigWithProject extends WorkflowStep {
  project?: { id: string; name: string };
  projectId?: string;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const ROLE_OPTIONS = [
  { value: 'SUPER_MANAGER', label: 'مدیر کل', icon: Crown, color: 'bg-purple-500' },
  { value: 'PROJECT_MANAGER', label: 'مدیر پروژه', icon: FolderKanban, color: 'bg-blue-500' },
  { value: 'PURCHASER', label: 'مسئول خرید', icon: ShoppingBag, color: 'bg-amber-500' },
  { value: 'WAREHOUSE_KEEPER', label: 'انباردار', icon: Warehouse, color: 'bg-emerald-500' },
  { value: 'ADMIN', label: 'ادمین سیستم', icon: Shield, color: 'bg-red-500' },
];

const STEP_TEMPLATES = [
  { stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
  { stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
  { stepName: 'تایید انباردار', requiredRole: 'WAREHOUSE_KEEPER', isRequired: false },
  { stepName: 'بررسی خرید', requiredRole: 'PURCHASER', isRequired: false },
  { stepName: 'تایید نهایی', requiredRole: 'SUPER_MANAGER', isRequired: true },
];

const WORKFLOW_PRESETS = [
  {
    name: 'ساده — یک مرحله‌ای',
    description: 'فقط تایید مدیر پروژه',
    steps: [
      { stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
    ],
  },
  {
    name: 'استاندارد — دو مرحله‌ای',
    description: 'تایید مدیر پروژه + تایید مالی',
    steps: [
      { stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
      { stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
    ],
  },
  {
    name: 'کامل — سه مرحله‌ای',
    description: 'تایید مدیر + مالی + انباردار',
    steps: [
      { stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
      { stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      { stepName: 'تایید انباردار', requiredRole: 'WAREHOUSE_KEEPER', isRequired: true },
    ],
  },
  {
    name: 'سخت‌گیرانه — چهار مرحله‌ای',
    description: 'بررسی خرید + مدیر + مالی + انباردار',
    steps: [
      { stepName: 'بررسی خرید', requiredRole: 'PURCHASER', isRequired: true },
      { stepName: 'تایید مدیر پروژه', requiredRole: 'PROJECT_MANAGER', isRequired: true },
      { stepName: 'تایید مالی', requiredRole: 'SUPER_MANAGER', isRequired: true },
      { stepName: 'تایید انباردار', requiredRole: 'WAREHOUSE_KEEPER', isRequired: true },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function WorkflowBuilder() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [allConfigs, setAllConfigs] = useState<WorkflowConfigWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [newStep, setNewStep] = useState({
    stepName: '',
    requiredRole: 'PROJECT_MANAGER',
    isRequired: true,
  });

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || data || []);
          if (data.projects?.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data.projects[0].id);
          }
        }
      } catch {
        // ignore
      }
    }
    loadProjects();
  }, []);

  // Load workflow configs
  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workflow');
      if (res.ok) {
        const data = await res.json();
        setAllConfigs(data.configs || []);
      }
    } catch {
      toast.error('خطا در بارگذاری ورک‌فلوها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Load steps for selected project
  useEffect(() => {
    if (selectedProjectId) {
      const projectSteps = allConfigs
        .filter((c) => c.projectId === selectedProjectId)
        .sort((a, b) => a.stepOrder - b.stepOrder);
      setSteps(projectSteps);
    } else {
      setSteps([]);
    }
  }, [selectedProjectId, allConfigs]);

  // Save workflow
  const handleSave = async () => {
    if (!selectedProjectId) {
      toast.error('لطفاً یک پروژه انتخاب کنید');
      return;
    }
    if (steps.length === 0) {
      toast.error('حداقل یک مرحله باید تعریف شود');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/workflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          steps: steps.map((s, idx) => ({
            stepName: s.stepName,
            requiredRole: s.requiredRole,
            isRequired: s.isRequired,
          })),
        }),
      });
      if (res.ok) {
        toast.success('ورک‌فلو با موفقیت ذخیره شد');
        loadConfigs();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ذخیره ورک‌فلو');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  // Add step
  const handleAddStep = () => {
    if (!newStep.stepName) {
      toast.error('نام مرحله الزامی است');
      return;
    }
    setSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        stepName: newStep.stepName,
        requiredRole: newStep.requiredRole,
        isRequired: newStep.isRequired,
      },
    ]);
    setNewStep({ stepName: '', requiredRole: 'PROJECT_MANAGER', isRequired: true });
    setAddOpen(false);
    toast.success('مرحله جدید اضافه شد');
  };

  // Apply preset
  const handleApplyPreset = (preset: typeof WORKFLOW_PRESETS[number]) => {
    setSteps(preset.steps.map((s, idx) => ({ ...s, stepOrder: idx + 1 })));
    setPresetOpen(false);
    toast.success(`الگوی «${preset.name}» اعمال شد`);
  };

  // Remove step
  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  // Move step
  const moveStep = (index: number, direction: 'up' | 'down') => {
    setSteps((prev) => {
      const arr = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
      return arr.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    });
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold">سازنده ورک‌فلو</h3>
            <p className="text-sm text-muted-foreground">
              تعیین مراحل تایید فاکتور برای هر پروژه
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={loadConfigs}
            disabled={loading}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            بروزرسانی
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => setPresetOpen(true)}
          >
            <Settings2 className="w-3.5 h-3.5" />
            الگوهای آماده
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <Label className="text-xs font-bold mb-1.5 block">انتخاب پروژه</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="پروژه‌ای انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span>{p.name}</span>
                        <span className="text-muted-foreground text-xs">— {p.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProject && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs px-3 py-1.5',
                  selectedProject.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                )}
              >
                {selectedProject.status === 'active' ? 'فعال' : 'متوقف'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      {selectedProjectId ? (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">مراحل تایید فاکتور</CardTitle>
                <CardDescription className="text-[11px] mt-1">
                  ترتیب مراحلی که فاکتور باید طی کند تا ثبت نهایی شود
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-xl text-xs"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  مرحله جدید
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white shadow-lg text-xs"
                  onClick={handleSave}
                  disabled={saving || steps.length === 0}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? '...' : 'ذخیره ورک‌فلو'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Workflow className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm font-bold mb-1">ورک‌فلو تعریف نشده</p>
                <p className="text-xs mb-4">یک الگوی آماده انتخاب کنید یا مرحله به مرحله بسازید</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs"
                    onClick={() => setPresetOpen(true)}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    الگوهای آماده
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    مرحله جدید
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const roleInfo = ROLE_OPTIONS.find((r) => r.value === step.requiredRole);
                  const RoleIcon = roleInfo?.icon || Shield;
                  return (
                    <React.Fragment key={index}>
                      <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md transition-all group">
                        {/* Order indicator */}
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-opacity"
                          >
                            <ChevronDown className="w-3 h-3 rotate-180" />
                          </button>
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-white">
                              {toPersianDigits(index + 1)}
                            </span>
                          </div>
                          <button
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === steps.length - 1}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-opacity"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Step info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold">{step.stepName}</span>
                            {step.isRequired ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[9px] px-1.5 py-0">
                                الزامی
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-[9px] px-1.5 py-0">
                                اختیاری
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', roleInfo?.color || 'bg-gray-500')}>
                              <RoleIcon className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {roleInfo?.label || step.requiredRole}
                            </span>
                          </div>
                        </div>

                        {/* Required toggle */}
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-muted-foreground">الزامی</Label>
                          <Switch
                            checked={step.isRequired}
                            onCheckedChange={(checked) => {
                              setSteps((prev) =>
                                prev.map((s, i) => (i === index ? { ...s, isRequired: checked } : s))
                              );
                            }}
                          />
                        </div>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                      {/* Arrow between steps */}
                      {index < steps.length - 1 && (
                        <div className="flex justify-center">
                          <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Flow visualization */}
            {steps.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-dashed">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">نمای جریان تایید</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap" dir="ltr">
                  <div className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[11px] font-bold">
                    ثبت فاکتور
                  </div>
                  {steps.map((step, idx) => {
                    const roleInfo = ROLE_OPTIONS.find((r) => r.value === step.requiredRole);
                    return (
                      <React.Fragment key={idx}>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                        <div
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5',
                            step.isRequired
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {roleInfo?.label}
                          {step.isRequired && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                    ثبت نهایی
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm font-bold text-muted-foreground">پروژه‌ای انتخاب نشده</p>
            <p className="text-xs text-muted-foreground mt-1">ابتدا یک پروژه انتخاب کنید تا ورک‌فلو آن را مدیریت کنید</p>
          </CardContent>
        </Card>
      )}

      {/* All Projects Workflow Overview */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-bold">نمای کلی ورک‌فلوها</CardTitle>
          </div>
          <CardDescription className="text-[11px]">مراحل تایید تعریف‌شده برای هر پروژه</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              هیچ پروژه‌ای تعریف نشده است
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const projectSteps = allConfigs.filter((c) => c.projectId === project.id);
                return (
                  <div
                    key={project.id}
                    className={cn(
                      'p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md',
                      selectedProjectId === project.id ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'
                    )}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold">{project.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {toPersianDigits(projectSteps.length)} مرحله
                      </Badge>
                    </div>
                    {projectSteps.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap" dir="ltr">
                        {projectSteps.sort((a, b) => a.stepOrder - b.stepOrder).map((step, idx) => {
                          const roleInfo = ROLE_OPTIONS.find((r) => r.value === step.requiredRole);
                          return (
                            <React.Fragment key={idx}>
                              {idx > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                            <div className={cn(
                              'px-2 py-0.5 rounded text-[9px] font-bold',
                              roleInfo?.color || 'bg-gray-500',
                              'text-white'
                            )}>
                              {roleInfo?.label || step.requiredRole}
                            </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">ورک‌فلو تعریف نشده</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Step Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">افزودن مرحله جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold mb-1.5 block">نام مرحله</Label>
              <Input
                value={newStep.stepName}
                onChange={(e) => setNewStep((p) => ({ ...p, stepName: e.target.value }))}
                placeholder="مثلاً: تایید مدیر پروژه"
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block">نقش تاییدکننده</Label>
              <Select
                value={newStep.requiredRole}
                onValueChange={(val) => setNewStep((p) => ({ ...p, requiredRole: val }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className="w-3.5 h-3.5" />
                        <span>{role.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold mb-2 block">انتخاب سریع</Label>
              <div className="flex flex-wrap gap-1.5">
                {STEP_TEMPLATES.map((template) => (
                  <button
                    key={template.stepName}
                    className="px-2.5 py-1 rounded-lg bg-muted/50 text-[11px] hover:bg-muted transition-colors"
                    onClick={() => setNewStep((p) => ({ ...p, stepName: template.stepName, requiredRole: template.requiredRole }))}
                  >
                    {template.stepName}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newStep.isRequired}
                onCheckedChange={(checked) => setNewStep((p) => ({ ...p, isRequired: checked }))}
              />
              <Label className="text-xs">این مرحله الزامی است</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
              انصراف
            </Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              onClick={handleAddStep}
            >
              افزودن مرحله
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preset Dialog */}
      <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">الگوهای آماده ورک‌فلو</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {WORKFLOW_PRESETS.map((preset) => (
              <button
                key={preset.name}
                className="w-full text-right p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => handleApplyPreset(preset)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{preset.name}</span>
                  <Badge variant="secondary" className="text-[9px]">
                    {toPersianDigits(preset.steps.length)} مرحله
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">{preset.description}</p>
                <div className="flex items-center gap-1.5 flex-wrap" dir="ltr">
                  {preset.steps.map((step, idx) => {
                    const roleInfo = ROLE_OPTIONS.find((r) => r.value === step.requiredRole);
                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                        <div className={cn(
                          'px-2 py-0.5 rounded text-[9px] font-bold',
                          roleInfo?.color || 'bg-gray-500',
                          'text-white'
                        )}>
                          {step.stepName}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
