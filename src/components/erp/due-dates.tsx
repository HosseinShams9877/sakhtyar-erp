'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/components/project-context';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarClock, AlertTriangle, Clock, CheckCircle2, Search,
  Filter, DollarSign, TrendingUp, Phone, Building2,
  CreditCard, Eye, Receipt, ArrowUpDown,Mic, X, Loader2
} from 'lucide-react';
import ShamsiDatePicker from '@/components/ui/shamsi-date-picker';
import { toast } from 'sonner';
import {
  toPersianDigits, formatCurrency, formatCurrencyShort, formatDate, formatDateShort,
  INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS,
} from '@/lib/rbac';

// ─── Types ───

interface UrgencyInfo {
  level: string;
  label: string;
  color: string;
  order: number;
}

interface Vendor {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  mobile: string | null;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  paymentDate: string;
  dueDate: string | null;
  checkNumber: string | null;
  bankName: string | null;
  note: string | null;
}

interface DueItem {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  description: string | null;
  purchaseDate: string;
  dueDate: string;
  daysUntilDue: number;
  urgency: UrgencyInfo;
  supplier: Vendor;
  project: Project;
  items: { id: string; materialName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }[];
  payments: Payment[];
}

interface Summary {
  total: number;
  totalRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  urgentCount: number;
  urgentAmount: number;
  soonCount: number;
  soonAmount: number;
  normalCount: number;
  normalAmount: number;
}

// ─── Urgency Badge ───

function UrgencyBadge({ urgency }: { urgency: UrgencyInfo }) {
  const colorMap: Record<string, string> = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800',
    urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    soon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    normal: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800',
  };

  const iconMap: Record<string, React.ReactNode> = {
    overdue: <AlertTriangle className="w-3 h-3" />,
    urgent: <Clock className="w-3 h-3" />,
    soon: <Clock className="w-3 h-3" />,
    normal: <CheckCircle2 className="w-3 h-3" />,
  };

  return (
    <Badge className={`text-[10px] font-semibold flex items-center gap-1 border ${colorMap[urgency.level] || ''}`}>
      {iconMap[urgency.level]}
      {urgency.label}
    </Badge>
  );
}

// ─── Component ───

