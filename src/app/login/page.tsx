'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardHat,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Smartphone,
  Zap,
  Building2,
  Warehouse,
  Crown,
  Shield,
  ShoppingBag,
  BarChart3,
  Truck,
  Users,
  FolderKanban,
  CreditCard,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTheme } from 'next-themes';

export const dynamic = 'force-dynamic';
const testAccounts = [
  { nationalCode: '1234567890', mobile: '09121234567', label: 'مدیر کل', role: 'مدیر کل', icon: Crown, color: 'from-purple-500 to-indigo-600' },
  { nationalCode: '1234567891', mobile: '09122345678', label: 'مدیر پروژه', role: 'مدیر پروژه', icon: FolderKanban, color: 'from-blue-500 to-cyan-600' },
  { nationalCode: '1234567892', mobile: '09123456789', label: 'مسئول خرید', role: 'مسئول خرید', icon: ShoppingBag, color: 'from-amber-500 to-orange-600' },
  { nationalCode: '1234567893', mobile: '09124567890', label: 'انباردار', role: 'انباردار', icon: Warehouse, color: 'from-emerald-500 to-teal-600' },
  { nationalCode: '1234567894', mobile: '09125678901', label: 'ادمین سیستم', role: 'ادمین سیستم', icon: Shield, color: 'from-red-500 to-rose-600' },
];

