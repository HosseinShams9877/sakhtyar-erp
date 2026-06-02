'use client';

// ═══════════════════════════════════════════════════════════════════════
// ساخت‌یار — Project Switcher
// کامپوننت تعویض پروژه فعال در هدر
// ═══════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { FolderKanban, ChevronDown, Check, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/components/project-context';
import { toPersianDigits } from '@/lib/rbac';

export default function ProjectSwitcher() {
  const { projects, activeProject, activeRole, activeRoleLabel, setActiveProject } = useProject();
  const [open, setOpen] = useState(false);

  // اگر مدیر کل یا ادمین باشد، همه پروژه‌ها را می‌بیند
  const isGlobalRole = activeRole === 'SUPER_MANAGER' || activeRole === 'ADMIN';

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 text-muted-foreground text-xs" dir="rtl">
        <Building2 className="w-3.5 h-3.5" />
        <span>بدون پروژه</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'gap-2 h-9 rounded-xl px-3 text-xs font-medium hover:bg-muted transition-colors',
            'border border-border/40'
          )}
          dir="rtl"
        >
          <FolderKanban className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <div className="flex flex-col items-start min-w-0">
            <span className="text-[11px] font-bold truncate max-w-[120px]">
              {activeProject?.name || 'همه پروژه‌ها'}
            </span>
            <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
              {isGlobalRole && !activeProject ? 'نمای کلی سامانه' : activeRoleLabel}
            </span>
          </div>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0',
            open && 'rotate-180'
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2 rounded-xl border shadow-lg"
        align="start"
        dir="rtl"
      >
        <div className="px-2 py-1.5 mb-1">
          <p className="text-[10px] font-bold text-muted-foreground">
            {isGlobalRole ? 'همه پروژه‌ها' : 'پروژه‌های شما'}
          </p>
        </div>
        <div className="space-y-0.5 max-h-60 overflow-y-auto scrollbar-thin">
          {/* گزینه «همه پروژه‌ها» فقط برای نقش‌های سراسری */}
          {isGlobalRole && (
            <button
              onClick={() => {
                setActiveProject(null);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors',
                !activeProject
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'hover:bg-muted text-foreground'
              )}
              dir="rtl"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-purple-400" />
              <div className="flex-1 min-w-0 text-right">
                <p className="truncate font-medium">همه پروژه‌ها</p>
                <p className="text-[9px] text-muted-foreground">نمای کلی سامانه</p>
              </div>
              {!activeProject && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          )}
          {projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const statusColor = project.status === 'active'
              ? 'bg-emerald-400'
              : project.status === 'completed'
              ? 'bg-blue-400'
              : 'bg-amber-400';

            return (
              <button
                key={project.id}
                onClick={() => {
                  setActiveProject(project);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'hover:bg-muted text-foreground'
                )}
                dir="rtl"
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColor)} />
                <div className="flex-1 min-w-0 text-right">
                  <p className="truncate font-medium">{project.name}</p>
                  <p className="text-[9px] text-muted-foreground">{project.code}</p>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        {projects.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 px-2">
            <p className="text-[9px] text-muted-foreground text-center">
              {toPersianDigits(projects.length)} پروژه
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
