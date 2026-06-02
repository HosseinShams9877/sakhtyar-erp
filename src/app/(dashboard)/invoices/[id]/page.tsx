'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, FileText, Truck, Receipt, 
  CreditCard, CalendarDays, Package, Building2 
} from 'lucide-react';
import Link from 'next/link';
import { 
  toPersianDigits, formatCurrency, formatDate,
  INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, UNIT_LABELS 
} from '@/lib/rbac';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  description: string | null;
  purchaseDate: string;
  dueDate: string;
  paymentMethod: string | null;
  settlementDate: string | null;
  taxAmount: number;
  invoiceImage: string | null;
  pdfUrl: string | null;
  waybillUrl: string | null;
  deliveryReceiptUrl: string | null;
  supplier: { id: string; companyName: string; contactName: string; phone: string };
  project: { id: string; name: string; location: string };
  items: Array<{
    id: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }> | [];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices?id=${id}`);
      const data = await res.json();
      if (res.ok) {
        setInvoice(data);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">در حال بارگذاری...</div>;
  }

  if (!invoice) {
    return <div className="text-center p-8 text-red-500">فاکتور یافت نشد</div>;
  }

  const remainingAmount = invoice.totalAmount - invoice.paidAmount;
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    paid: 'bg-teal-100 text-teal-700',
    delivered: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-extrabold">
            جزئیات فاکتور {toPersianDigits(invoice.invoiceNumber)}
          </h2>
          <p className="text-sm text-muted-foreground">مشاهده اطلاعات کامل فاکتور</p>
        </div>
      </div>

      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 space-y-6">
          {/* اطلاعات اصلی */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">شماره فاکتور</p>
              <p className="text-sm font-bold">{toPersianDigits(invoice.invoiceNumber)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">وضعیت</p>
              <Badge className={statusColors[invoice.status] || 'bg-gray-100'}>
                {INVOICE_STATUS_LABELS[invoice.status] || 'نامشخص'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">روش پرداخت</p>
              <p className="text-sm">{PAYMENT_METHOD_LABELS[invoice.paymentMethod || ''] || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">تاریخ خرید</p>
              <p className="text-sm">{formatDate(invoice.purchaseDate)}</p>
            </div>
          </div>

          <Separator />

          {/* فروشنده و پروژه */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3 p-3 rounded-xl bg-muted/30">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">فروشنده</p>
                <p className="text-sm font-bold">{invoice.supplier?.companyName || '—'}</p>
                <p className="text-xs text-muted-foreground mt-1">{invoice.supplier?.contactName}</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-muted/30">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">پروژه</p>
                <p className="text-sm font-bold">{invoice.project?.name || '—'}</p>
                <p className="text-xs text-muted-foreground mt-1">{invoice.project?.location}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* مبالغ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">مبلغ کل</p>
              <p className="text-sm font-bold" dir="ltr">{formatCurrency(invoice.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">پرداخت شده</p>
              <p className="text-sm font-bold text-emerald-600" dir="ltr">{formatCurrency(invoice.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">باقی‌مانده</p>
              <p className="text-sm font-bold text-red-600" dir="ltr">{formatCurrency(remainingAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">سررسید</p>
              <p className="text-sm font-bold">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <Separator />

          {/* آیتم‌ها */}
          {/* آیتم‌ها - با بررسی وجود items */}
{invoice.items && invoice.items.length > 0 && (
  <div>
    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
      <Package className="w-4 h-4" />
      آیتم‌های فاکتور
    </h4>
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-right p-3 text-xs font-semibold">نام کالا</th>
            <th className="text-right p-3 text-xs font-semibold">تعداد</th>
            <th className="text-right p-3 text-xs font-semibold">واحد</th>
            <th className="text-right p-3 text-xs font-semibold">قیمت واحد</th>
            <th className="text-right p-3 text-xs font-semibold">مبلغ</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-3 text-sm">{item.materialName}</td>
              <td className="p-3 text-sm" dir="ltr">{toPersianDigits(item.quantity)}</td>
              <td className="p-3 text-sm">{UNIT_LABELS[item.unit] || item.unit}</td>
              <td className="p-3 text-sm" dir="ltr">{formatCurrency(item.unitPrice)}</td>
              <td className="p-3 text-sm font-semibold" dir="ltr">{formatCurrency(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

          {/* توضیحات */}
          {invoice.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-bold mb-2">توضیحات</h4>
                <p className="text-sm text-muted-foreground">{invoice.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}