// ─── Animation Variants ────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const errorVariants = {
  hidden: { opacity: 0, y: -12, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -12,
    height: 0,
    transition: { duration: 0.25, ease: 'easeIn' as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

// ─── 3D Isometric Illustration ─────────────────────────────────
function ConstructionIllustration() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Floating geometric shapes */}
      <motion.div
        className="absolute top-[15%] right-[15%] w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
        animate={{ y: [0, -12, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[25%] left-[20%] w-16 h-16 rounded-xl bg-white/8 border border-white/15"
        animate={{ y: [0, 8, 0], rotate: [0, -2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute bottom-[30%] right-[25%] w-20 h-20 rounded-2xl bg-white/6 border border-white/10"
        animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[15%] w-14 h-14 rounded-lg bg-white/8 border border-white/15"
        animate={{ y: [0, 6, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Main isometric building */}
      <div className="relative" style={{ perspective: '800px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative"
        >
          {/* Building base */}
          <div className="relative w-48 h-56 mx-auto" style={{ transform: 'rotateX(15deg) rotateY(-15deg)' }}>
            {/* Main building */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-400/40 to-blue-600/60 rounded-2xl border border-white/30 backdrop-blur-sm" />
            {/* Windows */}
            <div className="absolute top-6 left-4 right-4 grid grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-6 h-8 rounded-sm bg-amber-300/60 border border-white/20"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                />
              ))}
            </div>
            {/* Roof */}
            <div className="absolute -top-4 left-2 right-2 h-8 bg-gradient-to-r from-blue-500/50 to-indigo-500/50 rounded-t-2xl border border-white/20" />
            {/* Crane */}
            <motion.div
              className="absolute -top-16 -right-4"
              animate={{ rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-2 h-16 bg-amber-400/70 rounded-full" />
              <div className="absolute top-0 left-0 w-20 h-1.5 bg-amber-400/70 rounded-full" />
              <div className="absolute top-0 right-0 w-1 h-8 bg-amber-400/50" />
            </motion.div>
          </div>

          {/* Ground shadow */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-64 h-8 bg-black/20 rounded-[50%] blur-md" />
        </motion.div>
      </div>

      {/* Feature icons floating around */}
      <motion.div
        className="absolute top-[12%] left-[10%] w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CreditCard className="w-5 h-5 text-amber-300" />
      </motion.div>
      <motion.div
        className="absolute top-[10%] right-[8%] w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <BarChart3 className="w-5 h-5 text-blue-300" />
      </motion.div>
      <motion.div
        className="absolute bottom-[15%] left-[8%] w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <Truck className="w-5 h-5 text-emerald-300" />
      </motion.div>
      <motion.div
        className="absolute bottom-[12%] right-[10%] w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <Package className="w-5 h-5 text-purple-300" />
      </motion.div>
    </div>
  );
}

// ─── Theme Toggle Component ────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed top-4 left-4 z-50 size-10 rounded-xl bg-muted/50 backdrop-blur-sm" />
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.3 }}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed top-4 left-4 z-50 size-10 rounded-xl bg-background/60 backdrop-blur-md border border-border/50 flex items-center justify-center hover:bg-accent/50 transition-colors shadow-soft-sm cursor-pointer"
      aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
    >
      <AnimatePresence mode="wait">
        {theme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="size-4.5 text-amber-500" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="size-4.5 text-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Main Login Page — Split Screen ────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [nationalCode, setNationalCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  const { update: updateSession } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
//
    try {
      const result = await signIn('credentials', {
        nationalCode,
        mobile,
        redirect: false,
      });

      if (result?.error) {
        setError('کد ملی یا شماره موبایل اشتباه است');
        setLoading(false);
      } else {
        // بلافاصله سشن را آپدیت کن تا ریدایرکت درست کار کند
        await new Promise(resolve => setTimeout(resolve, 300));
        updateSession();
        // ریدایرکت با ریفرش کامل صفحه
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } catch {
      setError('خطا در ارتباط با سرور');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (accountNationalCode: string, accountMobile: string) => {
    setError('');
    setLoading(true);
    setNationalCode(accountNationalCode);
    setMobile(accountMobile);

    try {
      const result = await signIn('credentials', {
        nationalCode: accountNationalCode,
        mobile: accountMobile,
        redirect: false,
      });

      if (result?.error) {
        setError('کد ملی یا شماره موبایل اشتباه است');
        setLoading(false);
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
        updateSession();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } catch {
      setError('خطا در ارتباط با سرور');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" dir="rtl">
      {/* ─── Theme Toggle ─── */}
      <ThemeToggle />

      {/* ═══════════════════════════════════════════════════════════
          سمت راست — فرم ورود (Neumorphic Card)
          ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-6 sm:p-8 relative">
        {/* Subtle dot pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.02] dark:opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dot-pattern-login" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-pattern-login)" />
        </svg>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md relative z-10"
        >
          {/* Neumorphic Card */}
          <div className="neu-flat p-8 sm:p-10">
            {/* ─── Logo & Title ─── */}
            <div className="text-center mb-8">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                className="inline-block"
              >
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl shadow-glow-primary">
                    <HardHat className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 gradient-primary rounded-2xl opacity-30 blur-md -z-10 scale-110" />
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-3xl font-extrabold text-foreground mt-5"
              >
                ساختمان یار
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="text-sm text-muted-foreground mt-1.5"
              >
                پلتفرم مدیریت عملیات ساختمانی
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>ورود با کد ملی و شماره موبایل</span>
              </motion.div>
            </div>

            {/* ─── Error Alert ─── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mb-5"
                >
                  <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm border border-red-200/50 dark:border-red-800/30">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Login Form ─── */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* National Code */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="nationalCode" className="text-sm font-medium text-foreground">
                  کد ملی (نام کاربری)
                </Label>
                <div className="relative">
                  <Fingerprint className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="nationalCode"
                    type="text"
                    value={nationalCode}
                    onChange={(e) => setNationalCode(e.target.value)}
                    placeholder="کد ملی ۱۰ رقمی"
                    required
                    dir="ltr"
                    className="h-11 rounded-xl pr-10 input-modern text-sm"
                    maxLength={10}
                  />
                </div>
              </motion.div>

              {/* Mobile Number (Password) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="mobile" className="text-sm font-medium text-foreground">
                  شماره موبایل (رمز عبور)
                </Label>
                <div className="relative">
                  <Smartphone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="mobile"
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                    required
                    dir="ltr"
                    className="h-11 rounded-xl pr-10 pl-10 input-modern text-sm"
                    maxLength={11}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? 'مخفی کردن شماره' : 'نمایش شماره'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  شماره موبایل شما به عنوان رمز عبور استفاده می‌شود
                </p>
              </motion.div>

              {/* Remember Me */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44, duration: 0.4 }}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="size-4"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                  مرا به خاطر بسپار
                </Label>
              </motion.div>

              {/* Login Button */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 gradient-primary text-white font-bold rounded-xl shadow-glow-primary hover:shadow-[0_0_0_1px_oklch(0.50_0.22_265/10%),0_8px_24px_oklch(0.50_0.22_265/25%)] transition-shadow cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        در حال ورود...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        ورود به سامانه
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </form>

            {/* ─── No Register Link ─── */}
            <div className="mt-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
              <p className="text-[10px] text-blue-700 dark:text-blue-300 text-center font-medium">
                کاربران فقط توسط ادمین سیستم ایجاد می‌شوند — ثبت‌نام غیرفعال است
              </p>
            </div>

            {/* ─── Divider ─── */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-3 text-muted-foreground">
                  یا ورود سریع
                </span>
              </div>
            </div>

            {/* ─── Test Accounts (Collapsible) ─── */}
            <div>
              <button
                type="button"
                onClick={() => setShowTestAccounts(!showTestAccounts)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>حساب‌های آزمایشی</span>
                {showTestAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {showTestAccounts && (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mt-3 space-y-2"
                  >
                    {testAccounts.map((account) => {
                      const Icon = account.icon;
                      return (
                        <motion.div key={account.nationalCode} variants={staggerItem}>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleQuickLogin(account.nationalCode, account.mobile)}
                            disabled={loading}
                            className="w-full flex items-center gap-3 bg-muted/50 hover:bg-muted/80 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl px-4 py-2.5 transition-colors border border-border/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className={cn('flex items-center justify-center size-8 rounded-lg bg-gradient-to-br', account.color)}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 text-right">
                              <p className="text-sm font-medium text-foreground">{account.label}</p>
                              <p className="text-[11px] text-muted-foreground" dir="ltr">کد ملی: {account.nationalCode}</p>
                            </div>
                            <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
                          </motion.button>
                        </motion.div>
                      );
                    })}
                    <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                      <p className="text-[10px] text-blue-700 dark:text-blue-300 text-center font-medium">
                        نام کاربری = کد ملی | رمز عبور = شماره موبایل
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ─── Footer ─── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="text-center text-[11px] text-muted-foreground/60 mt-5"
          >
            نسخه ۱.۰.۰ | © ساختمان یار
          </motion.p>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          سمت چپ — پنل بصری (Dark Blue Gradient + 3D Illustration)
          ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#1a2332] via-[#0f1720] to-[#0a0e18]">
        {/* Gradient overlay effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e40af]/20 via-transparent to-[#3b82f6]/10" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />

        {/* 3D Illustration */}
        <ConstructionIllustration />

        {/* Feature labels */}
        <div className="absolute bottom-8 left-8 right-8 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center"
          >
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: CreditCard, label: 'مدیریت مالی' },
                { icon: Users, label: 'کنترل دسترسی' },
                { icon: BarChart3, label: 'گزارشات هوشمند' },
              ].map((feature, idx) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + idx * 0.15, duration: 0.4 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <feature.icon className="w-5 h-5 text-blue-300" />
                  <span className="text-[11px] font-medium text-white/70">{feature.label}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-white/40 text-[11px]">
              ساختمان یار — راهکار جامع مدیریت عملیات ساختمانی
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: (string | undefined | false | null)[]) {
  return inputs.filter(Boolean).join(' ');
}
