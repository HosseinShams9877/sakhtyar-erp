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
import { Camera, X } from 'lucide-react';
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
  
  // Stateها
  const [materials, setMaterials] = useState<any[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<any[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [materialDetailOpen, setMaterialDetailOpen] = useState(false);
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<any>(null);

  // داخل WarehouseKeeperDashboard، با بقیه useStateها:
const [shortageUnit, setShortageUnit] = useState<'KILOGRAM' | 'PIECE'>('KILOGRAM');
  
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
  // بارگذاری داده‌ها
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const projectId = activeProject?.id || '';
      
      const [materialsRes, deliveriesRes, historyRes] = await Promise.all([
        fetch(`/api/materials?projectId=${projectId}`),
        fetch(`/api/deliveries/pending?projectId=${projectId}`),
        fetch(`/api/deliveries/history?projectId=${projectId}`),
      ]);
      
      let materialsData = [];
      let deliveriesData = [];
      let historyData = [];
      
      if (materialsRes.ok) {
        const json = await materialsRes.json();
        // ✅ درست: materials رو از داخل json استخراج کن
        materialsData = json.materials || [];
      }
      
      if (deliveriesRes.ok) {
        const json = await deliveriesRes.json();
        deliveriesData = json.deliveries || (Array.isArray(json) ? json : []);
      }
      
      if (historyRes.ok) {
        const json = await historyRes.json();
        historyData = json.deliveries || (Array.isArray(json) ? json : []);
      }
      
      setMaterials(materialsData);
      setPendingDeliveries(deliveriesData);
      setDeliveryHistory(historyData);
      
    } catch (error) {
      console.error('Error loading warehouse data:', error);
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);
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
    
    try {
      const res = await fetch('/api/deliveries/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryId: selectedDelivery.id,
          confirmedBy: 'انباردار',
          image: capturedImage,
        }),
      });
      
      if (res.ok) {
        toast.success('تحویل بار با موفقیت تایید شد');
        setConfirmDialogOpen(false);
        setCapturedImage(null);
        loadData();
      } else {
        toast.error('خطا در تایید تحویل');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  const handleRequestShortage = async () => {
    if (!selectedMaterial?.id || !selectedMaterial?.name || !shortageQuantity) {
      toast.error('لطفاً مصالح و مقدار را انتخاب کنید');
      return;
    }
    
    try {
      const res = await fetch('/api/shortage-requests', {
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
        }),
      });
      
      if (res.ok) {
        toast.success('درخواست کسری مصالح با موفقیت ثبت شد');
        setShortageDialogOpen(false);
        setSelectedMaterial(null);
        setShortageQuantity('');
        setShortageUnit('KILOGRAM');
        setShortageNote('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در ثبت درخواست');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
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

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingDeliveries.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  هیچ خرید در انتظار تحویلی وجود ندارد
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
                    <div>
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] mb-1">
                        در انتظار تحویل
                      </Badge>
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                        {delivery.supplierName}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        فاکتور: {toPersianDigits(delivery.invoiceNumber)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
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

          <TabsContent value="history" className="mt-4 space-y-2">
            {deliveryHistory.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  تاریخچه‌ای وجود ندارد
                </p>
              </div>
            ) : (
              deliveryHistory.slice(0, 10).map((history) => (
                <div key={history.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 flex items-center gap-3 border border-gray-100 dark:border-gray-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{history.supplierName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      فاکتور: {toPersianDigits(history.invoiceNumber)} • {toPersianDigits(history.itemsCount)} قلم
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-gray-600">{formatDateShort(history.deliveredAt)}</p>
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
              setShortageUnit(material.unit === 'KILOGRAM' ? 'KILOGRAM' : 'PIECE');
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
        className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl py-5 text-base font-bold"
      >
        ارسال درخواست
      </Button>
    </div>
  </DialogContent>
</Dialog>

      {/* دیالوگ تایید تحویل */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              تایید تحویل بار
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 text-center">
              <Truck className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-sm font-bold">
                {selectedDelivery?.supplierName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                فاکتور: {toPersianDigits(selectedDelivery?.invoiceNumber || '')}
              </p>
            </div>
            
            <div>
              <Label className="text-xs font-semibold">عکس بارنامه (اختیاری)</Label>
              <div className="mt-2">
                {capturedImage ? (
                  <div className="relative">
                    <img src={capturedImage} alt="بارنامه" className="w-full h-32 object-cover rounded-xl" />
                    <button
                      onClick={() => setCapturedImage(null)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCameraDialogOpen(true)}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center"
                  >
                    <Camera className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <span className="text-[11px] text-gray-500">ثبت عکس بارنامه</span>
                  </button>
                )}
              </div>
            </div>
            
            <Button
              onClick={handleConfirmSubmit}
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
      return isWarehouseRole ? <WarehouseKeeperDashboard /> : <ReportsPage />;

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
