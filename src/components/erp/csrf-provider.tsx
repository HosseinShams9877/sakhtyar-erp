// ─── CSRF Context Provider ───
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface CsrfContextType {
  csrfToken: string | null;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
  fetchWithCsrf: (url: string, options?: RequestInit) => Promise<Response>;
}

const CsrfContext = createContext<CsrfContextType>({
  csrfToken: null,
  isLoading: false,
  refreshToken: async () => {},
  fetchWithCsrf: async (url, options) => fetch(url, options),
});

export function useCsrfContext() { return useContext(CsrfContext); }

export function CsrfProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchInProgress, setFetchInProgress] = useState(false);

  const refreshToken = useCallback(async () => {
    if (!session) { setCsrfToken(null); return; }
    if (fetchInProgress) return;
    setFetchInProgress(true);
    setIsLoading(true);
    try {
      const res = await fetch('/api/csrf-token');
      if (res.ok) {
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      }
    } catch { /* silently fail */ } finally {
      setIsLoading(false);
      setFetchInProgress(false);
    }
  }, [session, fetchInProgress]);

  useEffect(() => { refreshToken(); }, [session]);

  // رفرش هر ۲۳ ساعت (یک ساعت قبل از انقضا)
  useEffect(() => {
    if (!csrfToken) return;
    const interval = setInterval(refreshToken, 23 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [csrfToken, refreshToken]);

  const fetchWithCsrf = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes((options.method || 'GET').toUpperCase())) {
      if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
    }
    let response = await fetch(url, { ...options, headers });
    if (response.status === 403) {
      await refreshToken();
      if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
      response = await fetch(url, { ...options, headers });
    }
    return response;
  }, [csrfToken, refreshToken]);

  return (
    <CsrfContext.Provider value={{ csrfToken, isLoading, refreshToken, fetchWithCsrf }}>
      {children}
    </CsrfContext.Provider>
  );
}