export default function DueDates() {
  const [dues, setDues] = useState<DueItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  

  // Filters
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const { activeProject } = useProject();
  const selectedProjectId = activeProject?.id || '';
  const [vendorFilter, setVendorFilter] = useState('all');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<DueItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentCheckNumber, setPaymentCheckNumber] = useState('');
  const [paymentBankName, setPaymentBankName] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailDue, setDetailDue] = useState<DueItem | null>(null);

  // Sort
  const [sortBy, setSortBy] = useState<'urgency' | 'amount' | 'dueDate'>('urgency');


  // ─── Data Loading ───
  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      // فقط از selectedProjectId استفاده کن (مثل WarehousePage)
      if (selectedProjectId) {
        params.set('projectId', selectedProjectId);
        console.log('🔍 Sending projectId to API:', selectedProjectId); 
      }
      
      // فیلترهای دیگر
      if (urgencyFilter && urgencyFilter !== 'all') params.set('urgency', urgencyFilter);
      if (vendorFilter && vendorFilter !== 'all') params.set('supplierId', vendorFilter);
      if (search) params.set('search', search);
    
      const [duesRes, prjRes, vndRes] = await Promise.all([
        fetch(`/api/dues?${params.toString()}`),
        fetch('/api/projects'),
        fetch('/api/vendors'),
      ]);
    
      const duesData = await duesRes.json();
      const prjData = await prjRes.json();
      const vndData = await vndRes.json();
    
      setDues(Array.isArray(duesData.dues) ? duesData.dues : []);
      setSummary(duesData.summary || null);
      setProjects(Array.isArray(prjData) ? prjData : []);
      setVendors(Array.isArray(vndData) ? vndData : []);
    } catch (error) {
      console.error('Error loading dues:', error);
      setDues([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [urgencyFilter, vendorFilter, search, selectedProjectId]); 

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Sort dues ───

  const sortedDues = [...dues].sort((a, b) => {
    if (sortBy === 'urgency') {
      return a.urgency.order - b.urgency.order || a.daysUntilDue - b.daysUntilDue;
    } else if (sortBy === 'amount') {
      return b.remainingAmount - a.remainingAmount;
    } else {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
  });

  // ─── Payment Handlers ───

  const openPaymentDialog = (due: DueItem) => {
    setSelectedDue(due);
    setPaymentAmount(String(due.remainingAmount));
    setPaymentMethod('CASH');
    setPaymentNote('');
    setPaymentCheckNumber('');
    setPaymentBankName('');
    setPaymentDueDate('');
    setPaymentDialogOpen(true);
  };
//بازگزاری ویس
const uploadVoiceNote = async (paymentId: string, file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('paymentId', paymentId);
    
    const res = await fetch('/api/upload/voice', {
      method: 'POST',
      body: formData,
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
    return null;
  } catch (error) {
    console.error('Voice upload error:', error);
    return null;
  }
};
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue || !paymentAmount) {
      toast.error('لطفاً مبلغ پرداخت را وارد کنید');
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error('مبلغ پرداخت باید بیشتر از صفر باشد');
      return;
    }
    if (amount > selectedDue.remainingAmount) {
      toast.error('مبلغ پرداخت نمی‌تواند بیشتر از مبلغ باقیمانده باشد');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: selectedDue.id,
          amount,
          method: paymentMethod,
          note: paymentNote,
          checkNumber: paymentCheckNumber || undefined,
          bankName: paymentBankName || undefined,
          dueDate: paymentDueDate || undefined,
        }),
      });

      if (res.ok) {
        const paymentData = await res.json(); // ✅ اضافه کن - آیدی پرداخت رو بگیر
        
        // ✅ آپلود ویس بعد از ثبت پرداخت
        let voiceUrl: string | null = null;
        if (voiceFile) {
          setUploadingVoice(true);
          voiceUrl = await uploadVoiceNote(paymentData.id, voiceFile);
          setUploadingVoice(false);
        }
        
        if (voiceUrl) {
          toast.success('پرداخت و ویس یادداشت با موفقیت ثبت شد');
        } else if (voiceFile) {
          toast.warning('پرداخت ثبت شد اما آپلود ویس ناموفق بود');
        } else {
          toast.success('پرداخت با موفقیت ثبت شد');
        }
        
        setPaymentDialogOpen(false);
        setSelectedDue(null);
        setVoiceFile(null); 
        loadData();
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };


  // ─── Detail View ───

  const openDetail = (due: DueItem) => {
    setDetailDue(due);
    setDetailDialogOpen(true);
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-8">
      {/* ─── هدر صفحه ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            سررسید پرداخت‌ها
          </h2>
          <p className="text-sm text-muted-foreground mt-1">مدیریت و پیگیری سررسید فاکتورها و پرداخت‌ها</p>
        </div>
      </div>

      {/* ─── کارت‌های آمار ─── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* سررسید گذشته */}
          <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-950/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">سررسید گذشته</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-extrabold text-red-700 dark:text-red-300">{toPersianDigits(summary.overdueCount)}</p>
              <p className="text-[10px] text-red-500 dark:text-red-400 mt-1" dir="ltr">{formatCurrencyShort(summary.overdueAmount)}</p>
            </CardContent>
          </Card>

          {/* فوری */}
          <Card className="border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-950/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">فوری (۳ روز)</span>
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-extrabold text-orange-700 dark:text-orange-300">{toPersianDigits(summary.urgentCount)}</p>
              <p className="text-[10px] text-orange-500 dark:text-orange-400 mt-1" dir="ltr">{formatCurrencyShort(summary.urgentAmount)}</p>
            </CardContent>
          </Card>

          {/* نزدیک */}
          <Card className="border-yellow-200 dark:border-yellow-900 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/50 dark:to-yellow-950/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">نزدیک (۷ روز)</span>
                <Clock className="w-4 h-4 text-yellow-500" />
              </div>
              <p className="text-xl font-extrabold text-yellow-700 dark:text-yellow-300">{toPersianDigits(summary.soonCount)}</p>
              <p className="text-[10px] text-yellow-500 dark:text-yellow-400 mt-1" dir="ltr">{formatCurrencyShort(summary.soonAmount)}</p>
            </CardContent>
          </Card>

          {/* عادی */}
          <Card className="border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-950/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">عادی</span>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xl font-extrabold text-green-700 dark:text-green-300">{toPersianDigits(summary.normalCount)}</p>
              <p className="text-[10px] text-green-500 dark:text-green-400 mt-1" dir="ltr">{formatCurrencyShort(summary.normalAmount)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── فیلترها ─── */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>فیلتر:</span>
            </div>

            {/* جستجو */}
            <div className="relative flex-1 min-w-[150px] max-w-[200px]">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="شماره فاکتور..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs rounded-lg pr-8"
              />
            </div>

            {/* فوریت */}
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="h-8 text-xs rounded-lg w-[130px]">
                <SelectValue placeholder="فوریت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="overdue">سررسید گذشته</SelectItem>
                <SelectItem value="urgent">فوری (۳ روز)</SelectItem>
                <SelectItem value="soon">نزدیک (۷ روز)</SelectItem>
                <SelectItem value="normal">عادی</SelectItem>
              </SelectContent>
            </Select>

            {/* تامین‌کننده */}
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="h-8 text-xs rounded-lg w-[140px]">
                <SelectValue placeholder="تامین‌کننده" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه تامین‌کنندگان</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* مرتب‌سازی */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-8 text-xs rounded-lg w-[120px]">
                <ArrowUpDown className="w-3 h-3 ml-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgency">فوریت</SelectItem>
                <SelectItem value="dueDate">تاریخ سررسید</SelectItem>
                <SelectItem value="amount">مبلغ باقیمانده</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── خلاصه کل ─── */}
      {summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">مجموع بدهی باز:</span>
                <span className="text-sm font-extrabold text-primary" dir="ltr">{formatCurrency(summary.totalRemaining)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{toPersianDigits(summary.total)} فاکتور باز</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── جدول سررسیدها ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            فهرست سررسیدها
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedDues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mb-3 text-green-400" />
              <p className="text-sm font-semibold">فاکتور باز وجود ندارد</p>
              <p className="text-xs mt-1">همه فاکتورها پرداخت شده‌اند</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-right text-[11px] font-semibold min-w-[110px]">شماره فاکتور</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[120px]">تامین‌کننده</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[100px]">پروژه</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[90px]">سررسید</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[80px]">فوریت</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[110px]">مبلغ کل</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[110px]">پرداخت‌شده</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[110px]">باقیمانده</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold min-w-[80px]">پیشرفت</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold w-[120px]">اقدامات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDues.map((due) => {
                    const progressPercent = due.totalAmount > 0 ? Math.round((due.paidAmount / due.totalAmount) * 100) : 0;
                    const rowBg = due.urgency.level === 'overdue'
                      ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30'
                      : '';

                    return (
                      <TableRow key={due.id} className={`hover:bg-muted/20 ${rowBg}`}>
                        <TableCell className="text-sm font-semibold">{toPersianDigits(due.invoiceNumber)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{due.supplier?.companyName || '—'}</span>
                            {due.supplier?.phone && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5" dir="ltr">
                                <Phone className="w-2.5 h-2.5" />
                                {due.supplier.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{due.project?.name || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs">{formatDateShort(due.dueDate)}</span>
                            <span className={`text-[10px] font-semibold ${
                              due.daysUntilDue < 0 ? 'text-red-500' :
                              due.daysUntilDue <= 3 ? 'text-orange-500' :
                              due.daysUntilDue <= 7 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {due.daysUntilDue < 0
                                ? `${toPersianDigits(Math.abs(due.daysUntilDue))} روز گذشته`
                                : `${toPersianDigits(due.daysUntilDue)} روز مانده`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell><UrgencyBadge urgency={due.urgency} /></TableCell>
                        <TableCell className="text-sm" dir="ltr">{formatCurrency(due.totalAmount)}</TableCell>
                        <TableCell className="text-sm text-green-600 dark:text-green-400" dir="ltr">{formatCurrency(due.paidAmount)}</TableCell>
                        <TableCell className="text-sm font-bold text-red-600 dark:text-red-400" dir="ltr">{formatCurrency(due.remainingAmount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={progressPercent} className="h-2 w-16" />
                            <span className="text-[10px] font-semibold text-muted-foreground">{toPersianDigits(progressPercent)}٪</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => openDetail(due)}
                              title="مشاهده جزئیات"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 rounded-lg hover:bg-green-50 hover:text-green-600"
                              onClick={() => openPaymentDialog(due)}
                              title="ثبت پرداخت"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── دیالوگ ثبت پرداخت ─── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 " dir="rtl">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-primary" />
              ثبت پرداخت
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[calc(85vh-100px)]">
          {selectedDue && (
            <form onSubmit={handlePayment} className="space-y-4 mt-2">
              {/* اطلاعات فاکتور */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">شماره فاکتور:</span>
                  <span className="text-sm font-bold">{toPersianDigits(selectedDue.invoiceNumber)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">تامین‌کننده:</span>
                  <span className="text-sm">{selectedDue.supplier?.companyName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">مبلغ کل:</span>
                  <span className="text-sm font-semibold" dir="ltr">{formatCurrency(selectedDue.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">پرداخت‌شده:</span>
                  <span className="text-sm text-green-600" dir="ltr">{formatCurrency(selectedDue.paidAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">مبلغ باقیمانده:</span>
                  <span className="text-sm font-extrabold text-red-600" dir="ltr">{formatCurrency(selectedDue.remainingAmount)}</span>
                </div>
              </div>

              <Separator />

              {/* فرم پرداخت */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">مبلغ پرداخت (ریال) *</Label>
                  <Input
                    type="number"
                    placeholder="مبلغ پرداخت"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="input-modern rounded-xl"
                    dir="ltr"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">روش پرداخت</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">نقدی</SelectItem>
                      <SelectItem value="CHECK">چکی</SelectItem>
                      <SelectItem value="CREDIT">اعتباری</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* فیلدهای چک */}
                {paymentMethod === 'CHECK' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">شماره چک</Label>
                      <Input
                        placeholder="شماره چک"
                        value={paymentCheckNumber}
                        onChange={(e) => setPaymentCheckNumber(e.target.value)}
                        className="input-modern rounded-xl"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">نام بانک</Label>
                      <Input
                        placeholder="نام بانک"
                        value={paymentBankName}
                        onChange={(e) => setPaymentBankName(e.target.value)}
                        className="input-modern rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">سررسید چک</Label>
                      <ShamsiDatePicker
                        value={paymentDueDate}
                        onChange={(v) => setPaymentDueDate(v)}
                        placeholder="انتخاب سررسید چک"
                        className="input-modern"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">یادداشت</Label>
                  <Textarea
                    placeholder="یادداشت پرداخت..."
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="input-modern rounded-xl resize-none"
                    rows={2}
                  />
                </div>

              <div className="space-y-2">
  <Label className="text-xs font-semibold">ویس یادداشت (اختیاری)</Label>
  <div className="flex items-center gap-2">
    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 transition-all bg-gray-50">
      <Mic className="w-4 h-4 text-blue-600" />
      <span className="text-sm">{voiceFile ? voiceFile.name : 'انتخاب فایل صوتی'}</span>
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
      />
    </label>
    {voiceFile && (
      <Button type="button" variant="ghost" size="icon" onClick={() => setVoiceFile(null)}>
        <X className="w-4 h-4 text-red-500" />
      </Button>
    )}
  </div>
  {uploadingVoice && (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="w-3 h-3 animate-spin" />
      در حال آپلود ویس...
    </div>
  )}
</div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  className="rounded-xl"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gradient-primary hover:opacity-90 rounded-xl shadow-soft"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت پرداخت'}
                </Button>
              </div>
            </form>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── دیالوگ جزئیات ─── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg " dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-primary" />
              جزئیات فاکتور
            </DialogTitle>
          </DialogHeader>

          {detailDue && (
            <div className="space-y-4 mt-2">
              {/* اطلاعات کلی */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">شماره فاکتور</p>
                  <p className="text-sm font-bold">{toPersianDigits(detailDue.invoiceNumber)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">تامین‌کننده</p>
                  <p className="text-sm font-bold">{detailDue.supplier?.companyName || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">پروژه</p>
                  <p className="text-sm">{detailDue.project?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">وضعیت</p>
                  <Badge className="text-[10px]">{INVOICE_STATUS_LABELS[detailDue.status] || 'نامشخص'}</Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">تاریخ خرید</p>
                  <p className="text-sm">{formatDate(detailDue.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">سررسید پرداخت</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">{formatDate(detailDue.dueDate)}</p>
                    <UrgencyBadge urgency={detailDue.urgency} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* اطلاعات مالی */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">مبلغ کل:</span>
                  <span className="text-sm font-semibold" dir="ltr">{formatCurrency(detailDue.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">پرداخت‌شده:</span>
                  <span className="text-sm text-green-600" dir="ltr">{formatCurrency(detailDue.paidAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">باقیمانده:</span>
                  <span className="text-sm font-extrabold text-red-600" dir="ltr">{formatCurrency(detailDue.remainingAmount)}</span>
                </div>
                <Progress
                  value={detailDue.totalAmount > 0 ? Math.round((detailDue.paidAmount / detailDue.totalAmount) * 100) : 0}
                  className="h-2 mt-2"
                />
              </div>

              {/* اقلام فاکتور */}
              {(detailDue.items?.length || 0) > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-2">اقلام فاکتور</h4>
                    <div className="border border-border/60 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="text-right text-[10px] font-semibold">نام کالا</TableHead>
                            <TableHead className="text-right text-[10px] font-semibold">تعداد</TableHead>
                            <TableHead className="text-right text-[10px] font-semibold">قیمت واحد</TableHead>
                            <TableHead className="text-right text-[10px] font-semibold">مبلغ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailDue.items || []).map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/20">
                              <TableCell className="text-xs font-medium">{item.materialName}</TableCell>
                              <TableCell className="text-xs" dir="ltr">{toPersianDigits(item.quantity)}</TableCell>
                              <TableCell className="text-xs" dir="ltr">{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell className="text-xs font-semibold" dir="ltr">{formatCurrency(item.totalPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}

              {/* تاریخچه پرداخت‌ها */}
              {(detailDue.payments?.length || 0) > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-2">تاریخچه پرداخت‌ها</h4>
                    <div className="space-y-2">
                      {(detailDue.payments || []).map((pay) => (
                        <div key={pay.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-green-500" />
                            <div>
                              <span className="text-xs font-semibold" dir="ltr">{formatCurrency(pay.amount)}</span>
                              <span className="text-[10px] text-muted-foreground ms-2">
                                {PAYMENT_METHOD_LABELS[pay.method] || 'نامشخص'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{formatDateShort(pay.paymentDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* دکمه ثبت پرداخت */}
              <Button
                onClick={() => {
                  setDetailDialogOpen(false);
                  openPaymentDialog(detailDue);
                }}
                className="w-full gradient-primary hover:opacity-90 rounded-xl shadow-soft gap-2"
              >
                <CreditCard className="w-4 h-4" />
                ثبت پرداخت
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
