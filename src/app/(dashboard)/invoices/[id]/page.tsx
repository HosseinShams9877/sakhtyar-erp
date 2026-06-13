'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, FileText, Truck, Receipt, 
  CreditCard, CalendarDays, Package, Building2,
  AlertTriangle, CheckCircle2, Eye
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
    actualQuantity?: number | null;
    discrepancy?: string | null;
    hasDiscrepancy?: boolean;
  }>;
  payments?: Array<{  
    id: string;
    amount: number;
    method: string;
    voiceNoteUrl?: string;
  }>;
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
      } else {
        console.error('Error:', data.error);
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
  const hasAnyDiscrepancy = invoice.items?.some(item => item.hasDiscrepancy) || false;
  
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    paid: 'bg-teal-100 text-teal-700',
    delivered: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="space-y-6 p-6">
     
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

      {/* هشدار مغایرت */}
      {hasAnyDiscrepancy && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
                ⚠️ مغایرت در تحویل کالا
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300">
                در برخی از اقلام این فاکتور مغایرت وجود دارد. لطفاً جزئیات را در جدول اقلام مشاهده کنید.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="text-sm font-bold text-right" dir="ltr">{formatCurrency(invoice.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">پرداخت شده</p>
              <p className="text-sm font-bold text-emerald-600 text-right" dir="ltr">{formatCurrency(invoice.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">باقی‌مانده</p>
              <p className="text-sm font-bold text-red-600 text-right" dir="ltr">{formatCurrency(remainingAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">سررسید</p>
              <p className="text-sm font-bold text-right">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <Separator />

          {/* آیتم‌ها با نمایش مغایرت */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                آیتم‌های فاکتور
              </h4>
              <div className="border rounded-xl overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-right p-3 text-xs font-semibold">نام کالا</th>
                      <th className="text-right p-3 text-xs font-semibold">تعداد فاکتور</th>
                      <th className="text-right p-3 text-xs font-semibold">تعداد تحویل</th>
                      <th className="text-right p-3 text-xs font-semibold">واحد</th>
                      <th className="text-right p-3 text-xs font-semibold">قیمت واحد</th>
                      <th className="text-right p-3 text-xs font-semibold">مبلغ</th>
                      <th className="text-right p-3 text-xs font-semibold">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => {
                      const hasDiscrepancy = item.hasDiscrepancy;
                      const isShortage = item.actualQuantity !== undefined && 
                                         item.actualQuantity !== null && 
                                         item.actualQuantity < item.quantity;
                      
                      return (
                        <tr key={item.id} className={`border-t ${hasDiscrepancy ? 'bg-orange-50/50 dark:bg-orange-950/10 text-right' : ''}`}>
                          <td className="p-3 text-sm text-right">{item.materialName}</td>
                          <td className="p-3 text-sm text-right" dir="ltr">{toPersianDigits(item.quantity)}</td>
                          <td className="p-3 text-sm text-right" dir="ltr">
                            {item.actualQuantity !== undefined && item.actualQuantity !== null ? (
                              <span className={isShortage ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                                {toPersianDigits(item.actualQuantity)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-right">—</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">{UNIT_LABELS[item.unit] || item.unit}</td>
                          <td className="p-3 text-sm" dir="ltr">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-3 text-sm font-semibold" dir="ltr">{formatCurrency(item.totalPrice)}</td>
                          <td className="p-3">
                            {hasDiscrepancy ? (
                              <div className="flex flex-col gap-1">
                                <Badge className="bg-orange-100 text-orange-700 text-[10px] gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  مغایرت
                                </Badge>
                                {item.discrepancy && (
                                  <span className="text-[10px] text-orange-600 max-w-[150px]">
                                    {item.discrepancy}
                                  </span>
                                )}
                              </div>
                            ) : item.actualQuantity !== undefined && item.actualQuantity !== null ? (
                              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                تطابق
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">در انتظار تحویل</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
          {/* مدارک و تصاویر */}
{(invoice.invoiceImage || invoice.waybillUrl || invoice.deliveryReceiptUrl) && (
  <>
    <Separator />
    <div>
      <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Receipt className="w-4 h-4" />
        مدارک و تصاویر
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* تصویر فاکتور */}
        {invoice.invoiceImage && (
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs font-semibold mb-2">تصویر فاکتور</p>
            <a 
              href={invoice.invoiceImage} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm">مشاهده تصویر</span>
            </a>
          </div>
        )}

        {/* عکس بارنامه */}
        {invoice.waybillUrl && (
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              بارنامه
            </p>
            <a 
              href={invoice.waybillUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">مشاهده بارنامه</span>
            </a>
          </div>
        )}

        {/* رسید تحویل */}
        {invoice.deliveryReceiptUrl && (
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              رسید تحویل
            </p>
            <a 
              href={invoice.deliveryReceiptUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">مشاهده رسید</span>
            </a>
          </div>
        )}
      </div>
    </div>
  </>
)}
{/* ویس پرداخت */}
{invoice.payments && invoice.payments.length > 0 && invoice.payments?.[0]?.voiceNoteUrl && (
  <div className="p-3 rounded-xl bg-muted/30">
    <p className="text-xs font-semibold mb-2 flex items-center gap-1">
      <Receipt className="w-3 h-3" />
      ویس پرداخت
    </p>
    <audio 
      controls 
      src={invoice.payments[0].voiceNoteUrl} 
      className="w-full h-10"
    />
  </div>
)}
        </CardContent>
      </Card>
    </div>
  );
}