'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SettingsMap {
  [key: string]: any;
}

interface SettingsContextType {
  settings: SettingsMap;
  get: (key: string, defaultValue?: string) => string;
  getNumber: (key: string, defaultValue?: number) => number;
  getBoolean: (key: string, defaultValue?: boolean) => boolean;
  refetch: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  get: (_key: string, defaultValue?: string) => defaultValue || '',
  getNumber: (_key: string, defaultValue?: number) => defaultValue ?? 0,
  getBoolean: (_key: string, defaultValue?: boolean) => defaultValue ?? false,
  refetch: async () => {},
  loading: true,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        // API پاسخ رو در قالب { settings: {...} } برمی‌گردونه
        if (data?.settings && typeof data.settings === 'object') {
          setSettings(data.settings);
        } else if (data && typeof data === 'object' && !data.settings) {
          // حالت جایگزین: اگر مستقیم آبجکت برگشت
          setSettings(data);
        }
      }
    } catch {
      // در صورت خطا، تنظیمات خالی استفاده میشه
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const get = useCallback((key: string, defaultValue?: string) => {
    const val = settings[key];
    if (val === undefined || val === null) return defaultValue ?? '';
    return String(val);
  }, [settings]);

  const getNumber = useCallback((key: string, defaultValue?: number) => {
    const val = settings[key];
    if (val === undefined || val === null) return defaultValue ?? 0;
    const num = Number(val);
    return isNaN(num) ? (defaultValue ?? 0) : num;
  }, [settings]);

  const getBoolean = useCallback((key: string, defaultValue?: boolean) => {
    const val = settings[key];
    if (val === undefined || val === null) return defaultValue ?? false;
    if (typeof val === 'boolean') return val;
    return val === 'true';
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, get, getNumber, getBoolean, refetch: fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
