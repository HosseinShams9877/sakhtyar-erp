'use client';
import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useProject } from '@/components/project-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, X , Upload} from 'lucide-react';
import { 
  Warehouse as WarehouseIcon,
  Shield,
  CheckCircle2,
  FileText,
  Eye,
  Truck,
  Users,
  Settings,
  Zap,
  Home,
  ScanBarcode,
  Package,
  AlertTriangle,
  ShoppingBag,
  CalendarClock,
  ClipboardList,
} from 'lucide-react';
import { ROLE_THEME, ROLE_LABELS, toPersianDigits, formatDateShort ,UNIT_LABELS } from '@/lib/rbac';
import { motion, AnimatePresence } from 'framer-motion';
import { DesktopSidebar, SidebarContent } from '@/components/sakhtyar/sidebar';
import Header from '@/components/sakhtyar/header';
import BottomNav from '@/components/sakhtyar/bottom-nav';
import QuickAccess from '@/components/sakhtyar/quick-access';
import { PageLoader } from '@/components/sakhtyar/page-loader';
import { useIsMobile } from '@/hooks/use-mobile';

// ═══════════════════════════════════════════════════════════
// Lazy-loaded page components
// ═══════════════════════════════════════════════════════════
const SuperManagerDashboard = lazy(() => import('@/components/erp/role-dashboards').then(m => ({ default: m.SuperManagerDashboard })));
const ProjectManagerDashboard = lazy(() => import('@/components/erp/role-dashboards').then(m => ({ default: m.ProjectManagerDashboard })));
const PurchaserDashboard = lazy(() => import('@/components/erp/role-dashboards').then(m => ({ default: m.PurchaserDashboard })));
const PermissionsPage = lazy(() => import('@/components/erp/permissions-page'));
const WorkflowBuilder = lazy(() => import('@/components/erp/workflow-builder'));
const DynamicSettingsComponent = lazy(() => import('@/components/erp/dynamic-settings'));
const DueDatesComponent = lazy(() => import('@/components/erp/due-dates'));
const VendorsPage = lazy(() => import('@/components/erp/vendors-page'));
const WarehousePage = lazy(() => import('@/components/erp/warehouse-page'));
const InvoiceForm = lazy(() => import('@/components/erp/invoice-form'));
const UsersPage = lazy(() => import('@/components/erp/users-page'));
const ReportsPage = lazy(() => import('@/components/erp/reports-page'));
const ProjectsPage = lazy(() => import('@/components/erp/projects-page'));
const MaterialsPage = lazy(() => import('@/components/erp/materials-page'));
const TransactionsPage = lazy(() => import('@/components/erp/transactions-page'));

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type PageKey = 'dashboard' | 'projects' | 'invoices' | 'dues' | 'vendors' | 'shortage' | 'warehouse' | 'reports' | 'users' | 'permissions' | 'workflow' | 'settings' | 'materials';

// ═══════════════════════════════════════════════════════════
// Animation Variants
// ═══════════════════════════════════════════════════════════

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ═══════════════════════════════════════════════════════════
// انباردار و ادمین داشبورد (محلی)
// ═══════════════════════════════════════════════════════════

