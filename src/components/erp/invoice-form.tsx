'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
// Dialog removed — invoice form now renders as full page
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus, Upload, Eye, Search, FileText, X, Image as ImageIcon, Pencil, Trash2,
  CheckCircle2, XCircle, ChevronDown, Paperclip, Truck, Receipt, DollarSign,
  CalendarDays, CreditCard, Package, Minus, FolderOpen,Download
} from 'lucide-react';
import ShamsiDatePicker from '@/components/ui/shamsi-date-picker';
import { toast } from 'sonner';
import {
  toPersianDigits, formatCurrency, formatDate,
  INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, UNIT_LABELS,
} from '@/lib/rbac';
import { useSearchParams } from 'next/navigation';

// ─── Types ───

interface Vendor { id: string; companyName: string; }
interface Project { id: string; name: string; code: string; }
interface Material { id: string; name: string; code: string; unit: string; }

interface InvoiceItem {
  materialId?: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceItemRow extends InvoiceItem {
  _key: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  taxAmount: number;
  invoiceImage: string | null;  
  pdfUrl: string | null;
  waybillUrl: string | null;
  deliveryReceiptUrl: string | null;
  description: string | null;
  status: string;
  date: string;
  paymentMethod: string | null;
  settlementDate: string | null;
  dueDate: string | null;
  supplier: Vendor;
  project: Project | null;
  approvedBy: { id: string; name: string } | null;
  items: (InvoiceItem & { id: string; material?: { id: string; name: string } })[];
}

// ─── Helpers ───

let _rowKeyCounter = 0;
function newRowKey(): string {
  return `row-${Date.now()}-${++_rowKeyCounter}`;
}

function createEmptyItemRow(): InvoiceItemRow {
  return {
    _key: newRowKey(),
    materialId: undefined,
    materialName: '',
    unit: 'KILOGRAM',
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
  };
}

const UNIT_KEYS = Object.keys(UNIT_LABELS);

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  paid: 'default',
  delivered: 'default',
};

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  paid: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
  delivered: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
};

interface FormState {
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  date: string;
  paymentMethod: string;
  settlementDate: string;
  dueDate: string;
  taxAmount: string;
  description: string;
}

const emptyForm: FormState = {
  invoiceNumber: '',
  vendorId: '',
  projectId: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: '',
  settlementDate: '',
  dueDate: '',
  taxAmount: '0',
  description: '',
};

interface FileState {
  image: File | null;
  pdf: File | null;
  waybill: File | null;
  deliveryReceipt: File | null;
}

const emptyFiles: FileState = {
  image: null,
  pdf: null,
  waybill: null,
  deliveryReceipt: null,
};

interface FilePreview {
  image: string | null;
  pdf: string | null;
  waybill: string | null;
  deliveryReceipt: string | null;
}

const emptyPreviews: FilePreview = {
  image: null,
  pdf: null,
  waybill: null,
  deliveryReceipt: null,
};

// ─── Component ───

