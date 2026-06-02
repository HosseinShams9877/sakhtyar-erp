'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

/* ═══════════════════════════════════════════════════════════
   صفحه بارگذاری تمام‌صفحه
   ═══════════════════════════════════════════════════════════ */
export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
          <motion.div
            className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          />
        </div>
        <h2 className="text-lg font-extrabold mb-1">ساخت‌یار</h2>
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   اسکلتون بارگذاری صفحه (داخل محتوا)
   ═══════════════════════════════════════════════════════════ */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20" dir="rtl">
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   اسکلتون کارت آمار
   ═══════════════════════════════════════════════════════════ */
export function StatCardSkeleton() {
  return (
    <Card className="border-0 neu-flat overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-20 rounded mb-2" />
        <Skeleton className="h-7 w-32 rounded mb-1" />
        <Skeleton className="h-3 w-24 rounded" />
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   اسکلتون آیتم لیست
   ═══════════════════════════════════════════════════════════ */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
      <Skeleton className="h-5 w-20 rounded" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   اسکلتون داشبورد کامل
   ═══════════════════════════════════════════════════════════ */
export function DashboardSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-5 sm:space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(cards)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