function WarehouseKeeperDashboard({ onPageChange }: { onPageChange?: (page: PageKey) => void }) {
  const { activeProject } = useProject();
  const isMobile = useIsMobile();
  const { session } = useAuth();  
  const userId = (session?.user as any)?.id;
  const [submitting, setSubmitting] = useState(false);
  // Stateها
  const [materials, setMaterials] = useState<any[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<any[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [materialDetailOpen, setMaterialDetailOpen] = useState(false);
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<any>(null);

  // داخل WarehouseKeeperDashboard، با بقیه useStateها:
const [shortageUnit, setShortageUnit] = useState<string>('KILOGRAM');
const [notes, setNotes] = useState('');

const [itemActualQuantities, setItemActualQuantities] = useState<Record<string, { actual: number; discrepancy: string }>>({});
  
  // دیالوگ‌ها
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [shortageDialogOpen, setShortageDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [shortageQuantity, setShortageQuantity] = useState('');
  const [shortagePriority, setShortagePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [shortageNote, setShortageNote] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  // بارگذاری داده‌ها
const loadData = useCallback(async () => {
  const projectId = activeProject?.id || '';
  
  // ✅ اگر پروژه انتخاب نشده، درخواست نزن و stateها را خالی کن
  if (!projectId) {
    console.log('⏳ No project selected, skipping data load');
    setLoading(false);
    setMaterials([]);
    setPendingDeliveries([]);
    setDeliveryHistory([]);
    return;
  }
  
  setLoading(true);
  try {
    console.log('🔍 Loading data for project:', projectId);
    
    const [materialsRes, pendingRes, historyRes] = await Promise.all([
      fetch(`/api/materials?projectId=${projectId}`),
      fetch(`/api/deliveries?projectId=${projectId}&pending=true`),
      fetch(`/api/deliveries?projectId=${projectId}`),
    ]);
    
    let materialsData = [];
    let pendingData = [];
    let historyData = [];
    
    if (materialsRes.ok) {
      const json = await materialsRes.json();
      materialsData = json.materials || [];
    }
    
    if (pendingRes.ok) {
      const json = await pendingRes.json();
      pendingData = json.deliveries || [];
    }
    
    if (historyRes.ok) {
      const json = await historyRes.json();
      historyData = json.history || [];
    }
    
    setMaterials(materialsData);
    setPendingDeliveries(pendingData);
    setDeliveryHistory(historyData);
    
  } catch (error) {
    console.error('Error loading warehouse data:', error);
    toast.error('خطا در بارگذاری اطلاعات');
  } finally {
    setLoading(false);
  }
}, [activeProject?.id]);
useEffect(() => {
  if (activeProject?.id) {
    loadData();
  } else {
    setMaterials([]);
    setPendingDeliveries([]);
    setDeliveryHistory([]);
    setLoading(false);
  }
}, [activeProject?.id, loadData]);
useEffect(() => {
  const handleOpenShortageFromEvent = () => {
    console.log('🔄 Event received: open-shortage-dialog');
    setShortageDialogOpen(true);
  };
  
  window.addEventListener('open-shortage-dialog', handleOpenShortageFromEvent);
  
  return () => {
    window.removeEventListener('open-shortage-dialog', handleOpenShortageFromEvent);
  };
}, []);

// بعد از useStateها، این رو اضافه کن
const uniqueUnits = React.useMemo(() => {
  const units = new Set<string>();
  materials.forEach(m => {
    if (m.unit) units.add(m.unit);
  });
  // اضافه کردن واحدهای پیش‌فرض اگر لیست خالی بود
  if (units.size === 0) {
    units.add('KILOGRAM');
    units.add('PIECE');
    units.add('TON');
    units.add('SQUARE_METER');
  }
  return Array.from(units);
}, [materials]);

  const handleConfirmDelivery = async (delivery: any) => {
    setSelectedDelivery(delivery);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedDelivery) return;
    
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
    if (capturedImage && capturedImage.startsWith('data:image')) {
      // تبدیل base64 به File
      const blob = await fetch(capturedImage).then(res => res.blob());
      const file = new File([blob], 'delivery-image.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      }
    }
      // ساخت payload با مقادیر واقعی و مغایرت‌ها
      const payload = {
        deliveryId: selectedDelivery.id,
        confirmedBy: 'انباردار',
        imageUrl,
        image: capturedImage,
        notes: notes,
        items: selectedDelivery.items?.map((item: any) => ({
          materialId: item.materialId,
          materialName: item.materialName,
          quantity: item.quantity, // مقدار فاکتور
          actualQuantity: itemActualQuantities[item.materialId]?.actual || item.quantity,
          discrepancy: itemActualQuantities[item.materialId]?.discrepancy || null,
          unit: item.unit,
        })) || [],
      };
      
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        toast.success('تحویل بار با موفقیت تایید شد');
        setConfirmDialogOpen(false);
        setCapturedImage(null);
        setNotes('');
        setItemActualQuantities({});
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در تایید تحویل');
      }
    } catch (err) {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };
  // تابع انتخاب فایل (تصویر یا PDF)
const handleFileSelect = (file: File) => {
  // بررسی حجم فایل (حداکثر 5 مگابایت)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('حجم فایل نباید بیشتر از ۵ مگابایت باشد');
    return;
  }

  // بررسی نوع فایل
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('فرمت فایل مجاز نیست. فقط تصویر یا PDF');
    return;
  }

  // برای تصاویر، پیش‌نمایش بساز
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  } else {
    // برای PDF، نام فایل را ذخیره کن
    setCapturedImage(file.name);
  }
};
const handleRequestShortage = async () => {
  if (!selectedMaterial?.id || !selectedMaterial?.name || !shortageQuantity) {
    toast.error('لطفاً مصالح و مقدار را انتخاب کنید');
    return;
  }

  setSubmitting(true);  // ✅ الان کار می‌کند
  try {
    const response = await fetch('/api/shortage-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        quantity: parseFloat(shortageQuantity),
        unit: shortageUnit,
        currentStock: selectedMaterial.stock,
        minStock: selectedMaterial.minStock,
        priority: shortagePriority,
        note: shortageNote,
        projectId: activeProject?.id,
        requestedById: userId, 
      }),
    });

    const result = await response.json();

    if (result.success) {
      toast.success('درخواست کسری با موفقیت ثبت شد');
      setShortageDialogOpen(false);
      setSelectedMaterial(null);
      setShortageQuantity('');
      setShortageNote('');
      setShortagePriority('medium');
      loadData(); // ریلود کردن لیست مواد
    } else {
      toast.error(result.error || 'خطا در ثبت درخواست');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('خطا در ارتباط با سرور');
  } finally {
    setSubmitting(false);
  }
};

  const handleCameraCapture = () => {
    setCapturedImage('/api/placeholder/400/300');
    setCameraDialogOpen(false);
    toast.success('تصویر بارنامه با موفقیت ثبت شد');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="px-4 py-4 space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  console.log('📦 تعداد مصالح:', materials.length);
console.log('مصالح:', materials);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 pb-20">
      {/* هدر بالا (Sticky) */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <WarehouseIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200">داشبورد انبار</h1>
              <p className="text-[10px] text-muted-foreground">
                {activeProject?.name || 'همه پروژه‌ها'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">ان</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Hub - 3 کارته */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {/* کارت ۱: اعلام کسری مصالح */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShortageDialogOpen(true)}
            className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-3 text-white shadow-xl"
          >
            <AlertTriangle className="w-7 h-7 mx-auto mb-1" />
            <span className="text-[11px] font-bold block text-center">اعلام کسری</span>
            <span className="text-[8px] opacity-80 text-center block">مصالح</span>
          </motion.button>

          {/* کارت ۲: ثبت عکس بارنامه */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setCameraDialogOpen(true)}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3 text-white shadow-xl"
          >
            <Camera className="w-7 h-7 mx-auto mb-1" />
            <span className="text-[11px] font-bold block text-center">ثبت عکس</span>
            <span className="text-[8px] opacity-80 text-center block">بارنامه</span>
          </motion.button>
{/* کارت ۳: موجودی انبار */}
<motion.button
  whileTap={{ scale: 0.97 }}
  onClick={() => {
    if (onPageChange) {
      onPageChange('materials');  // ✅ دقیقاً مثل HorizontalNav
    }
  }}
  className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-3 text-white shadow-xl"
>
  <Package className="w-7 h-7 mx-auto mb-1" />
  <span className="text-[11px] font-bold block text-center">موجودی</span>
  <span className="text-[8px] opacity-80 text-center block">انبار</span>
</motion.button>
        </div>
      </div>

    {/* خریدهای در انتظار تحویل + تاریخچه */}
<div className="px-4 py-3">
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
    <TabsList className="grid w-full grid-cols-2 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
      <TabsTrigger value="pending" className="rounded-lg text-xs font-bold">
        در انتظار تحویل
        {pendingDeliveries.length > 0 && (
          <Badge className="mr-2 bg-red-500 text-white text-[9px] px-1.5">
            {toPersianDigits(pendingDeliveries.length)}
          </Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="history" className="rounded-lg text-xs font-bold">
        تاریخچه تحویل‌ها
      </TabsTrigger>
    </TabsList>

    {/* ✅ تب در انتظار تحویل - استفاده از pendingDeliveries */}
    <TabsContent value="pending" className="mt-4 space-y-3">
      {loading ? (
        [...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        ))
      ) : pendingDeliveries.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            هیچ خرید در انتظار تحویلی وجود ندارد
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            فاکتورهای پرداخت شده در اینجا نمایش داده می‌شوند
          </p>
        </div>
      ) : (
        pendingDeliveries.map((delivery) => (
          <motion.div
            key={delivery.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] mb-1">
                  در انتظار تحویل
                </Badge>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  {delivery.supplierName}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  فاکتور: {toPersianDigits(delivery.invoiceNumber)}
                </p>
                {/* نمایش آیتم‌ها */}
                {delivery.items && delivery.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">اقلام:</p>
                    {delivery.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-[11px] text-gray-600 dark:text-gray-400">
                        • {item.materialName}: {toPersianDigits(item.quantity)} {item.unit === 'KILOGRAM' ? 'کیلوگرم' : item.unit === 'TON' ? 'تن' : 'عدد'}
                      </div>
                    ))}
                    {delivery.items.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">
                        + {toPersianDigits(delivery.items.length - 3)} قلم دیگر
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <Button
              onClick={() => handleConfirmDelivery(delivery)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-xl text-base font-bold gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              تایید تحویل بار
            </Button>
          </motion.div>
        ))
      )}
    </TabsContent>

    {/* ✅ تب تاریخچه تحویل‌ها */}
    <TabsContent value="history" className="mt-4 space-y-2">
      {loading ? (
        [...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-3 animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))
      ) : deliveryHistory.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            تاریخچه‌ای وجود ندارد
          </p>
        </div>
      ) : (
        deliveryHistory.map((history) => (
          <div key={history.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 flex items-center gap-3 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{history.supplierName || history.purchase?.supplier?.companyName || '---'}</p>
              <p className="text-[10px] text-muted-foreground">
                فاکتور: {toPersianDigits(history.invoiceNumber || history.purchase?.invoiceNumber)} • {toPersianDigits(history.items?.length || history.purchase?.items?.length || 0)} قلم
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium text-gray-600">{formatDateShort(history.deliveredAt || history.createdAt)}</p>
              <p className="text-[9px] text-muted-foreground">تایید: {history.confirmedBy}</p>
            </div>
          </div>
        ))
      )}
    </TabsContent>
  </Tabs>
</div>
      {/* دیالوگ جزئیات مصالح */}
      <Dialog open={materialDetailOpen} onOpenChange={setMaterialDetailOpen}>
        <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-emerald-500" />
              جزئیات مصالح
            </DialogTitle>
          </DialogHeader>
          
          {selectedMaterialDetail && (
            <div className="space-y-4 mt-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 text-center">
                <Package className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                <p className="text-base font-bold text-gray-800 dark:text-gray-200">
                  {selectedMaterialDetail.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  کد: {selectedMaterialDetail.code}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">موجودی فعلی</span>
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {toPersianDigits(selectedMaterialDetail.stock)} {selectedMaterialDetail.unit === 'KILOGRAM' ? 'کیلوگرم' : 'عدد'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">حداقل موجودی مجاز</span>
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {toPersianDigits(selectedMaterialDetail.minStock)} {selectedMaterialDetail.unit === 'KILOGRAM' ? 'کیلوگرم' : 'عدد'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">واحد اندازه‌گیری</span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                    {selectedMaterialDetail.unit === 'KILOGRAM' ? 'کیلوگرم' : 'عدد'}
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-xl text-center ${
                selectedMaterialDetail.stock <= selectedMaterialDetail.minStock
                  ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
              }`}>
                <p className="text-sm font-bold">
                  {selectedMaterialDetail.stock <= selectedMaterialDetail.minStock
                    ? '⚠️ نیاز به تامین مجدد'
                    : '✓ موجودی کافی است'}
                </p>
              </div>

              <Button
                onClick={() => {
                  setMaterialDetailOpen(false);
                  setSelectedMaterial(selectedMaterialDetail);
                  setShortageDialogOpen(true);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl py-4 text-base font-bold gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                اعلام کسری مصالح
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* دیالوگ دوربین */}
      <Dialog open={cameraDialogOpen} onOpenChange={setCameraDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden" dir="rtl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
            <DialogTitle className="text-white text-center text-base">
              ثبت عکس بارنامه / باسکول
            </DialogTitle>
          </div>
          <div className="p-5 text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <Button
              onClick={handleCameraCapture}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-6 text-base font-bold"
            >
              <Camera className="w-5 h-5 ml-2" />
              باز کردن دوربین
            </Button>
            <p className="text-[10px] text-muted-foreground mt-3">
              از بارنامه یا رسید باسکول عکس بگیرید
            </p>
          </div>
        </DialogContent>
      </Dialog>

    {/* دیالوگ اعلام کسری مصالح - نسخه با سلکتور */}
<Dialog open={shortageDialogOpen} onOpenChange={setShortageDialogOpen}>
  <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-base">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        اعلام کسری مصالح
      </DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4 mt-2">
      {/* ✅ سلکتور مصالح با داده‌های واقعی از materials */}
      <div>
        <Label className="text-xs font-semibold">انتخاب مصالح *</Label>
        <Select 
  value={selectedMaterial?.id || ''}
  onValueChange={(value) => {
    const material = materials.find(m => m.id === value);
    if (material) {
      setSelectedMaterial({
        id: material.id,
        name: material.name,
        unit: material.unit,
        stock: material.stock,
        minStock: material.minStock
      });
      // ✅ واحد اندازه‌گیری را به صورت خودکار از material.unit تنظیم کن
      setShortageUnit(material.unit === 'KILOGRAM' ? 'KILOGRAM' : 
                     material.unit === 'TON' ? 'TON' : 
                     material.unit === 'SQUARE_METER' ? 'SQUARE_METER' : 'PIECE');
    }
  }}
>
          <SelectTrigger className="rounded-xl mt-1 h-12">
            <SelectValue placeholder="انتخاب مصالح..." />
          </SelectTrigger>
          <SelectContent>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                <div className="flex justify-between items-center w-full">
                  <span>{material.name}</span>
                  <span className="text-xs text-muted-foreground mr-2">
                    موجودی: {toPersianDigits(material.stock)} {material.unit === 'KILOGRAM' ? 'کیلوگرم' : 'عدد'}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* نمایش اطلاعات مصالح انتخاب شده */}
      {selectedMaterial && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground">موجودی فعلی:</span>
            <span className={`text-sm font-bold ${selectedMaterial.stock <= selectedMaterial.minStock ? 'text-red-500' : 'text-emerald-600'}`}>
              {toPersianDigits(selectedMaterial.stock)} {selectedMaterial.unit === 'KILOGRAM' ? 'کیلوگرم' : 'عدد'}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs font-semibold text-muted-foreground">حداقل موجودی مجاز:</span>
            <span className="text-sm font-bold">
              {toPersianDigits(selectedMaterial.minStock)} {selectedMaterial.unit === 'KILOGRAM' ? 'کیلوگرم' : 'عدد'}
            </span>
          </div>
        </div>
      )}
      
     {/* واحد اندازه‌گیری */}
<div>
  <Label className="text-xs font-semibold">واحد اندازه‌گیری *</Label>
  <Select value={shortageUnit} onValueChange={(value) => setShortageUnit(value as any)}>
    <SelectTrigger className="rounded-xl mt-1 h-12">
      <SelectValue placeholder="انتخاب واحد" />
    </SelectTrigger>
    <SelectContent>
      {Object.entries(UNIT_LABELS).map(([unitKey, unitLabel]) => (
        <SelectItem key={unitKey} value={unitKey}>
          {unitLabel}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
      
      {/* مقدار مورد نیاز */}
      <div>
        <Label className="text-xs font-semibold">مقدار مورد نیاز *</Label>
        <Input
          type="number"
          placeholder="مقدار را وارد کنید"
          value={shortageQuantity}
          onChange={(e) => setShortageQuantity(e.target.value)}
          className="rounded-xl mt-1 h-12"
          dir="ltr"
        />
      </div>
      
      {/* اولویت */}
      <div>
        <Label className="text-xs font-semibold">اولویت</Label>
        <Select value={shortagePriority} onValueChange={(v) => setShortagePriority(v as 'high' | 'medium' | 'low')}>
          <SelectTrigger className="rounded-xl mt-1 h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high" className="text-red-600">🔴 بالا (فوری)</SelectItem>
            <SelectItem value="medium" className="text-orange-600">🟠 متوسط</SelectItem>
            <SelectItem value="low" className="text-emerald-600">🟢 پایین</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* توضیحات */}
      <div>
        <Label className="text-xs font-semibold">توضیحات (اختیاری)</Label>
        <Textarea
          placeholder="مثال: برای ادامه عملیات فوری نیاز است..."
          value={shortageNote}
          onChange={(e) => setShortageNote(e.target.value)}
          className="rounded-xl mt-1"
          rows={3}
        />
      </div>
      
      <Button
        onClick={handleRequestShortage}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl py-5 text-base font-bold"
      >
        ارسال درخواست
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* دیالوگ تایید تحویل - نسخه با قابلیت ویرایش مقدار هر آیتم */}
<Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
  <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
    <DialogHeader className="flex-shrink-0">
      <DialogTitle className="flex items-center gap-2 text-base">
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        تایید تحویل بار
      </DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4 mt-2 flex-1 overflow-y-auto">
      {/* اطلاعات فاکتور */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 text-center">
        <Truck className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
        <p className="text-sm font-bold">
          {selectedDelivery?.supplierName}
        </p>
        <p className="text-[11px] text-muted-foreground">
          فاکتور: {toPersianDigits(selectedDelivery?.invoiceNumber || '')}
        </p>
      </div>
      
     {/* جدول اقلام */}
<div>
  <Label className="text-xs font-semibold mb-2 block">اقلام بارنامه</Label>
  <div className="border rounded-xl overflow-hidden">
    <div className="bg-gray-100 dark:bg-gray-800 p-2 grid grid-cols-3 gap-2 text-[10px] font-bold">
      <span>نام کالا</span>
      <span className="text-center">مقدار فاکتور</span>
      <span className="text-center">مقدار واقعی</span>
    </div>
    
    <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-52 overflow-y-auto">
      {selectedDelivery?.items?.map((item: any, index: number) => {
        const materialId = item.materialId || `item_${index}`;
        const currentActualValue = itemActualQuantities[materialId]?.actual;
        const currentActual = (currentActualValue !== undefined && !isNaN(currentActualValue)) 
          ? currentActualValue 
          : (item.quantity || 0);
        const currentDiscrepancy = itemActualQuantities[materialId]?.discrepancy ?? '';
        const isDifferent = currentActual !== item.quantity;
        
        // واحد اندازه‌گیری
        const unit = item.unit || 'KILOGRAM';
        const unitLabel = unit === 'KILOGRAM' ? 'کیلوگرم' : 
                         unit === 'TON' ? 'تن' : 
                         unit === 'SQUARE_METER' ? 'متر مربع' : 
                         unit === 'METER' ? 'متر' : 'عدد';
        
        return (
          <div key={index} className="p-2">
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-xs font-medium truncate">{item.materialName}</span>
              
              {/* مقدار فاکتور با واحد */}
              <span className="text-center text-xs">
                {toPersianDigits(item.quantity || 0)} {unitLabel}
              </span>
              
              {/* مقدار واقعی با واحد */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={currentActual}
                  onChange={(e) => {
                    const newVal = parseFloat(e.target.value);
                    const validNewVal = isNaN(newVal) ? 0 : newVal;
                    setItemActualQuantities(prev => ({
                      ...prev,
                      [materialId]: {
                        actual: validNewVal,
                        discrepancy: prev[materialId]?.discrepancy || ''
                      }
                    }));
                  }}
                  className={`w-full text-center text-xs rounded-lg border p-1 ${
                    isDifferent ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20' : 'border-gray-200'
                  }`}
                  dir="ltr"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{unitLabel}</span>
              </div>
            </div>
            
            {/* بخش توضیح مغایرت */}
            {isDifferent && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] font-semibold text-orange-600">مغایرت در تحویل</span>
                </div>
                <textarea
                  placeholder={`توضیح مغایرت (مثلاً: ${Math.abs(currentActual - (item.quantity || 0))} ${unitLabel} کم شده)...`}
                  value={currentDiscrepancy}
                  onChange={(e) => {
                    setItemActualQuantities(prev => ({
                      ...prev,
                      [materialId]: {
                        actual: prev[materialId]?.actual ?? item.quantity,
                        discrepancy: e.target.value
                      }
                    }));
                  }}
                  className="w-full text-xs rounded-lg border border-orange-200 p-2 mt-1"
                  rows={2}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
</div>
      
      {/* آپلود مدرک */}
      <div>
        <Label className="text-xs font-semibold">مدرک تحویل (بارنامه/رسید)</Label>
        <div className="mt-2 space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
              className="flex-1 gap-2 rounded-xl"
            >
              <Camera className="w-4 h-4" />
              دوربین
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,application/pdf';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
              className="flex-1 gap-2 rounded-xl"
            >
              <Upload className="w-4 h-4" />
              آپلود فایل
            </Button>
          </div>

          {capturedImage && (
            <div className="relative border-2 border-emerald-300 rounded-xl overflow-hidden">
              {capturedImage.startsWith('data:image') ? (
                <img src={capturedImage} alt="مدرک تحویل" className="w-full h-32 object-cover" />
              ) : (
                <div className="flex items-center justify-center p-4 gap-2">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <span className="text-xs truncate">{capturedImage}</span>
                </div>
              )}
              <button
                onClick={() => setCapturedImage(null)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* یادداشت کلی */}
      <div>
        <Label className="text-xs font-semibold">یادداشت (اختیاری)</Label>
        <Textarea
          placeholder="توضیحات اضافی..."
          className="rounded-xl mt-1"
          value={notes}
          rows={2}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
    
    <div className="flex-shrink-0 pt-4 border-t mt-2">
      <Button
        onClick={handleConfirmSubmit}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl py-5 text-base font-bold"
      >
        <CheckCircle2 className="w-5 h-5 ml-2" />
        تایید نهایی تحویل
      </Button>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
}


function AdminDashboard() {
  return (
    <motion.div
      className="space-y-5"
      dir="rtl"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">داشبورد ادمین</h2>
        </div>
        <p className="text-sm text-muted-foreground">مدیریت سیستم، کاربران و تنظیمات</p>
      </div>

      <QuickAccess role="ADMIN" />

      {/* وضعیت سیستم */}
      <Card className="border-0 neu-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold">وضعیت سیستم</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'پایگاه داده', status: 'فعال', ok: true },
              { label: 'سرور', status: 'آنلاین', ok: true },
              { label: 'بکاپ', status: 'آخرین: امروز', ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
                <motion.div
                  className={cn('w-2 h-2 rounded-full', item.ok ? 'bg-emerald-500' : 'bg-red-500')}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <div>
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// ناوبری افقی دسکتاپ برای نقش‌های موبایل‌محور
// ═══════════════════════════════════════════════════════════

interface HorizontalNavItem {
  key: PageKey;
  label: string;
  icon: React.ElementType;
}

const PURCHASER_HNAV: HorizontalNavItem[] = [
  { key: 'dashboard', label: 'خانه', icon: Home },
  { key: 'invoices', label: 'ثبت فاکتور', icon: FileText },
  { key: 'vendors', label: 'تامین‌کنندگان', icon: Truck },
  { key: 'dues', label: 'سررسیدها', icon: CalendarClock },
];

const WAREHOUSE_HNAV: HorizontalNavItem[] = [
  { key: 'warehouse', label: 'اسکن/تحویل', icon: ScanBarcode },
  { key: 'materials', label: 'موجودی انبار', icon: Package },
  { key: 'dashboard', label: 'مغایرت‌ها', icon: AlertTriangle },
];

function HorizontalNav({ role, currentPage, onPageChange }: {
  role: string; currentPage: PageKey; onPageChange: (page: PageKey) => void;
}) {
  const items = role === 'PURCHASER' ? PURCHASER_HNAV : WAREHOUSE_HNAV;
  const roleColor = role === 'PURCHASER' ? 'amber' : 'emerald';

  return (
    <div className="hidden lg:block border-b border-border/50 bg-card/50 backdrop-blur-sm px-4" dir="rtl">
      <div className="max-w-[1400px] mx-auto flex items-center gap-1 py-1.5">
        {items.map((item) => {
          const isActive = currentPage === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onPageChange(item.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? cn(
                      'text-white shadow-soft',
                      roleColor === 'amber'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                    )
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// رندر صفحه بر اساس کلید و نقش
// ═══════════════════════════════════════════════════════════

function renderPage(key: PageKey, role: string, onPageChange: (page: PageKey) => void) {
  // انباردار نباید هیچ داده مالی ببیند
  const isWarehouseRole = role === 'WAREHOUSE_KEEPER';

  switch (key) {
    case 'dashboard':
      switch (role) {
        case 'SUPER_MANAGER':
          return <SuperManagerDashboard />;
        case 'PROJECT_MANAGER':
          return <ProjectManagerDashboard />;
        case 'PURCHASER':
          return <PurchaserDashboard />;
        case 'WAREHOUSE_KEEPER':
          return <WarehouseKeeperDashboard  onPageChange={onPageChange} />;
        case 'ADMIN':
          return <AdminDashboard />;
        default:
          return <WarehouseKeeperDashboard />;
      }

    case 'projects':
      return <ProjectsPage />;

    case 'invoices':
      return isWarehouseRole ? <WarehousePage /> : <InvoiceForm />;

    case 'dues':
      return <DueDatesComponent />;

    case 'vendors':
      return <VendorsPage />;

    case 'warehouse':
      return <WarehousePage />;

    case 'materials':
      return isWarehouseRole ? <MaterialsPage /> : <MaterialsPage />;

      case 'reports':
        return isWarehouseRole ? <WarehousePage /> : <ReportsPage />;

    case 'users':
      return <UsersPage />;

    case 'permissions':
      return <PermissionsPage />;

    case 'workflow':
      return <WorkflowBuilder />;

    case 'settings':
      return <DynamicSettingsComponent />;

    default:
      return <PageLoader />;
  }
}

// ═══════════════════════════════════════════════════════════
// شل اصلی
// ═══════════════════════════════════════════════════════════

export default function AppShell() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const { session } = useAuth();
  const { activeRole, activeProject } = useProject();
  const isMobile = useIsMobile();

  const globalRole = session?.user?.role || 'WAREHOUSE_KEEPER';
  const role = globalRole || activeRole;
  const roleTheme = ROLE_THEME[role] || ROLE_THEME.SUPER_MANAGER;

  // نقش‌های موبایل‌محور
  const isMobileFirstRole = role === 'PURCHASER' || role === 'WAREHOUSE_KEEPER';

  // هندل ناوبری از Quick Access
  const handleQuickAccessNavigate = useCallback((key: string) => {
    setActivePage(key as PageKey);
  }, []);

  // هندل تغییر صفحه
  const handlePageChange = useCallback((page: PageKey) => {
    setActivePage(page);
  }, []);

  // هندل باز کردن دیالوگ کسری (از طریق Event)
  const handleOpenShortage = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-shortage-dialog'));
  }, []);

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* ─── سایدبار دسکتاپ ─── */}
      {!isMobileFirstRole && (
        <DesktopSidebar
          currentPage={activePage}
          onPageChange={handlePageChange}
          collapsed={false}
          onToggleCollapse={() => {}}
        />
      )}
  
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* ─── هدر بالا ─── */}
        <Header
          currentPage={activePage}
          onPageChange={handlePageChange}
          showSidebar={!isMobileFirstRole}
          sidebarGradient={roleTheme.sidebar}
        />
  
        {/* ─── ناوبری افقی دسکتاپ ─── */}
        {isMobileFirstRole && (
          <HorizontalNav
            role={role}
            currentPage={activePage}
            onPageChange={handlePageChange}
          />
        )}
  
        {/* ─── دسترسی سریع ─── */}
        {activePage === 'dashboard' && !isMobileFirstRole && (
          <div className="px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="max-w-[1400px] mx-auto">
              <div className="flex items-center gap-2 mb-3" dir="rtl">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">دسترسی سریع</h3>
              </div>
              <QuickAccess role={role} onNavigate={handleQuickAccessNavigate} />
            </div>
          </div>
        )}
  
        {/* ─── بدنه اصلی ─── */}
        <main className={cn(
          'flex-1 overflow-auto',
          isMobileFirstRole ? 'px-2 sm:px-3 lg:px-4 py-2' : 'p-4 sm:p-6'
        )}>
          <div className="max-w-[1400px] w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Suspense fallback={<PageLoader />}>
                  {renderPage(activePage, role, handlePageChange)}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
  
        {/* ─── ناوبری پایین موبایل ─── */}
        {isMobile && (
          <BottomNav
            role={role}
            activePage={activePage}
            onPageChange={handlePageChange}
            onShortageClick={handleOpenShortage}
          />
        )}
      </div>
    </div>
  );
}
