'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, Clock, Timer, Zap } from 'lucide-react';
import { toPersianDigits, formatCurrency, toPersianDate, formatDaysRemaining, daysUntilDue } from '@/lib/persian';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  level: string;
  message: string;
  purchaseId: string;
  invoiceNumber: string;
  projectName: string;
  supplierName: string;
  remainingAmount: number;
  dueDate: string;
}

interface BellData {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
}

const levelConfig: Record<string, { bg: string; text: string; dot: string; border: string; icon: React.ElementType }> = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
    border: 'border-red-200 dark:border-red-800',
    icon: Zap,
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
    border: 'border-orange-200 dark:border-orange-800',
    icon: Timer,
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    text: 'text-yellow-700 dark:text-yellow-400',
    dot: 'bg-yellow-500',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: Clock,
  },
};

export default function NotificationBell() {
  const [data, setData] = useState<BellData | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/bell-notifications');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {}
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const unread = data?.unreadCount || 0;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          open ? 'bg-muted' : 'hover:bg-muted/70'
        )}
        aria-label="نوتیفیکیشن‌ها"
      >
        <Bell className={cn('w-5 h-5', unread > 0 ? 'text-foreground' : 'text-muted-foreground')} />

        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-scale-in">
            {toPersianDigits(unread > 9 ? '۹+' : unread)}
          </span>
        )}

        {/* Animated ring when urgent */}
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </button>

      {/* Notification panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            'absolute top-full mt-2 z-50',
            // RTL: position to the left
            'left-0',
            'w-[340px] max-w-[calc(100vw-2rem)]'
          )}
        >
          <div className="bg-card rounded-xl border border-border shadow-soft-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">نوتیفیکیشن‌ها</span>
                {unread > 0 && (
                  <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">
                    {toPersianDigits(unread)} جدید
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {data && data.notifications.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {data.notifications.map((notif) => {
                    const config = levelConfig[notif.level] || levelConfig.yellow;
                    const Icon = config.icon;
                    const days = daysUntilDue(notif.dueDate);
                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer',
                          notif.level === 'red' && 'bg-red-50/50 dark:bg-red-950/10'
                        )}
                      >
                        {/* Icon */}
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
                          <Icon className={cn('w-4 h-4', config.text)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-xs font-medium', notif.level === 'red' ? 'text-red-700 dark:text-red-400' : 'text-foreground')}>
                              {notif.message}
                            </p>
                            <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1', config.dot)} />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                            <span className="truncate">{notif.projectName}</span>
                            <span>•</span>
                            <span className="truncate">{notif.supplierName}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={cn('text-[11px] font-medium', config.text)}>
                              {formatDaysRemaining(days)}
                            </span>
                            <span className="text-[11px] font-medium">
                              {formatCurrency(notif.remainingAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">هیچ هشداری وجود ندارد</p>
                  <p className="text-[11px] text-muted-foreground">همه فاکتورها وضعیت عادی دارند</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {data && data.notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
                <p className="text-[11px] text-muted-foreground">
                  {toPersianDigits(data.totalCount)} هشدار فعال
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
