'use client';

import React from 'react';

// Layout ساده — AppShell اصلی در page.tsx ریشه (src/app/page.tsx) مدیریت می‌شود
// صفحات (dashboard) مستقین رندر می‌شوند و نیازی به AppShell اضافی ندارند
// چون کاربر از صفحه اصلی (/) وارد می‌شود که sakhtyar/app-shell را دارد

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
