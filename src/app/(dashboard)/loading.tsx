import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6" dir="rtl">
      {/* عنوان */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-7 w-36 rounded-full" />
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border-0 shadow-soft overflow-hidden">
            <div className="flex items-stretch">
              <Skeleton className="w-16 h-24 rounded-none" />
              <div className="flex-1 p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* نمودارها */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border-0 shadow-soft p-6 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border-0 shadow-soft p-6 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>

      {/* جدول‌ها */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border-0 shadow-soft p-6 space-y-3">
          <Skeleton className="h-4 w-36" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <div className="rounded-2xl border-0 shadow-soft p-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
