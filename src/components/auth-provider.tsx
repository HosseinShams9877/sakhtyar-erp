// ─── ارائه‌دهنده احراز هویت ───
// مدیریت نشست با منطق تلاش مجدد و مسیر جایگزین
// جلوگیری از خطای script tag در React 19 (بدون SessionProvider)

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { signOut as nextAuthSignOut, signIn as nextAuthSignIn } from 'next-auth/react';

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  role?: string;
  avatar?: string;
}

interface SessionData {
  user?: SessionUser;
  expires?: string;
}

interface AuthContextType {
  session: SessionData | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  update: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  status: 'loading',
  update: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─── تنظیمات تلاش مجدد ───
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 6000]; // تأخیر به میلی‌ثانیه (exponential backoff)
const SESSION_POLL_INTERVAL = 5 * 60 * 1000; // ۵ دقیقه
const PRIMARY_SESSION_URL = '/api/auth/session';
const FALLBACK_SESSION_URL = '/api/session';

/**
 * دریافت سشن با منطق تلاش مجدد و مسیر جایگزین
 * اگر /api/auth/session با 502 یا خطا مواجه شود، /api/session امتحان می‌کند
 */
async function fetchSessionWithRetry(
  onSession: (data: SessionData | null) => void,
): Promise<void> {
  const urls = [PRIMARY_SESSION_URL, FALLBACK_SESSION_URL];

  for (const url of urls) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثانیه تایم‌اوت

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            onSession(data);
            return;
          }
          onSession(null); // سشن خالی = لاگین نشده
          return;
        }

        // 502 یا 503 = سرور در دسترس نیست، تلاش مجدد
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          console.warn(`[Auth] ${url} returned ${res.status}, retry ${attempt + 1}/${MAX_RETRIES}`);
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
            continue;
          }
          // تمام تلاش‌ها ناموفق بود، مسیر بعدی را امتحان کن
          break;
        }

        // سایر خطاها (401, 404, etc.) = سشن وجود ندارد
        onSession(null);
        return;
      } catch (error: any) {
        // خطای شبکه یا تایم‌اوت
        if (error.name === 'AbortError') {
          console.warn(`[Auth] ${url} timed out, retry ${attempt + 1}/${MAX_RETRIES}`);
        } else {
          console.warn(`[Auth] ${url} network error:`, error.message);
        }

        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        // تمام تلاش‌ها ناموفق بود، مسیر بعدی را امتحان کن
        break;
      }
    }
  }

  // همه تلاش‌ها ناموفق بود
  onSession(null);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const mountedRef = useRef(true);

  const update = useCallback(() => {
    fetchSessionWithRetry((data) => {
      if (!mountedRef.current) return;
      if (data) {
        setSession(data);
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleSession = (data: SessionData | null) => {
      if (!mountedRef.current) return;
      if (data) {
        setSession(data);
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    };

    // بارگذاری اولیه سشن
    fetchSessionWithRetry(handleSession);

    // نظارت دوره‌ای روی سشن
    const interval = setInterval(() => {
      fetchSessionWithRetry(handleSession);
    }, SESSION_POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, status, update }}>
      {children}
    </AuthContext.Provider>
  );
}
