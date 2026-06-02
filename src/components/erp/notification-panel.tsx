// ─── پنل نوتیفیکیشن ───
// نمایش نوتیفیکیشن‌ها با badge شمارنده

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bell, Check, AlertTriangle, Info, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { formatDate, toPersianDigits } from '@/lib/rbac';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  error: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50' },
  success: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
};

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // سکوت در صورت خطا
      }
    }
    load();
    // بررسی هر ۶۰ ثانیه
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('همه نوتیفیکیشن‌ها خوانده شد');
      }
    } catch {}
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-xl hover:bg-muted transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] gradient-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {toPersianDigits(unreadCount > 99 ? '۹۹+' : unreadCount)}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[360px] p-0" dir="rtl">
        <SheetTitle className="sr-only">نوتیفیکیشن‌ها</SheetTitle>
        <div className="flex flex-col h-full">
          {/* هدر */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div>
              <h3 className="font-bold text-sm">نوتیفیکیشن‌ها</h3>
              {unreadCount > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {toPersianDigits(unreadCount)} نوتیفیکیشن خوانده‌نشده
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs gap-1.5 rounded-lg">
                <Check className="w-3.5 h-3.5" />
                خواندن همه
              </Button>
            )}
          </div>

          {/* لیست */}
          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Bell className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">نوتیفیکیشنی وجود ندارد</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {notifications.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      className={`p-4 transition-colors cursor-pointer hover:bg-muted/50 ${!n.isRead ? config.bg : ''}`}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold truncate ${!n.isRead ? '' : 'text-muted-foreground'}`}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full gradient-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">{formatDate(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
