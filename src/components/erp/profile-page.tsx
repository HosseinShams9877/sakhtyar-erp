'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  User, Mail, Phone, Shield, Calendar, Key, Save, Loader2,
  CheckCircle2, AlertCircle, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, ROLE_COLORS, formatDate } from '@/lib/rbac';
import type { Role } from '@/lib/rbac';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const { session, update: updateSession } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
      } else {
        if (session?.user) {
          const fallback: ProfileData = {
            id: (session.user as any).id || '',
            name: session.user.name || '',
            email: session.user.email || '',
            role: (session.user as any).role || 'WAREHOUSE_KEEPER',
            phone: null,
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          setProfile(fallback);
          setName(fallback.name);
          setEmail(fallback.email);
        }
      }
    } catch {
      if (session?.user) {
        const fallback: ProfileData = {
          id: (session.user as any).id || '',
          name: session.user.name || '',
          email: session.user.email || '',
          role: (session.user as any).role || 'WAREHOUSE_KEEPER',
          phone: null,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setProfile(fallback);
        setName(fallback.name);
        setEmail(fallback.email);
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!name.trim()) { toast.error('نام نمی‌تواند خالی باشد'); return; }
    if (!email.trim()) { toast.error('ایمیل نمی‌تواند خالی باشد'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        toast.success('اطلاعات پروفایل بروزرسانی شد');
        await updateSession();
      } else {
        const data = await res.json();
        toast.error(data.error || 'خطا در بروزرسانی');
      }
    } catch { toast.error('خطا در اتصال به سرور'); } finally { setSaving(false); }
  }

  async function changePassword() {
    if (!currentPassword) { toast.error('رمز عبور فعلی را وارد کنید'); return; }
    if (!newPassword) { toast.error('رمز عبور جدید را وارد کنید'); return; }
    if (newPassword.length < 6) { toast.error('رمز عبور جدید باید حداقل ۶ حرف باشد'); return; }
    if (newPassword !== confirmPassword) { toast.error('رمز عبور جدید و تکرار آن مطابقت ندارند'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success('رمز عبور با موفقیت تغییر کرد');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        toast.error(data.error || 'خطا در تغییر رمز عبور');
      }
    } catch { toast.error('خطا در اتصال به سرور'); } finally { setSaving(false); }
  }

  const role = profile?.role || (session?.user as any)?.role || 'WAREHOUSE_KEEPER';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری پروفایل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-extrabold">پروفایل کاربری</h2>
        <p className="text-sm text-muted-foreground mt-0.5">مدیریت اطلاعات شخصی و تنظیمات امنیتی حساب کاربری</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-soft lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 gradient-primary rounded-2xl flex items-center justify-center shadow-glow-primary mb-4">
                <span className="text-3xl font-bold text-white">
                  {(profile?.name || session?.user?.name || 'ک').charAt(0)}
                </span>
              </div>
              <h3 className="text-lg font-bold">{profile?.name || session?.user?.name || 'کاربر'}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{profile?.email || session?.user?.email}</p>
              <div className="mt-3">
                <span className={`text-xs font-medium px-3 py-1 rounded-lg inline-block ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <Separator className="my-4" />
              <div className="w-full space-y-3 text-right">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">نقش سیستمی:</span>
                  <span className="font-medium mr-auto">{ROLE_LABELS[role]}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">تاریخ عضویت:</span>
                  <span className="font-medium mr-auto">{profile?.createdAt ? formatDate(profile.createdAt) : '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${profile?.isActive !== false ? 'text-emerald-500' : 'text-red-500'}`} />
                  <span className="text-muted-foreground">وضعیت:</span>
                  <span className={`font-medium mr-auto ${profile?.isActive !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profile?.isActive !== false ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-5 h-5 text-violet-500" />
                اطلاعات شخصی
              </CardTitle>
              <CardDescription>نام، ایمیل و شماره تماس خود را بروزرسانی کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />نام و نام خانوادگی</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام خود را وارد کنید" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />ایمیل</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل (اختیاری)" dir="ltr" type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />شماره تماس</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۱۲۳۴۵۶۷" dir="ltr" />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                تغییر رمز عبور
              </CardTitle>
              <CardDescription>برای حفظ امنیت حساب، رمز عبور خود را مرتباً تغییر دهید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>رمز عبور فعلی</Label>
                <div className="relative">
                  <Input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="رمز عبور فعلی خود را وارد کنید" dir="ltr" className="pl-10" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رمز عبور جدید</Label>
                  <div className="relative">
                    <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="حداقل ۶ حرف" dir="ltr" className="pl-10" />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>تکرار رمز عبور جدید</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="رمز عبور جدید را مجدداً وارد کنید" dir="ltr" />
                </div>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>رمز عبور جدید و تکرار آن مطابقت ندارند</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={changePassword} disabled={saving} variant="outline" className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {saving ? 'در حال تغییر...' : 'تغییر رمز عبور'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
