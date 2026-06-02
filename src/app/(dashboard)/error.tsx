'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" dir="rtl">
      <Card className="w-full max-w-md border-0 shadow-soft">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mb-3">
            <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-lg font-bold">خطا در بارگذاری صفحه</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            در بارگذاری این صفحه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.
          </p>
          {error.message && process.env.NODE_ENV === 'development' && (
            <div className="bg-muted/50 rounded-lg p-2 text-xs text-muted-foreground font-mono text-left" dir="ltr">
              {error.message}
            </div>
          )}
          <Button onClick={reset} className="gap-2" size="sm">
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
