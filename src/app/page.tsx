'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { FullPageLoader } from '@/components/sakhtyar/page-loader';
import AppShell from '@/components/sakhtyar/app-shell';

export default function HomePage() {
  const { status } = useAuth();

  // ریدایرکت به صفحه لاگین اگر احراز هویت نشده باشد
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login';
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <FullPageLoader />;
  }

  return <AppShell />;
}
