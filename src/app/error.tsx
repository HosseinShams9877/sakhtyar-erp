'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md border-0 shadow-soft-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-bold">خطای سیستمی</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            متأسفانه خطایی غیرمنتظره رخ داده است. لطفاً دوباره تلاش کنید یا با مدیر سیستم تماس بگیرید.
          </p>
          {error.message && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground font-mono text-left" dir="ltr">
              {error.message}
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              تلاش مجدد
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/dashboard')} className="gap-2">
              <Home className="w-4 h-4" />
              بازگشت به داشبورد
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
