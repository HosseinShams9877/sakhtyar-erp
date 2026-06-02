'use client';

import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useProject } from '@/components/project-context';
import { ROLE_THEME, ROLE_LABELS, toPersianDigits } from '@/lib/rbac';
import { motion, AnimatePresence } from 'framer-motion';
import { DesktopSidebar, SidebarContent } from '@/components/sakhtyar/sidebar';
import Header from '@/components/sakhtyar/header';
import BottomNav from '@/components/sakhtyar/bottom-nav';
import QuickAccess from '@/components/sakhtyar/quick-access';
import { PageLoader } from '@/components/sakhtyar/page-loader';
import { useIsMobile } from '@/hooks/use-mobile';

// ═══════════════════════════════════════════════════════════
// Lazy-loaded page components
// ═══════════════════════════════════════════════════════════
const SuperManagerDashboard = lazy(() => import('@/components/erp/role-dashboards').then(m => ({ default: m.SuperManagerDashboard })));
const ProjectManagerDashboard = lazy(() => import('@/components/erp/role-dashboards').then(m => ({ default: m.ProjectManagerDashboard })));
const PurchaserDashboard = lazy(() => import('@/components/erp/role-dashboards').then(m => ({ default: m.PurchaserDashboard })));
const PermissionsPage = lazy(() => import('@/components/erp/permissions-page'));
const WorkflowBuilder = lazy(() => import('@/components/erp/workflow-builder'));
const DynamicSettingsComponent = lazy(() => import('@/components/erp/dynamic-settings'));
const DueDatesComponent = lazy(() => import('@/components/erp/due-dates'));
const VendorsPage = lazy(() => import('@/components/erp/vendors-page'));
const WarehousePage = lazy(() => import('@/components/erp/warehouse-page'));
const InvoiceForm = lazy(() => import('@/components/erp/invoice-form'));
const UsersPage = lazy(() => import('@/components/erp/users-page'));
const ReportsPage = lazy(() => import('@/components/erp/reports-page'));
const ProjectsPage = lazy(() => import('@/components/erp/projects-page'));
const MaterialsPage = lazy(() => import('@/components/erp/materials-page'));
const TransactionsPage = lazy(() => import('@/components/erp/transactions-page'));

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type PageKey = 'dashboard' | 'projects' | 'invoices' | 'dues' | 'vendors' | 'warehouse' | 'reports' | 'users' | 'permissions' | 'workflow' | 'settings' | 'materials';

// ═══════════════════════════════════════════════════════════
// Animation Variants
// ═══════════════════════════════════════════════════════════

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ═══════════════════════════════════════════════════════════
// انباردار و ادمین داشبورد (محلی)
// ═══════════════════════════════════════════════════════════

