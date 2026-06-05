'use client';

// ═══════════════════════════════════════════════════════════════════════
// ساخت‌یار — Project Context
// مدیریت وضعیت پروژه فعال و نقش کاربر در پروژه
// ═══════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';

interface ProjectInfo {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface ProjectRole {
  projectId: string;
  roleId: string;
  roleName: string;
  roleLabel: string;
}

interface ProjectContextValue {
  // پروژه‌های قابل دسترسی کاربر
  projects: ProjectInfo[];
  // پروژه فعال
  activeProject: ProjectInfo | null;
  // نقش کاربر در پروژه فعال
  activeRole: string; // کلید نقش: SUPER_MANAGER, PROJECT_MANAGER, PURCHASER, WAREHOUSE_KEEPER, ADMIN
  activeRoleLabel: string; // نام فارسی نقش
  // تغییر پروژه فعال
  setActiveProject: (project: ProjectInfo | null) => void;
  // بارگذاری در حال انجام
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  activeProject: null,
  activeRole: 'WAREHOUSE_KEEPER',
  activeRoleLabel: 'انباردار',
  setActiveProject: () => {},
  loading: true,
});

export function useProject() {
  return useContext(ProjectContext);
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [activeProject, setActiveProjectState] = useState<ProjectInfo | null>(null);
  const [activeRole, setActiveRole] = useState<string>('WAREHOUSE_KEEPER');
  const [activeRoleLabel, setActiveRoleLabel] = useState<string>('انباردار');
  const [loading, setLoading] = useState(true);

  const globalRole = (session?.user as any)?.role as string || 'WAREHOUSE_KEEPER';

  // بارگذاری پروژه‌های کاربر
  useEffect(() => {
    if (!session?.user) {
      setProjects([]);
      setActiveProjectState(null);
      setLoading(false);
      return;
    }

    async function loadUserProjects() {
      try {
        const res = await fetch('/api/user-projects');
        if (res.ok) {
          const data = await res.json();
          const projectList: ProjectInfo[] = data.projects || [];
          console.log('📋 Projects from API:', projectList.map(p => ({ id: p.id, name: p.name })));
          setProjects(projectList);

          // بازیابی پروژه فعال از کوکی
          const savedProjectId = document.cookie
            .split('; ')
            .find(row => row.startsWith('activeProjectId='))
            ?.split('=')[1];

          // بازیابی پروژه فعال از localStorage
          const savedLocalProject = localStorage.getItem('sakhtyar_activeProject');

          let activeProj: ProjectInfo | null = null;

          // اولویت ۱: پروژه ذخیره‌شده
          if (savedLocalProject) {
            try {
              const parsed = JSON.parse(savedLocalProject);
              activeProj = projectList.find(p => p.id === parsed.id) || null;
            } catch {}
          }

          // اولویت ۲: پروژه پیش‌فرض کاربر
          if (!activeProj && data.defaultProjectId) {
            activeProj = projectList.find(p => p.id === data.defaultProjectId) || null;
          }

          // اولویت ۳: اولین پروژه
          if (!activeProj && projectList.length > 0) {
            activeProj = projectList[0];
          }

          if (activeProj) {
            console.log('✅ Active project set to:', activeProj.name);
            setActiveProjectState(activeProj);
            // ذخیره در کوکی برای middleware
            document.cookie = `activeProjectId=${activeProj.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
            localStorage.setItem('sakhtyar_activeProject', JSON.stringify(activeProj));
          }
        }
      } catch (error) {
        console.error('خطا در بارگذاری پروژه‌ها:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserProjects();
  }, [session]);

  // تعیین نقش در پروژه فعال
  useEffect(() => {
    if (!activeProject || !session?.user) return;

    async function loadProjectRole() {
      try {
        const res = await fetch(`/api/user-projects?projectId=${activeProject!.id}`);
        if (res.ok) {
          const data = await res.json();
          // اگر نقش پروژه‌محور وجود دارد از آن استفاده کن
          if (data.projectRole) {
            setActiveRole(data.projectRole.roleName);
            setActiveRoleLabel(data.projectRole.roleLabel);
          } else {
            // وگرنه از نقش سراسری استفاده کن
            setActiveRole(globalRole);
            const ROLE_LABELS: Record<string, string> = {
              SUPER_MANAGER: 'مدیر کل پروژه‌ها',
              PROJECT_MANAGER: 'مدیر پروژه',
              PURCHASER: 'مسئول خرید',
              WAREHOUSE_KEEPER: 'انباردار',
              ADMIN: 'ادمین سیستم',
            };
            setActiveRoleLabel(ROLE_LABELS[globalRole] || 'کاربر');
          }
        }
      } catch {
        setActiveRole(globalRole);
      }
    }

    loadProjectRole();
  }, [activeProject, session, globalRole]);

  // تغییر پروژه فعال (null = همه پروژه‌ها)
  const setActiveProject = useCallback((project: ProjectInfo | null) => {
    setActiveProjectState(project);
    if (project) {
      // ذخیره در کوکی برای middleware
      document.cookie = `activeProjectId=${project.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
      // ذخیره در localStorage
      localStorage.setItem('sakhtyar_activeProject', JSON.stringify(project));
    } else {
      // حذف کوکی و localStorage وقتی «همه پروژه‌ها» انتخاب شود
      document.cookie = `activeProjectId=; path=/; max-age=0`;
      localStorage.removeItem('sakhtyar_activeProject');
    }
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeRole,
        activeRoleLabel,
        setActiveProject,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
