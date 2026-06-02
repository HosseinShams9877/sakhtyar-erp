// ─── Hook وضعیت آنلاین/آفلاین ───
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastChanged, setLastChanged] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChanged(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setLastChanged(new Date());
      toast.warning('شما آفلاین هستید. برخی قابلیت‌ها ممکن است محدود باشد.', { id: 'offline-status', duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show toast when coming back online after being offline
  useEffect(() => {
    if (isOnline && wasOffline) {
      toast.success('اتصال اینترنت برقرار شد', { id: 'offline-status' });
    }
  }, [isOnline, wasOffline]);

  return { isOnline, wasOffline, lastChanged };
}
