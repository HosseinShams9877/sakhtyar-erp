'use client';

import { useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Building2,
  Truck,
  Store,
  FileText,
  Moon,
  Sun,
  Menu,
  X,
  HardHat,
  Bell,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Dashboard from '@/components/dashboard';
import PurchasesPage from '@/components/purchases-page';
import SuppliersPage from '@/components/suppliers-page';
import ProjectsPage from '@/components/projects-page';
import DeliveryPage from '@/components/delivery-page';
import ReportsPage from '@/components/reports-page';
import NotificationBell from '@/components/notification-bell';

type Page = 'dashboard' | 'purchases' | 'suppliers' | 'projects' | 'delivery' | 'reports';

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'purchases', label: 'خریدها', icon: ShoppingCart },
  { id: 'suppliers', label: 'تامین‌کنندگان', icon: Store },
  { id: 'projects', label: 'پروژه‌ها', icon: Building2 },
  { id: 'delivery', label: 'تحویل مصالح', icon: Truck },
  { id: 'reports', label: 'گزارش‌ها', icon: FileText },
];

// Mobile bottom nav items (subset for quick access)
const mobileBottomNavItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'purchases', label: 'خریدها', icon: ShoppingCart },
  { id: 'projects', label: 'پروژه‌ها', icon: Building2 },
  { id: 'suppliers', label: 'تامین‌کنندگان', icon: Store },
  { id: 'reports', label: 'گزارش‌ها', icon: FileText },
];

export default function AppShell() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleNav = useCallback((page: Page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={handleNav} />;
      case 'purchases': return <PurchasesPage />;
      case 'suppliers': return <SuppliersPage />;
      case 'projects': return <ProjectsPage />;
      case 'delivery': return <DeliveryPage />;
      case 'reports': return <ReportsPage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ─── Mobile overlay ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[260px] bg-card border-l border-border transition-transform duration-300 ease-out',
          // On desktop: static, always visible
          'lg:static lg:z-auto lg:translate-x-0',
          // On mobile: slide in from right
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">ساخت‌یار</h1>
              <p className="text-[9px] text-muted-foreground leading-tight">مدیریت بدهی و سررسید</p>
            </div>
            <button
              className="mr-auto lg:hidden p-1 hover:bg-muted rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2">
            <nav className="px-2.5 space-y-0.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200',
                    activePage === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <item.icon className={cn(
                    'w-[17px] h-[17px] shrink-0',
                    activePage === item.id ? 'text-primary' : ''
                  )} />
                  {item.label}
                </button>
              ))}
            </nav>
          </ScrollArea>

          {/* Bottom area */}
          <div className="p-2.5 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground text-xs h-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
            </Button>
          </div>
        </div>
      </aside>

    {/* ─── Main content ─── */}
<main className="flex-1 min-h-screen flex flex-col pb-16 lg:pb-0">
  {/* ─── Desktop Top Bar ─── */}
  <header className="hidden lg:flex items-center justify-between h-14 px-6 border-b border-border bg-card sticky top-0 z-30 shrink-0 w-full">
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px] md:max-w-[300px]">
        {navItems.find(n => n.id === activePage)?.label || 'داشبورد'}
      </h2>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <NotificationBell />
      <button
        className="p-2 rounded-lg hover:bg-muted/70 transition-colors"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  </header>

  {/* ─── Mobile Top Bar ─── */}
  <header className="lg:hidden h-12 flex items-center gap-2 px-3 border-b border-border bg-card sticky top-0 z-30 w-full">
    <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0">
      <Menu className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
  <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center flex-shrink-0">
    <HardHat className="w-3.5 h-3.5 text-white" />
  </div>
  <div className="overflow-hidden whitespace-nowrap max-w-[120px]">
    <span className="font-bold text-sm animate-marquee inline-block">
      ساخت‌یار
    </span>
  </div>
</div>
    <div className="flex items-center gap-1 flex-shrink-0">
      <NotificationBell />
      <button
        className="p-1.5 hover:bg-muted rounded-lg"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  </header>

  {/* Page content */}
  <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 w-full overflow-x-auto">
    <div className="max-w-[1400px] mx-auto">
      {renderPage()}
    </div>
  </div>
</main>

      {/* ─── Mobile Bottom Navigation Bar ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card border-t border-border mobile-bottom-nav">
        <div className="flex items-center justify-around h-14">
          {mobileBottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                activePage === item.id
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn(
                'w-[18px] h-[18px]',
                activePage === item.id ? 'text-primary' : ''
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
