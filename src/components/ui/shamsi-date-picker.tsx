'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import jalaali from 'jalaali-js';
import { cn } from '@/lib/utils';

// ─── ثابت‌های شمسی ───
const SHAMSI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

const WEEKDAY_NAMES = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// تبدیل اعداد به فارسی
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
function toPersianDigits(str: string | number): string {
  return String(str).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

// ─── تبدیل‌های تاریخ ───

/** میلادی → شمسی */
function gregorianToShamsi(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  return jalaali.toJalaali(gy, gm, gd);
}

/** شمسی → میلادی */
function shamsiToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return jalaali.toGregorian(jy, jm, jd);
}

/** تعداد روزهای ماه شمسی */
function shamsiMonthDays(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

/** روز هفته شمسی (0=شنبه, 1=یکشنبه, ..., 6=جمعه) */
function shamsiDayOfWeek(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = shamsiToGregorian(jy, jm, jd);
  const jsDay = new Date(gy, gm - 1, gd).getDay(); // 0=Sunday
  // تبدیل: شنبه=0, یکشنبه=1, ..., جمعه=6
  return (jsDay + 1) % 7;
}

/** تاریخ امروز شمسی */
function getTodayShamsi(): { jy: number; jm: number; jd: number } {
  const now = new Date();
  return gregorianToShamsi(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Gregorian ISO string → Shamsi */
function isoToShamsi(iso: string): { jy: number; jm: number; jd: number } | null {
  if (!iso) return null;
  try {
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3) return null;
    return gregorianToShamsi(parts[0], parts[1], parts[2]);
  } catch {
    return null;
  }
}

/** Shamsi → Gregorian ISO string */
function shamsiToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = shamsiToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

// ─── Props ───

interface ShamsiDatePickerProps {
  value?: string; // Gregorian ISO: "2024-03-20"
  onChange?: (gregorianIso: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  dir?: 'rtl' | 'ltr';
  label?: string;
}

// ─── کامپوننت اصلی ───

export default function ShamsiDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  className,
  disabled = false,
  id,
  dir = 'rtl',
  label,
}: ShamsiDatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => getTodayShamsi(), []);

  // ماه/سال فعلی تقویم
  const [viewYear, setViewYear] = useState(today.jy);
  const [viewMonth, setViewMonth] = useState(today.jm);

  // مقدار انتخاب‌شده شمسی
  const selectedShamsi = useMemo(() => isoToShamsi(value || ''), [value]);

  // نمایش متنی
  const displayValue = useMemo(() => {
    if (!selectedShamsi) return '';
    return toPersianDigits(`${selectedShamsi.jy}/${String(selectedShamsi.jm).padStart(2, '0')}/${String(selectedShamsi.jd).padStart(2, '0')}`);
  }, [selectedShamsi]);

  // وقتی پاپ‌اور باز شد، به ماه مقدار انتخاب‌شده برو
  // استفاده از event handler به جای useEffect برای جلوگیری از cascading render
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (selectedShamsi) {
        setViewYear(selectedShamsi.jy);
        setViewMonth(selectedShamsi.jm);
      } else {
        setViewYear(today.jy);
        setViewMonth(today.jm);
      }
    }
  }, [selectedShamsi, today.jy, today.jm]);

  // ─── ناوبری ماه ───

  const goToPrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev <= 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev >= 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const t = getTodayShamsi();
    setViewYear(t.jy);
    setViewMonth(t.jm);
  }, []);

  // ─── ساخت گرید روزهای ماه ───

  const calendarDays = useMemo(() => {
    const daysInMonth = shamsiMonthDays(viewYear, viewMonth);
    const firstDayOfWeek = shamsiDayOfWeek(viewYear, viewMonth, 1);

    const days: (number | null)[] = [];

    // جای خالی قبل از روز اول
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // روزهای ماه
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    return days;
  }, [viewYear, viewMonth]);

  // ─── انتخاب روز ───

  const handleSelectDay = useCallback((day: number) => {
    const iso = shamsiToIso(viewYear, viewMonth, day);
    onChange?.(iso);
    setOpen(false);
  }, [viewYear, viewMonth, onChange]);

  // ─── بررسی‌ها ───

  const isToday = (day: number): boolean => {
    return viewYear === today.jy && viewMonth === today.jm && day === today.jd;
  };

  const isSelected = (day: number): boolean => {
    if (!selectedShamsi) return false;
    return viewYear === selectedShamsi.jy && viewMonth === selectedShamsi.jm && day === selectedShamsi.jd;
  };

  return (
    <div className={cn('relative', className)} dir={dir}>
      {label && (
        <label className="text-xs font-semibold mb-1.5 block" dir="rtl">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            disabled={disabled}
            className={cn(
              'w-full justify-start text-right h-10 font-normal rounded-xl',
              !displayValue && 'text-muted-foreground',
            )}
            dir="rtl"
          >
            <CalendarDays className="w-4 h-4 ml-2 text-muted-foreground flex-shrink-0" />
            {displayValue || (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 rounded-xl border shadow-lg"
          align="start"
          dir="rtl"
        >
          <div className="p-3">
            {/* ─── هدر ناوبری ─── */}
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={goToNextMonth}
                title="ماه بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <button
                type="button"
                onClick={goToToday}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-bold">
                  {SHAMSI_MONTHS[viewMonth - 1]}
                </span>
                <span className="text-sm font-bold text-primary">
                  {toPersianDigits(viewYear)}
                </span>
              </button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={goToPrevMonth}
                title="ماه قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* ─── انتخاب سریع ماه ─── */}
            <div className="grid grid-cols-6 gap-1 mb-3">
              {SHAMSI_MONTHS.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setViewMonth(idx + 1)}
                  className={cn(
                    'text-[10px] font-medium py-1 px-1 rounded-md transition-colors',
                    viewMonth === idx + 1
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* ─── روزهای هفته ─── */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {WEEKDAY_NAMES.map((name, idx) => (
                <div
                  key={idx}
                  className="h-7 flex items-center justify-center text-[11px] font-bold text-muted-foreground"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* ─── روزهای ماه ─── */}
            <div className="grid grid-cols-7 gap-0">
              {calendarDays.map((day, idx) => (
                <div key={idx} className="flex items-center justify-center">
                  {day === null ? (
                    <div className="h-8 w-8" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-center',
                        isSelected(day)
                          ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                          : isToday(day)
                          ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      {toPersianDigits(day)}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ─── دکمه امروز ─── */}
            <div className="mt-3 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => {
                  const t = getTodayShamsi();
                  handleSelectDay(t.jd);
                }}
                className="w-full text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1.5 rounded-lg hover:bg-primary/5"
              >
                امروز: {toPersianDigits(today.jd)} {SHAMSI_MONTHS[today.jm - 1]} {toPersianDigits(today.jy)}
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
