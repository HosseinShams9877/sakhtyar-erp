// ─── Hook مدیریت CSRF Token ───
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

export function useCsrf() {
  const { data: session } = useSession();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    if (!session) { setCsrfToken(null); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/csrf-token');
      if (res.ok) {
        const data = await res.json();
        setCsrfToken(data.csrfToken);
        setError(null);
      } else {
        setError('خطا در دریافت توکن CSRF');
      }
    } catch {
      setError('خطا در ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { refreshToken(); }, [refreshToken]);

  const fetchWithCsrf = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes((options.method || 'GET').toUpperCase())) {
      if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
    }
    const response = await fetch(url, { ...options, headers });
    if (response.status === 403) {
      await refreshToken();
      if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
      return fetch(url, { ...options, headers });
    }
    return response;
  }, [csrfToken, refreshToken]);

  return { csrfToken, isLoading, error, refreshToken, fetchWithCsrf };
}
