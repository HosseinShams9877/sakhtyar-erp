'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Database, Users, Shield, Server, RefreshCw, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, toPersianDigits, formatDate } from '@/lib/rbac';

export default function SettingsPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data) ? data : (data?.logs || []));
      }
    } catch {} finally { setLoadingLogs(false); }
  };

  useEffect(() => { loadAuditLogs(); }, []);

  const handleReseed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (res.ok) {
        toast.success('داده‌های نمونه بازنشانی شدند');
        loadAuditLogs();
      } else {
        toast.error(data.error || 'خطا');
      }
    } catch { toast.error('خطا'); } finally { setSeeding(false); }
  };

  const actionLabels: Record<string, string> = {
    CREATE: 'ایجاد',
    UPDATE: 'بروزرسانی',
    DELETE: 'حذف',
    LOGIN: 'ورود',
    LOGOUT: 'خروج',
    APPROVE: 'تایید',
  };

  const entityLabels: Record<string, string> = {
    User: 'کاربر',
    Material: 'مصالح',
    MaterialCategory: 'دسته‌بندی',
    Project: 'پروژه',
    Vendor: 'فروشنده',
    Invoice: 'فاکتور',
    Transaction: 'تراکنش',
    Notification: 'نوتیفیکیشن',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold">تنظیمات سیستم</h3>
        <p className="text-sm text-muted-foreground">مدیریت و پیکربندی سامانه</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* اطلاعات سیستم */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-bold">اطلاعات سیستم</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">نسخه</span><span className="font-medium">۱.۰.۰</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">فریمورک</span><span className="font-medium">نکست جی‌اس ۱۶</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">پایگاه داده</span><span className="font-medium">اس‌کیوال‌لایت (پریسما)</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">احراز هویت</span><span className="font-medium">نکست‌آوت ۴</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">رابط کاربری</span><span className="font-medium">شادکن + تیلویند</span></div>
          </CardContent>
        </Card>

        {/* نقش‌ها و دسترسی‌ها */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-bold">نقش‌ها و دسترسی‌ها</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[key] || key}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* عملیات سیستمی */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-bold">عملیات سیستمی</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="text-sm font-medium">بازنشانی داده‌های نمونه</p>
                <p className="text-[11px] text-muted-foreground">بازسازی داده‌های آزمایشی (دیتای فعلی حفظ می‌شود)</p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 rounded-xl" onClick={handleReseed} disabled={seeding}>
                <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
                {seeding ? 'در حال اجرا...' : 'بازنشانی'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* لاگ حسابرسی */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-bold">لاگ حسابرسی</CardTitle>
              </div>
              <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={loadAuditLogs}>
                <RefreshCw className="w-3.5 h-3.5 ml-1" />
                بروزرسانی
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              {loadingLogs ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">لاگی ثبت نشده</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <Badge variant="outline" className="text-[10px] min-w-[48px] justify-center">
                        {actionLabels[log.action] || 'نامشخص'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {entityLabels[log.entity] || 'نامشخص'}
                          {log.entityId && <span className="text-muted-foreground font-normal"> #{toPersianDigits(log.entityId.slice(-6))}</span>}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
