'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, PackageCheck, Truck, Eye, ChevronLeft , ArrowLeft} from 'lucide-react';
import { formatDate, formatCurrencyShort, toPersianDigits } from '@/lib/rbac';
import Link from 'next/link';

interface Delivery {
  id: string;
  purchaseId: string;
  projectId: string;
  deliveryDate: string;
  confirmedBy: string;
  notes: string | null;
  createdAt: string;
  purchase: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    supplier: { companyName: string };
    project: { name: string };
  };
  project: { name: string };
}

export default function DeliveriesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('/api/deliveries');
      const data = await res.json();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(d =>
    d.purchase?.invoiceNumber?.includes(search) ||
    d.purchase?.supplier?.companyName?.includes(search) ||
    d.project?.name?.includes(search)
  );

  return (
    <div className="space-y-6 p-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PackageCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">مدیریت تحویل‌ها</h2>
          </div>
          <p className="text-sm text-muted-foreground">مشاهده و مدیریت تأییدیه‌های تحویل</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 input-modern rounded-xl"
          />
        </div>
      </div>
      <div className="md:hidden mb-4">
  <Button
    variant="ghost"
    size="icon"          
    onClick={() => router.back()}
    className="w-11 h-11 rounded-xl hover:bg-muted"
  >
    <ArrowLeft className="w-7 h-7" />
  </Button>
</div>

      {/* Deliveries List */}
      <Card className="border-0 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-right p-4 text-xs font-semibold">شماره فاکتور</th>
                  <th className="text-right p-4 text-xs font-semibold">تامین‌کننده</th>
                  <th className="text-right p-4 text-xs font-semibold">پروژه</th>
                  <th className="text-right p-4 text-xs font-semibold">تاریخ تحویل</th>
                  <th className="text-right p-4 text-xs font-semibold">تأییدکننده</th>
                  <th className="text-right p-4 text-xs font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={6} className="p-4">
                        <div className="h-4 bg-muted/50 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      تحویلی یافت نشد
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((delivery) => (
                    <tr key={delivery.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm font-semibold">
                        {toPersianDigits(delivery.purchase?.invoiceNumber || '—')}
                      </td>
                      <td className="p-4 text-sm">
                        {delivery.purchase?.supplier?.companyName || '—'}
                      </td>
                      <td className="p-4 text-sm">
                        {delivery.purchase?.project?.name || delivery.project?.name || '—'}
                      </td>
                      <td className="p-4 text-sm">
                        {formatDate(delivery.deliveryDate)}
                      </td>
                      <td className="p-4 text-sm">
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {delivery.confirmedBy}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Link href={`/invoices/${delivery.purchaseId}`}>
                          <Button variant="ghost" size="sm" className="gap-1 rounded-lg">
                            <Eye className="w-4 h-4" />
                            مشاهده
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}