// ─── پنل نوتیفیکیشن ───
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bell, Check, AlertTriangle, Info, CheckCircle2, XCircle, X, Trash2 } from 'lucide-react';
import { formatDate, toPersianDigits } from '@/lib/rbac';
import { toast } from 'sonner';
import { useProject } from '@/components/project-context';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  projectId?: string | null;
  projectName?: string | null;
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
  const { activeProject } = useProject();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const projectQuery = activeProject?.id ? `?projectId=${activeProject.id}` : '';
        const res = await fetch(`/api/notifications${projectQuery}`);
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
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [activeProject?.id]);

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

  // ✅ حذف نوتیفیکیشن
  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        const deleted = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (deleted && !deleted.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        toast.success('نوتیفیکیشن حذف شد');
      } else {
        toast.error('خطا در حذف نوتیفیکیشن');
      }
    } catch {
      toast.error('خطا در حذف نوتیفیکیشن');
    }
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
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg">
              {toPersianDigits(unreadCount > 99 ? '۹۹+' : unreadCount)}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[380px] p-0 rounded-r-2xl" dir="rtl">
        <SheetTitle className="sr-only">نوتیفیکیشن‌ها</SheetTitle>
        <div className="flex flex-col h-full">
          {/* هدر */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 rounded-r-2xl border-b border-border/50">
            <div className="flex items-center justify-between p-4">
              <div className="flex-1">
                <h3 className="font-bold text-base">نوتیفیکیشن‌ها</h3>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {toPersianDigits(unreadCount)} نوتیفیکیشن خوانده‌نشده
                  </p>
                )}
                {activeProject && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    نمایش پروژه: {activeProject.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={markAllAsRead} 
                    className="text-xs gap-1.5 rounded-xl h-8"
                  >
                    <Check className="w-3.5 h-3.5" />
                    خواندن همه
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>

          {/* لیست */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ maxHeight: 'calc(100vh - 130px)', minHeight: '200px' }}
          >
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Bell className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">نوتیفیکیشنی وجود ندارد</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  با ایجاد فاکتورهای جدید، نوتیفیکیشن‌ها اینجا نمایش داده می‌شوند
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {notifications.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      className={`group p-4 transition-all duration-200 cursor-pointer hover:bg-muted/50 ${
                        !n.isRead ? config.bg : ''
                      } ${!n.isRead ? 'border-r-4 border-r-primary' : ''}`}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg} shadow-sm`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold truncate ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <p className="text-[10px] text-muted-foreground">{formatDate(n.createdAt)}</p>
                            {n.projectName && (
                              <>
                                <span className="text-[10px] text-muted-foreground">•</span>
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-md">
                                  {n.projectName}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        {/* ✅ دکمه حذف */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* فوتر */}
          {notifications.length > 0 && (
            <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-950 border-t border-border/50 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                {toPersianDigits(notifications.length)} نوتیفیکیشن • {toPersianDigits(unreadCount)} خوانده‌نشده
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}