import {
  Warehouse as WarehouseIcon,
  Shield,
  CheckCircle2,
  FileText,
  Eye,
  Truck,
  Users,
  Settings,
  Zap,
  Home,
  ScanBarcode,
  Package,
  AlertTriangle,
  ShoppingBag,
  CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function WarehouseKeeperDashboard() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/deliveries').then(r => r.ok ? r.json() : []).then(d => {
      setDeliveries(Array.isArray(d?.deliveries) ? d.deliveries : Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => { setDeliveries([]); setLoading(false); });
  }, []);

  return (
    <motion.div
      className="space-y-5"
      dir="rtl"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <WarehouseIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">داشبورد انباردار</h2>
        </div>
        <p className="text-sm text-muted-foreground">تحویل مصالح و تایید ورود به انبار</p>
      </div>

      <QuickAccess role="WAREHOUSE_KEEPER" onNavigate={() => {}} />

      {/* تحویل‌های امروز */}
      <Card className="border-0 neu-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold">تحویل‌های امروز</h4>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="text-sm">تحویلی برای امروز ثبت نشده</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {deliveries.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{d.notes || 'تحویل مصالح'}</p>
                    <p className="text-[11px] text-muted-foreground">{d.confirmedBy || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AdminDashboard() {
  return (
    <motion.div
      className="space-y-5"
      dir="rtl"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">داشبورد ادمین</h2>
        </div>
        <p className="text-sm text-muted-foreground">مدیریت سیستم، کاربران و تنظیمات</p>
      </div>

      <QuickAccess role="ADMIN" />

      {/* وضعیت سیستم */}
      <Card className="border-0 neu-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold">وضعیت سیستم</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'پایگاه داده', status: 'فعال', ok: true },
              { label: 'سرور', status: 'آنلاین', ok: true },
              { label: 'بکاپ', status: 'آخرین: امروز', ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
                <motion.div
                  className={cn('w-2 h-2 rounded-full', item.ok ? 'bg-emerald-500' : 'bg-red-500')}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <div>
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// ناوبری افقی دسکتاپ برای نقش‌های موبایل‌محور
// ═══════════════════════════════════════════════════════════

interface HorizontalNavItem {
  key: PageKey;
  label: string;
  icon: React.ElementType;
}

const PURCHASER_HNAV: HorizontalNavItem[] = [
  { key: 'dashboard', label: 'خانه', icon: Home },
  { key: 'invoices', label: 'ثبت فاکتور', icon: FileText },
  { key: 'vendors', label: 'تامین‌کنندگان', icon: Truck },
  { key: 'dues', label: 'سررسیدها', icon: CalendarClock },
];

const WAREHOUSE_HNAV: HorizontalNavItem[] = [
  { key: 'warehouse', label: 'اسکن/تحویل', icon: ScanBarcode },
  { key: 'materials', label: 'موجودی انبار', icon: Package },
  { key: 'dashboard', label: 'مغایرت‌ها', icon: AlertTriangle },
];

function HorizontalNav({ role, currentPage, onPageChange }: {
  role: string; currentPage: PageKey; onPageChange: (page: PageKey) => void;
}) {
  const items = role === 'PURCHASER' ? PURCHASER_HNAV : WAREHOUSE_HNAV;
  const roleColor = role === 'PURCHASER' ? 'amber' : 'emerald';

  return (
    <div className="hidden lg:block border-b border-border/50 bg-card/50 backdrop-blur-sm px-4" dir="rtl">
      <div className="max-w-[1400px] mx-auto flex items-center gap-1 py-1.5">
        {items.map((item) => {
          const isActive = currentPage === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onPageChange(item.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? cn(
                      'text-white shadow-soft',
                      roleColor === 'amber'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                    )
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// رندر صفحه بر اساس کلید و نقش
// ═══════════════════════════════════════════════════════════

function renderPage(key: PageKey, role: string) {
  // انباردار نباید هیچ داده مالی ببیند
  const isWarehouseRole = role === 'WAREHOUSE_KEEPER';

  switch (key) {
    case 'dashboard':
      switch (role) {
        case 'SUPER_MANAGER':
          return <SuperManagerDashboard />;
        case 'PROJECT_MANAGER':
          return <ProjectManagerDashboard />;
        case 'PURCHASER':
          return <PurchaserDashboard />;
        case 'WAREHOUSE_KEEPER':
          return <WarehouseKeeperDashboard />;
        case 'ADMIN':
          return <AdminDashboard />;
        default:
          return <WarehouseKeeperDashboard />;
      }

    case 'projects':
      return <ProjectsPage />;

    case 'invoices':
      return isWarehouseRole ? <WarehousePage /> : <InvoiceForm />;

    case 'dues':
      return <DueDatesComponent />;

    case 'vendors':
      return <VendorsPage />;

    case 'warehouse':
      return <WarehousePage />;

    case 'materials':
      return isWarehouseRole ? <MaterialsPage /> : <MaterialsPage />;

    case 'reports':
      return isWarehouseRole ? <WarehouseKeeperDashboard /> : <ReportsPage />;

    case 'users':
      return <UsersPage />;

    case 'permissions':
      return <PermissionsPage />;

    case 'workflow':
      return <WorkflowBuilder />;

    case 'settings':
      return <DynamicSettingsComponent />;

    default:
      return <PageLoader />;
  }
}

// ═══════════════════════════════════════════════════════════
// شل اصلی
// ═══════════════════════════════════════════════════════════

export default function AppShell() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const { session } = useAuth();
  const { activeRole, activeProject } = useProject();
  const isMobile = useIsMobile();

  const globalRole = session?.user?.role || 'WAREHOUSE_KEEPER';
  const role = globalRole|| activeRole ;
  const roleTheme = ROLE_THEME[role] || ROLE_THEME.SUPER_MANAGER;

  console.log('🔍 نقش کاربر:', role);
  console.log('🔍 session.user:', session?.user);

  // نقش‌های موبایل‌محور
  const isMobileFirstRole = role === 'PURCHASER' || role === 'WAREHOUSE_KEEPER';

  // هندل ناوبری از Quick Access
  const handleQuickAccessNavigate = useCallback((key: string) => {
    setActivePage(key as PageKey);
  }, []);

  // هندل تغییر صفحه
  const handlePageChange = useCallback((page: PageKey) => {
    setActivePage(page);
  }, []);

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* ─── سایدبار دسکتاپ ─── */}
      {!isMobileFirstRole && (
        <DesktopSidebar
          currentPage={activePage}
          onPageChange={handlePageChange}
          collapsed={false}
          onToggleCollapse={() => {}}
        />
      )}
  
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* ─── هدر بالا ─── */}
        <Header
          currentPage={activePage}
          onPageChange={handlePageChange}
          showSidebar={!isMobileFirstRole}
          sidebarGradient={roleTheme.sidebar}
        />
  
        {/* ─── ناوبری افقی دسکتاپ ─── */}
        {isMobileFirstRole && (
          <HorizontalNav
            role={role}
            currentPage={activePage}
            onPageChange={handlePageChange}
          />
        )}
  
        {/* ─── دسترسی سریع ─── */}
        {activePage === 'dashboard' && !isMobileFirstRole && (
          <div className="px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="max-w-[1400px] mx-auto">
              <div className="flex items-center gap-2 mb-3" dir="rtl">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">دسترسی سریع</h3>
              </div>
              <QuickAccess role={role} onNavigate={handleQuickAccessNavigate} />
            </div>
          </div>
        )}
  
        {/* ─── بدنه اصلی ─── */}
        <main className={cn(
          'flex-1 overflow-auto',
          isMobileFirstRole ? 'px-2 sm:px-3 lg:px-4 py-2' : 'p-4 sm:p-6'
        )}>
          <div className="max-w-[1400px] w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Suspense fallback={<PageLoader />}>
                  {renderPage(activePage, role)}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
  
        {/* ─── ناوبری پایین موبایل ─── اینجا داخل همون div باشه */}
        <BottomNav
          role={role}
          activePage={activePage}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