export default function InvoiceForm() {
  // Data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status');
  const typeFilter = searchParams.get('type');


  // اضافه کن به بقیه useState‌ها
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [totalItems, setTotalItems] = useState(0);
const pageSize = 12;

  // UI state
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // View mode: 'list' | 'create' | 'edit' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  // Form
  const [form, setForm] = useState<FormState>(emptyForm);
  const [items, setItems] = useState<InvoiceItemRow[]>([createEmptyItemRow()]);
  const [files, setFiles] = useState<FileState>(emptyFiles);
  const [previews, setPreviews] = useState<FilePreview>(emptyPreviews);

  // Autocomplete state for each item row
  const [materialSuggestions, setMaterialSuggestions] = useState<Record<string, Material[]>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
  const suggestionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ─── Data Loading ───

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // گرفتن projectId از URL
      const projectId = searchParams.get('projectId') || '';
      
      // ساخت URL با در نظر گرفتن فیلترها
      let url = `/api/invoices?search=${search}&page=${currentPage}&pageSize=${pageSize}`;
      
      // اضافه کردن فیلتر status اگر وجود داشته باشد
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      
      // اضافه کردن فیلتر type اگر وجود داشته باشد
      if (typeFilter === 'corrective') {
        url += `&type=corrective`;
      }
      
      // اضافه کردن projectId به URL
      if (projectId) {
        url += `&projectId=${projectId}`;
      }

      console.log('🔍 Fetching URL:', url);
      
      const [invRes, vndRes, prjRes, matRes] = await Promise.all([
        fetch(url),
        fetch('/api/vendors'),
        fetch('/api/projects'),
        fetch('/api/materials'),
      ]);
      const invData = await invRes.json();
      const vndData = await vndRes.json();
      const prjData = await prjRes.json();
      const matData = await matRes.json();
      
      // دریافت اطلاعات صفحه‌بندی از پاسخ سرور
      const invoicesArray = invData.purchases || [];
      const total = invData.total || 0;
      const totalPagesFromServer = invData.totalPages || 1;
      
      // ست کردن اطلاعات صفحه‌بندی
      setTotalPages(totalPagesFromServer);
      setTotalItems(total);
      
      // نرمالایز کردن فاکتورها
      const normalizedInvoices = invoicesArray.map((inv: any) => ({
        ...inv,
        date: inv.purchaseDate,
        supplier: inv.supplier,
      }));
      
      setInvoices(normalizedInvoices);
      setVendors(Array.isArray(vndData) ? vndData : []);
      setProjects(Array.isArray(prjData) ? prjData : []);
      setMaterials(Array.isArray(matData?.materials) ? matData.materials : Array.isArray(matData) ? matData : []);
      
      // برای دیباگ
      console.log('Page Info:', { 
        currentPage, 
        totalPages: totalPagesFromServer, 
        totalItems: total,
        receivedCount: invoicesArray.length,
        filters: { status: statusFilter, type: typeFilter, projectId }
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
      setInvoices([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [search, currentPage, pageSize, statusFilter, typeFilter, searchParams]);

  useEffect(() => { loadData(); }, [loadData]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const updated: Record<string, boolean> = {};
      let changed = false;
      for (const key of Object.keys(showSuggestions)) {
        if (showSuggestions[key]) {
          const el = suggestionRefs.current[key];
          if (el && !el.contains(e.target as Node)) {
            updated[key] = false;
            changed = true;
          }
        }
      }
      if (changed) setShowSuggestions((prev) => ({ ...prev, ...updated }));
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // ─── Computed Values ───

  const itemsTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  // ─── Item Management ───

  const addItemRow = () => {
    setItems((prev) => [...prev, createEmptyItemRow()]);
  };

  const removeItemRow = (key: string) => {
    if (items.length <= 1) {
      toast.error('حداقل یک آیتم فاکتور الزامی است');
      return;
    }
    setItems((prev) => prev.filter((r) => r._key !== key));
  };

  const updateItem = (key: string, field: keyof InvoiceItemRow, value: string | number | null) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row._key !== key) return row;
        const updated = { ...row, [field]: value ?? '' };
        // Auto-calculate totalPrice
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
        }
        return updated;
      })
    );
  };

  const handleMaterialSearch = (key: string, query: string) => {
    updateItem(key, 'materialName', query);
    updateItem(key, 'materialId', null);
  
    if (query.trim().length === 0) {
      setMaterialSuggestions((prev) => ({ ...prev, [key]: [] }));
      setShowSuggestions((prev) => ({ ...prev, [key]: false }));
      return;
    }
  
    const searchTerm = query.trim().toLowerCase();
    
    const filtered = materials.filter((m) => {
      // بررسی نام
      if (m.name.toLowerCase().includes(searchTerm)) return true;
      // بررسی کد (اگر وجود داشته باشد)
      if (m.code && m.code.toLowerCase().includes(searchTerm)) return true;
      return false;
    }).slice(0, 8);
  
    setMaterialSuggestions((prev) => ({ ...prev, [key]: filtered }));
    setShowSuggestions((prev) => ({ ...prev, [key]: filtered.length > 0 }));
  };

  const selectMaterial = (key: string, material: Material) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row._key !== key) return row;
        return {
          ...row,
          materialId: material.id,
          materialName: material.name,
          unit: material.unit,
        };
      })
    );
    setShowSuggestions((prev) => ({ ...prev, [key]: false }));
  };

  // ─── File Management ───

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof FileState
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم فایل نباید بیشتر از ۵ مگابایت باشد');
      return;
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
    // Generate preview for images
    if (field === 'image' || field === 'waybill' || field === 'deliveryReceipt') {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      } else {
        setPreviews((prev) => ({ ...prev, [field]: null }));
      }
    }
    if (field === 'pdf') {
      setPreviews((prev) => ({ ...prev, [field]: file.name }));
    }
  };

  const removeFile = (field: keyof FileState) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
    setPreviews((prev) => ({ ...prev, [field]: null }));
  };

  // ─── Reset Form ───

  const resetForm = () => {
    setForm(emptyForm);
    setItems([createEmptyItemRow()]);
    setFiles(emptyFiles);
    setPreviews(emptyPreviews);
    setMaterialSuggestions({});
    setShowSuggestions({});
  };

  // ─── Build FormData for submission ───

  const buildFormData = (): FormData => {
    const formData = new FormData();
    formData.append('invoiceNumber', form.invoiceNumber);
    formData.append('vendorId', form.vendorId);
    if (form.projectId) formData.append('projectId', form.projectId);
    formData.append('totalAmount', String(itemsTotal));
    formData.append('taxAmount', form.taxAmount || '0');
    if (form.description) formData.append('description', form.description);
    formData.append('date', form.date);
    if (form.paymentMethod) formData.append('paymentMethod', form.paymentMethod);
    if (form.settlementDate) formData.append('settlementDate', form.settlementDate);
    if (form.dueDate) formData.append('dueDate', form.dueDate);

    // Items as JSON
    const itemsData = items.map((row) => ({
      materialId: row.materialId || undefined,
      materialName: row.materialName,
      unit: row.unit,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice,
    }));
    formData.append('items', JSON.stringify(itemsData));

    // Files
    if (files.image) formData.append('image', files.image);
    if (files.pdf) formData.append('pdf', files.pdf);
    if (files.waybill) formData.append('waybill', files.waybill);
    if (files.deliveryReceipt) formData.append('deliveryReceipt', files.deliveryReceipt);

    return formData;
  };

  // ─── CRUD Handlers ───

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.invoiceNumber || !form.vendorId) {
      toast.error('لطفاً فیلدهای الزامی را تکمیل کنید');
      return;
    }
    
    if (items.length === 0 || !items.some((i) => i.materialName.trim())) {
      toast.error('حداقل یک آیتم فاکتور با نام کالا وارد کنید');
      return;
    }
    
    setSubmitting(true);
    try {
      // آماده‌سازی آیتم‌ها
      const itemsData = items
        .filter(row => row.materialName.trim() !== '')
        .map((row) => ({
          materialName: row.materialName,
          quantity: row.quantity,
          unit: row.unit,
          unitPrice: row.unitPrice,
          totalPrice: row.totalPrice,
        }));
      
      // گرفتن همه فایل‌ها به صورت base64
      let imageBase64: string | null = null;
      let pdfBase64: string | null = null;
      let waybillBase64: string | null = null;
      let deliveryReceiptBase64: string | null = null;
      
      if (files.image) {
        imageBase64 = await fileToBase64(files.image);
      }
      if (files.pdf) {
        pdfBase64 = await fileToBase64(files.pdf);
      }
      if (files.waybill) {
        waybillBase64 = await fileToBase64(files.waybill);
      }
      if (files.deliveryReceipt) {
        deliveryReceiptBase64 = await fileToBase64(files.deliveryReceipt);
      }
      
      // ارسال به صورت JSON
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber,
          projectId: form.projectId || undefined,
          supplierId: form.vendorId,
          purchaseDate: form.date,
          dueDate: form.dueDate,
          totalAmount: itemsTotal,
          paidAmount: 0,
          description: form.description || undefined,
          invoiceImage: imageBase64,
          items: itemsData,
          paymentMethod: form.paymentMethod || null,
          settlementDate: form.settlementDate || null,
          taxAmount: parseFloat(form.taxAmount) || 0,
          pdfUrl: pdfBase64,
          waybillUrl: waybillBase64,
          deliveryReceiptUrl: deliveryReceiptBase64,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success('فاکتور با موفقیت ثبت شد');
        resetForm();
        setViewMode('list');
        loadData();
      } else {
        toast.error(result.error || 'خطا در ثبت فاکتور');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };
  
  // تابع کمکی برای تبدیل فایل به base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleEdit = (inv: Invoice) => {
    
    setEditingId(inv.id);
    setForm({
      invoiceNumber: inv.invoiceNumber,
      vendorId: inv.supplier?.id || '',
      projectId: inv.project?.id || '',
      date: inv.date ? inv.date.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMethod: inv.paymentMethod || '',
      settlementDate: inv.settlementDate ? inv.settlementDate.split('T')[0] : '',
      dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
      taxAmount: String(inv.taxAmount || 0),
      description: inv.description || '',
    });
    
    setItems(
      inv.items.length > 0
        ? inv.items.map((item) => ({
            _key: newRowKey(),
            materialId: item.materialId || undefined,
            materialName: item.materialName,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          }))
        : [createEmptyItemRow()]
    );
    
    // ✅ ست کردن previewها با نام فیلد درست
    setPreviews({
      image: inv.invoiceImage || null,  // ✅ تغییر
      pdf: inv.pdfUrl || null,
      waybill: inv.waybillUrl || null,
      deliveryReceipt: inv.deliveryReceiptUrl || null,
    });
    
    setFiles(emptyFiles);
    setViewMode('edit');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.invoiceNumber || !form.vendorId) {
      toast.error('لطفاً فیلدهای الزامی را تکمیل کنید');
      return;
    }
    
    setSubmitting(true);
    try {
      // آماده‌سازی آیتم‌ها
      const itemsData = items
        .filter(row => row.materialName.trim() !== '')
        .map((row) => ({
          materialName: row.materialName,
          quantity: row.quantity,
          unit: row.unit,
          unitPrice: row.unitPrice,
          totalPrice: row.totalPrice,
        }));
      
      // فقط اگر فایل جدید آپلود شده، تبدیل به base64 کن
      // در غیر این صورت، فیلد رو ارسال نکن تا سرور مقدار قبلی را حفظ کند
      let imageBase64: string | null = undefined as any;
      let pdfBase64: string | null = undefined as any;
      let waybillBase64: string | null = undefined as any;
      let deliveryReceiptBase64: string | null = undefined as any;
      
      if (files.image) {
        imageBase64 = await fileToBase64(files.image);
      }
      if (files.pdf) {
        pdfBase64 = await fileToBase64(files.pdf);
      }
      if (files.waybill) {
        waybillBase64 = await fileToBase64(files.waybill);
      }
      if (files.deliveryReceipt) {
        deliveryReceiptBase64 = await fileToBase64(files.deliveryReceipt);
      }
      
      // ساخت body با حذف فیلدهای undefined
      const updateBody: any = {
        id: editingId,
        invoiceNumber: form.invoiceNumber,
        projectId: form.projectId || undefined,
        supplierId: form.vendorId,
        purchaseDate: form.date,
        dueDate: form.dueDate,
        totalAmount: itemsTotal,
        paidAmount: 0,
        description: form.description || undefined,
        paymentMethod: form.paymentMethod || null,
        settlementDate: form.settlementDate || null,
        taxAmount: parseFloat(form.taxAmount) || 0,
        items: itemsData,
      };
      
      // فقط فیلدهایی که مقدار دارند را اضافه کن (undefined را ارسال نکن)
      if (imageBase64 !== undefined) updateBody.invoiceImage = imageBase64;
      if (pdfBase64 !== undefined) updateBody.pdfUrl = pdfBase64;
      if (waybillBase64 !== undefined) updateBody.waybillUrl = waybillBase64;
      if (deliveryReceiptBase64 !== undefined) updateBody.deliveryReceiptUrl = deliveryReceiptBase64;
      
      // ارسال به صورت JSON
      const response = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success('فاکتور با موفقیت ویرایش شد');
        setViewMode('list');
        setEditingId(null);
        resetForm();
        loadData();
      } else {
        toast.error(result.error || 'خطا در ویرایش فاکتور');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        toast.success(
          newStatus === 'approved'
            ? 'فاکتور تایید شد'
            : newStatus === 'rejected'
            ? 'فاکتور رد شد'
            : 'وضعیت فاکتور تغییر کرد'
        );
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در تغییر وضعیت');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('فاکتور حذف شد');
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا در حذف');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  // ─── Detail View ───

  const openDetail = (inv: Invoice) => {
    setDetailInvoice(inv);
    setViewMode('detail');
  };

  // ─── File Upload Area Component ───

  const renderFileUpload = (
    field: keyof FileState,
    label: string,
    icon: React.ReactNode,
    accept: string
  ) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <div className="border-2 border-dashed border-border/60 rounded-2xl p-4 text-center hover:border-primary/40 transition-colors cursor-pointer">
      {previews[field] ? (
  <div className="relative">
    {/* شرط تشخیص تصویر: هم فرمت data:image و هم فرمت base64 معمولی */}
    {(field === 'image' || field === 'waybill' || field === 'deliveryReceipt') && 
     (previews[field]?.startsWith('data:image') || 
      previews[field]?.startsWith('/9j/') ||  // فرمت JPEG base64
      previews[field]?.startsWith('iVBOR') || // فرمت PNG base64
      previews[field]?.match(/^[A-Za-z0-9+/=]+$/)) ? (  // base64 خالص
      <img
        src={previews[field]!.startsWith('data:') ? previews[field]! : `data:image/jpeg;base64,${previews[field]!}`}
        alt={label}
        className="max-h-32 mx-auto rounded-xl"
        onError={(e) => {
          console.error(`Error loading image for ${field}:`, e);
          e.currentTarget.style.display = 'none';
        }}
      />
    ) : (
      <div className="flex items-center justify-center gap-2 py-3">
        <Paperclip className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate">
          {files[field]?.name || 'فایل پیوست'}
        </span>
      </div>
    )}
    <button
      type="button"
      onClick={() => removeFile(field)}
      className="absolute top-1 right-1 w-6 h-6 gradient-danger text-white rounded-full flex items-center justify-center shadow-soft"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
): (
          <label className="cursor-pointer block">
            <div className="w-10 h-10 bg-muted/60 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground">انتخاب فایل</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">حداکثر ۵ مگابایت</p>
            <input
              type="file"
              accept={accept}
              onChange={(e) => handleFileChange(e, field)}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );

  // ─── Invoice Form Renderer ───

  const renderInvoiceForm = (isEdit: boolean = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleCreate} className="space-y-6 mt-4">
      {/* بخش اطلاعات اولیه */}
      <div>
        <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          اطلاعات اولیه
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">شماره فاکتور *</Label>
            <Input
              placeholder="فاکتور-۱۴۰۴-۰۱۳"
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
              className="input-modern rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">تاریخ خرید</Label>
            <ShamsiDatePicker
              value={form.date}
              onChange={(v) => setForm({ ...form, date: v })}
              placeholder="انتخاب تاریخ خرید"
              className="input-modern"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">فروشنده *</Label>
            <Select value={form.vendorId} onValueChange={(v) => setForm({ ...form, vendorId: v })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="انتخاب فروشنده" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">پروژه</Label>
            <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="انتخاب پروژه" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* بخش نحوه پرداخت */}
      <div>
        <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          نحوه پرداخت
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">روش پرداخت</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="انتخاب روش پرداخت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدی</SelectItem>
                <SelectItem value="check">چکی</SelectItem>
                <SelectItem value="credit">اعتباری</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">تاریخ تسویه</Label>
            <ShamsiDatePicker
              value={form.settlementDate}
              onChange={(v) => setForm({ ...form, settlementDate: v })}
              placeholder="انتخاب تاریخ تسویه"
              className="input-modern"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">سررسید پرداخت</Label>
            <ShamsiDatePicker
              value={form.dueDate}
              onChange={(v) => setForm({ ...form, dueDate: v })}
              placeholder="انتخاب سررسید پرداخت"
              className="input-modern"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* بخش آیتم‌های فاکتور */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-primary flex items-center gap-2">
            <Package className="w-4 h-4" />
            آیتم‌های فاکتور
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={addItemRow}
          >
            <Plus className="w-3.5 h-3.5" />
            افزودن ردیف
          </Button>
        </div>

        <div className="border border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right text-[11px] font-semibold min-w-[180px]">نام کالا *</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold min-w-[120px]">واحد</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold min-w-[100px]">تعداد</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold min-w-[130px]">قیمت واحد (ریال)</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold min-w-[140px]">مبلغ (ریال)</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row._key} className="hover:bg-muted/20">
                    {/* نام کالا با autocomplete */}
                    <TableCell className="relative p-2">
                      <div ref={(el) => { suggestionRefs.current[row._key] = el; }}>
                        <Input
                          placeholder="نام کالا..."
                          value={row.materialName}
                          onChange={(e) => handleMaterialSearch(row._key, e.target.value)}
                          onFocus={() => {
                            if (row.materialName.trim().length > 0) {
                              const filtered = materials.filter(
                                (m) => 
                                  m.name.includes(row.materialName.trim()) || 
                                  (m.code && m.code.toLowerCase().includes(row.materialName.trim().toLowerCase()))  // ✅ بررسی وجود m.code
                              ).slice(0, 8);
                              if (filtered.length > 0) {
                                setMaterialSuggestions((prev) => ({ ...prev, [row._key]: filtered }));
                                setShowSuggestions((prev) => ({ ...prev, [row._key]: true }));
                              }
                            }
                          }}
                          className="input-modern rounded-lg text-sm h-9"
                        />
                        {showSuggestions[row._key] && materialSuggestions[row._key]?.length > 0 && (
                          <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-popover border border-border rounded-xl shadow-soft-md max-h-40 overflow-y-auto scrollbar-thin">
                            {materialSuggestions[row._key].map((mat) => (
                              <button
                                key={mat.id}
                                type="button"
                                className="w-full text-right px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center justify-between"
                                onClick={() => selectMaterial(row._key, mat)}
                              >
                                <span>{mat.name}</span>
                                <span className="text-[10px] text-muted-foreground">{mat.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* واحد */}
                    <TableCell className="p-2">
                      <Select
                        value={row.unit}
                        onValueChange={(v) => updateItem(row._key, 'unit', v)}
                      >
                        <SelectTrigger className="rounded-lg h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_KEYS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {UNIT_LABELS[u]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* تعداد */}
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.quantity || ''}
                        onChange={(e) => updateItem(row._key, 'quantity', parseFloat(e.target.value) || 0)}
                        className="input-modern rounded-lg text-sm h-9"
                        dir="ltr"
                      />
                    </TableCell>

                    {/* قیمت واحد */}
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.unitPrice || ''}
                        onChange={(e) => updateItem(row._key, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="input-modern rounded-lg text-sm h-9"
                        dir="ltr"
                      />
                    </TableCell>

                    {/* مبلغ (auto-calculated) */}
                    <TableCell className="p-2">
                      <div className="h-9 px-3 flex items-center rounded-lg bg-muted/40 text-sm font-semibold" dir="ltr">
                        {toPersianDigits(row.totalPrice.toLocaleString())}
                      </div>
                    </TableCell>

                    {/* حذف */}
                    <TableCell className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => removeItemRow(row._key)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* جمع کل آیتم‌ها */}
          <div className="border-t border-border/60 bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">جمع کل آیتم‌ها:</span>
            <span className="text-sm font-bold" dir="ltr">
              {formatCurrency(itemsTotal)}
            </span>
          </div>
        </div>

        {/* مالیات */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">مالیات (ریال)</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.taxAmount}
              onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
              className="input-modern rounded-xl"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">مبلغ نهایی (با مالیات)</Label>
            <div className="h-10 px-3 flex items-center rounded-xl bg-primary/5 border border-primary/20 text-sm font-bold text-primary" dir="ltr">
              {formatCurrency(itemsTotal + parseFloat(form.taxAmount || '0'))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* بخش آپلود تصویر فاکتور — برجسته */}
      <div>
        <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          تصویر فاکتور
        </h4>
        <div className="border-2 border-dashed border-primary/30 rounded-2xl p-6 text-center hover:border-primary/50 transition-all cursor-pointer bg-primary/[0.02] hover:bg-primary/[0.04]">
          {previews.image ? (
            <div className="relative inline-block">
              <img
                src={previews.image!}
                alt="تصویر فاکتور"
                className="max-h-64 mx-auto rounded-xl shadow-soft"
              />
              <button
                type="button"
                onClick={() => removeFile('image')}
                className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer block py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">آپلود تصویر فاکتور</p>
              <p className="text-xs text-muted-foreground mt-1">فرمت‌های مجاز: JPG, PNG, WEBP — حداکثر ۵ مگابایت</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">برای انتخاب فایل کلیک کنید یا فایل را بکشید و رها کنید</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'image')}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      <Separator />

      {/* بخش سایر فایل‌ها */}
      <div>
        <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          سایر فایل‌ها
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {renderFileUpload('pdf', 'فایل PDF', <FileText className="w-3.5 h-3.5" />, '.pdf')}
          {renderFileUpload('waybill', 'عکس بارنامه', <Truck className="w-3.5 h-3.5" />, 'image/*,.pdf')}
          {renderFileUpload('deliveryReceipt', 'رسید تحویل', <Receipt className="w-3.5 h-3.5" />, 'image/*,.pdf')}
        </div>
      </div>

      <Separator />

      {/* بخش توضیحات */}
      <div>
        <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          توضیحات
        </h4>
        <Textarea
          placeholder="توضیحات فاکتور..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-modern rounded-xl resize-none"
          rows={3}
        />
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setViewMode('list');
            resetForm();
          }}
          className="rounded-xl px-6"
        >
          بازگشت به لیست
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="gradient-primary hover:opacity-90 rounded-xl shadow-soft px-8"
        >
          {submitting ? 'در حال ثبت...' : isEdit ? 'ویرایش فاکتور' : 'ثبت فاکتور'}
        </Button>
      </div>
    </form>
  );

  // ─── Detail View ───

  const renderDetailView = () => {
    if (!detailInvoice) return null;
    const inv = detailInvoice;
  
    // تابع کمکی برای تبدیل base64 به blob و دانلود
    const downloadFile = (base64Data: string, filename: string, mimeType: string) => {
      try {
        // حذف prefix اگر وجود داشته باشد
        let rawData = base64Data;
        if (base64Data.includes(',')) {
          rawData = base64Data.split(',')[1];
        }
        
        // تبدیل base64 به blob
        const byteCharacters = atob(rawData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        // ایجاد لینک دانلود
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        toast.error('خطا در دانلود فایل');
      }
    };
  
    // تابع تشخیص نوع فایل و دانلود
    const handleDownload = (data: string, type: 'image' | 'pdf' | 'waybill' | 'receipt') => {
      if (!data) return;
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filenameMap = {
        image: `invoice_${inv.invoiceNumber}_${timestamp}.jpg`,
        pdf: `invoice_${inv.invoiceNumber}_${timestamp}.pdf`,
        waybill: `waybill_${inv.invoiceNumber}_${timestamp}.jpg`,
        receipt: `delivery_receipt_${inv.invoiceNumber}_${timestamp}.jpg`,
      };
      const mimeTypeMap = {
        image: 'image/jpeg',
        pdf: 'application/pdf',
        waybill: 'image/jpeg',
        receipt: 'image/jpeg',
      };
      
      downloadFile(data, filenameMap[type], mimeTypeMap[type]);
    };
  
    return (
      <div className="space-y-5 mt-4">
        {/* Header info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">شماره فاکتور</p>
            <p className="text-sm font-bold">{toPersianDigits(inv.invoiceNumber)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">فروشنده</p>
            <p className="text-sm font-bold">{inv.supplier?.companyName || '---'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">پروژه</p>
            <p className="text-sm font-bold">{inv.project?.name || '---'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">تاریخ</p>
            <p className="text-sm">{formatDate(inv.date)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">روش پرداخت</p>
            <p className="text-sm">
              {inv.paymentMethod ? PAYMENT_METHOD_LABELS[inv.paymentMethod] || inv.paymentMethod : '---'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">وضعیت</p>
            <Badge className={`text-[10px] font-semibold ${STATUS_COLOR_MAP[inv.status] || ''}`}>
              {INVOICE_STATUS_LABELS[inv.status] || 'نامشخص'}
            </Badge>
          </div>
          {inv.settlementDate && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">تاریخ تسویه</p>
              <p className="text-sm">{formatDate(inv.settlementDate)}</p>
            </div>
          )}
          {inv.dueDate && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">سررسید پرداخت</p>
              <p className="text-sm">{formatDate(inv.dueDate)}</p>
            </div>
          )}
          {inv.approvedBy && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">تاییدکننده</p>
              <p className="text-sm">{inv.approvedBy.name}</p>
            </div>
          )}
        </div>
  
        <Separator />
  
        {/* Items table */}
        {(inv.items || []).length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              آیتم‌های فاکتور
            </h4>
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-right text-[11px] font-semibold">نام کالا</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold">واحد</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold">تعداد</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold">قیمت واحد</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold">مبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(inv.items || []).map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm font-medium">{item.materialName}</TableCell>
                      <TableCell className="text-sm">{UNIT_LABELS[item.unit] || '—'}</TableCell>
                      <TableCell className="text-sm" dir="ltr">{toPersianDigits(item.quantity)}</TableCell>
                      <TableCell className="text-sm" dir="ltr">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-sm font-semibold" dir="ltr">{formatCurrency(item.totalPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">جمع کل:</span>
              <span className="text-sm font-bold" dir="ltr">{formatCurrency(inv.totalAmount)}</span>
            </div>
            {inv.taxAmount > 0 && (
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-muted-foreground">مالیات:</span>
                <span className="text-sm" dir="ltr">{formatCurrency(inv.taxAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-2 pt-1 border-t border-border/60">
              <span className="text-xs font-bold">مبلغ نهایی:</span>
              <span className="text-sm font-bold text-primary" dir="ltr">
                {formatCurrency(inv.totalAmount + inv.taxAmount)}
              </span>
            </div>
          </div>
        )}
  
        {/* Files with Download */}
        {(inv.invoiceImage || inv.pdfUrl || inv.waybillUrl || inv.deliveryReceiptUrl) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                فایل‌های پیوست
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {inv.invoiceImage && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">تصویر فاکتور</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-blue-50"
                        onClick={() => window.open(
                          inv.invoiceImage?.startsWith('data:') ? inv.invoiceImage : `data:image/jpeg;base64,${inv.invoiceImage}`,
                          '_blank'
                        )}
                        title="مشاهده"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-green-50"
                        onClick={() => handleDownload(inv.invoiceImage!, 'image')}
                        title="دانلود"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {inv.pdfUrl && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">سند PDF</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-blue-50"
                        onClick={() => window.open(
                          inv.pdfUrl?.startsWith('data:') || inv.pdfUrl?.startsWith('%PDF') ? inv.pdfUrl : `data:application/pdf;base64,${inv.pdfUrl}`,
                          '_blank'
                        )}
                        title="مشاهده"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-green-50"
                        onClick={() => handleDownload(inv.pdfUrl!, 'pdf')}
                        title="دانلود"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {inv.waybillUrl && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">بارنامه</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-blue-50"
                        onClick={() => window.open(
                          inv.waybillUrl?.startsWith('data:') ? inv.waybillUrl : `data:image/jpeg;base64,${inv.waybillUrl}`,
                          '_blank'
                        )}
                        title="مشاهده"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-green-50"
                        onClick={() => handleDownload(inv.waybillUrl!, 'waybill')}
                        title="دانلود"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {inv.deliveryReceiptUrl && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">رسید تحویل</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-blue-50"
                        onClick={() => window.open(
                          inv.deliveryReceiptUrl?.startsWith('data:') ? inv.deliveryReceiptUrl : `data:image/jpeg;base64,${inv.deliveryReceiptUrl}`,
                          '_blank'
                        )}
                        title="مشاهده"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-green-50"
                        onClick={() => handleDownload(inv.deliveryReceiptUrl!, 'receipt')}
                        title="دانلود"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
  
        {/* Description */}
        {inv.description && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                توضیحات
              </h4>
              <p className="text-sm text-muted-foreground leading-7">{inv.description}</p>
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── Main Render ───

  // ─── حالت صفحه کامل: ثبت فاکتور جدید ───
  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        {/* هدر صفحه ثبت فاکتور */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-xl hover:bg-muted"
              onClick={() => { setViewMode('list'); resetForm(); }}
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </Button>
            <div>
              <h3 className="text-xl font-extrabold">ثبت فاکتور جدید</h3>
              <p className="text-sm text-muted-foreground">ورود اطلاعات فاکتور و آپلود تصویر</p>
            </div>
          </div>
        </div>

        {/* فرم کامل در کارت */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            {renderInvoiceForm(false)}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── حالت صفحه کامل: ویرایش فاکتور ───
  if (viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-xl hover:bg-muted"
              onClick={() => { setViewMode('list'); resetForm(); }}
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </Button>
            <div>
              <h3 className="text-xl font-extrabold">ویرایش فاکتور</h3>
              <p className="text-sm text-muted-foreground">اصلاح اطلاعات فاکتور {editingId ? toPersianDigits(form.invoiceNumber) : ''}</p>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            {renderInvoiceForm(true)}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── حالت صفحه کامل: مشاهده جزئیات فاکتور ───
  if (viewMode === 'detail' && detailInvoice) {
    const inv = detailInvoice;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-xl hover:bg-muted"
              onClick={() => setViewMode('list')}
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </Button>
            <div>
              <h3 className="text-xl font-extrabold">
                جزئیات فاکتور {toPersianDigits(inv.invoiceNumber)}
              </h3>
              <p className="text-sm text-muted-foreground">مشاهده اطلاعات کامل فاکتور</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => handleEdit(inv)}
            >
              <Pencil className="w-4 h-4" />
              ویرایش
            </Button>
            {inv.status === 'pending' && (
              <>
                <Button
                  className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleStatusChange(inv.id, 'approved')}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  تایید
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50"
                  onClick={() => handleStatusChange(inv.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4" />
                  رد
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            {renderDetailView()}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── حالت لیست (پیش‌فرض) ───
  return (
    <div className="space-y-6 p-8">
      {/* هدر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">مدیریت فاکتورها</h3>
          <p className="text-sm text-muted-foreground">ثبت و مشاهده فاکتورهای خرید مصالح</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="جستجوی شماره فاکتور..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 input-modern rounded-xl"
            />
          </div>
          <Button
            className="gap-2 gradient-primary hover:opacity-90 transition-opacity shadow-soft rounded-xl"
            onClick={() => {
              resetForm();
              setViewMode('create');
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">فاکتور جدید</span>
          </Button>
        </div>
      </div>

      {/* جدول فاکتورها */}
      <Card className="border-0 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right text-xs font-semibold">شماره فاکتور</TableHead>
                  <TableHead className="text-right text-xs font-semibold">فروشنده</TableHead>
                  <TableHead className="text-right text-xs font-semibold">پروژه</TableHead>
                  <TableHead className="text-right text-xs font-semibold">مبلغ کل</TableHead>
                  <TableHead className="text-right text-xs font-semibold">تاریخ</TableHead>
                  <TableHead className="text-right text-xs font-semibold">روش پرداخت</TableHead>
                  <TableHead className="text-right text-xs font-semibold">وضعیت</TableHead>
                  <TableHead className="text-right text-xs font-semibold">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted/50 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      فاکتوری یافت نشد
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-sm">
                        {toPersianDigits(inv.invoiceNumber)}
                      </TableCell>
                      <TableCell className="text-sm">{inv.supplier?.companyName || '---'}</TableCell>  
                      <TableCell className="text-sm">{inv.project?.name || '---'}</TableCell>
                      <TableCell className="text-sm font-semibold" dir="rtl">
                        {formatCurrency(inv.totalAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(inv.date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.paymentMethod
                          ? PAYMENT_METHOD_LABELS[inv.paymentMethod] || inv.paymentMethod
                          : '---'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT_MAP[inv.status] || 'secondary'}
                          className={`text-[10px] font-semibold ${STATUS_COLOR_MAP[inv.status] || ''}`}
                        >
                          {INVOICE_STATUS_LABELS[inv.status] || 'نامشخص'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* View detail */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-sky-50 hover:text-sky-600"
                            onClick={() => openDetail(inv)}
                            title="مشاهده جزئیات"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => handleEdit(inv)}
                            title="ویرایش"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          {/* Approve / Reject */}
                          {inv.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                                onClick={() => handleStatusChange(inv.id, 'approved')}
                                title="تایید"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg hover:bg-amber-50 hover:text-amber-600"
                                onClick={() => handleStatusChange(inv.id, 'rejected')}
                                title="رد"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف فاکتور</AlertDialogTitle>
                                <AlertDialogDescription>
                                  آیا از حذف فاکتور &laquo;{toPersianDigits(inv.invoiceNumber)}&raquo; اطمینان دارید؟
                                  این عمل فقط توسط مدیران قابل انجام است و قابل بازگشت نیست.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(inv.id)}
                                  className="bg-rose-600 hover:bg-rose-700"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
      <div className="flex items-center justify-between gap-4 mt-4 px-4 py-3 border-t rounded-xl bg-white/50">
        <div className="text-sm text-muted-foreground">
          صفحه {currentPage} از {totalPages} (کل {totalItems} فاکتور)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-xl"
          >
            قبلی
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-xl"
          >
            بعدی
          </Button>
        </div>
      </div>
    )}
  
    </div>
  );
}
