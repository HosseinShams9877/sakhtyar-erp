// ─── کامپوننت صفحه‌بندی قابل استفاده مجدد ───

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toPersianDigits } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3">
      {/* اطلاعات صفحه */}
      <div className="text-xs text-muted-foreground">
        نمایش {toPersianDigits(startItem)} تا {toPersianDigits(endItem)} از {toPersianDigits(totalItems)} مورد
      </div>

      <div className="flex items-center gap-3">
        {/* تعداد در هر صفحه */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ردیف:</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="w-16 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>{toPersianDigits(size)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* دکمه‌های ناوبری */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>

          {/* شماره صفحه */}
          <div className="flex items-center gap-1 mx-2">
            {generatePageNumbers(currentPage, totalPages).map((page, idx) => (
              page === '...' ? (
                <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">...</span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  className={cn('w-8 h-8 rounded-lg text-xs', currentPage === page && 'gradient-primary')}
                  onClick={() => onPageChange(page as number)}
                >
                  {toPersianDigits(page as number)}
                </Button>
              )
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}



function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}
