// ─── شمای اعتبارسنجی Zod برای تمام موجودیت‌ها ───
// تمام ورودی‌های API با این شماها اعتبارسنجی می‌شوند

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// نقش‌های سیستم (هماهنگ با RBAC)
// ═══════════════════════════════════════════════════════════
export const SYSTEM_ROLES = [
  'SUPER_MANAGER',
  'PROJECT_MANAGER',
  'PURCHASER',
  'WAREHOUSE_KEEPER',
  'ADMIN',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

// ─── شمای کاربر ───
// نحوه ورود: کد ملی = یوزرنیم | شماره موبایل = پسورد (خودکار)
export const createUserSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ حرف باشد').max(100),
  nationalCode: z.string().regex(/^\d{10}$/, 'کد ملی باید ۱۰ رقم باشد'),
  mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است (مثال: 09121234567)'),
  email: z.string().email('ایمیل نامعتبر است').optional().or(z.literal('')),
  roleId: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  nationalCode: z.string().regex(/^\d{10}$/, 'کد ملی باید ۱۰ رقم باشد').optional(),
  mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر').optional(),
  email: z.string().email().optional().or(z.literal('')),
  roleId: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ─── شمای دسته‌بندی مصالح ───
export const createCategorySchema = z.object({
  name: z.string().min(2, 'نام دسته‌بندی الزامی است').max(100),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
});

// ─── شمای مصالح ───
export const createMaterialSchema = z.object({
  name: z.string().min(2, 'نام مصالح الزامی است').max(200),
  code: z.string().min(1, 'کد مصالح الزامی است').max(50),
  categoryId: z.string().min(1, 'دسته‌بندی الزامی است'),
  unit: z.enum(['KILOGRAM', 'TON', 'METER', 'SQUARE_METER', 'CUBIC_METER', 'NUMBER', 'LITER', 'BAG', 'ROLL', 'PIECE', 'BRANCH', 'PACKET', 'SET']),
  minStock: z.number().min(0).optional().default(0),
  description: z.string().optional(),
});

export const updateMaterialSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  code: z.string().min(1).max(50).optional(),
  categoryId: z.string().min(1).optional(),
  unit: z.enum(['KILOGRAM', 'TON', 'METER', 'SQUARE_METER', 'CUBIC_METER', 'NUMBER', 'LITER', 'BAG', 'ROLL', 'PIECE', 'BRANCH', 'PACKET', 'SET']).optional(),
  minStock: z.number().min(0).optional(),
  description: z.string().optional(),
});

// ─── شمای پروژه ───
export const createProjectSchema = z.object({
  name: z.string().min(2, 'نام پروژه الزامی است').max(200),
  code: z.string().min(1, 'کد پروژه الزامی است').max(50),
  location: z.string().optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional().default('active'),
  budget: z.number().min(0).optional().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  managerId: z.string().optional(),
  purchaseResponsibleId: z.string().optional(),
  warehouseKeeperId: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  code: z.string().min(1).max(50).optional(),
  location: z.string().optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
  budget: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  managerId: z.string().optional(),
  purchaseResponsibleId: z.string().optional(),
  warehouseKeeperId: z.string().optional(),
});

// ─── شمای فروشنده/تامین‌کننده ───
export const createVendorSchema = z.object({
  companyName: z.string().min(2, 'نام فروشگاه الزامی است').max(200),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email('ایمیل نامعتبر').optional().or(z.literal('')),
  address: z.string().optional(),
  taxId: z.string().optional(),
  bankAccount: z.string().optional(),
  settlementTerms: z.string().optional(),
  debtCeiling: z.number().min(0).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateVendorSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  taxId: z.string().optional(),
  bankAccount: z.string().optional(),
  settlementTerms: z.string().optional(),
  debtCeiling: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ─── شمای فاکتور ───
export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'شماره فاکتور الزامی است'),
  vendorId: z.string().min(1, 'فروشنده الزامی است'),
  projectId: z.string().optional(),
  totalAmount: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  description: z.string().optional(),
  date: z.string().optional(),
  paymentMethod: z.enum(['cash', 'check', 'credit']).optional(),
  settlementDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  vendorId: z.string().min(1).optional(),
  projectId: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'paid', 'delivered']).optional(),
  approvedById: z.string().optional(),
  paymentMethod: z.enum(['cash', 'check', 'credit']).optional(),
  settlementDate: z.string().optional(),
  dueDate: z.string().optional(),
  pdfUrl: z.string().optional(),
  waybillUrl: z.string().optional(),
  deliveryReceiptUrl: z.string().optional(),
});

// ─── شمای آیتم فاکتور ───
export const invoiceItemSchema = z.object({
  materialId: z.string().optional(),
  materialName: z.string().min(1, 'نام کالا الزامی است'),
  unit: z.string().min(1, 'واحد الزامی است'),
  quantity: z.number().positive('تعداد باید مثبت باشد'),
  unitPrice: z.number().min(0, 'قیمت باید غیرمنفی باشد'),
  totalPrice: z.number().min(0),
});

export const createInvoiceWithItemsSchema = z.object({
  invoice: createInvoiceSchema,
  items: z.array(invoiceItemSchema).min(1, 'حداقل یک آیتم الزامی است'),
});

// ─── شمای تراکنش ───
export const createTransactionSchema = z.object({
  materialId: z.string().min(1, 'مصالح الزامی است'),
  projectId: z.string().min(1, 'پروژه الزامی است'),
  supplierId: z.string().optional(),
  purchaseId: z.string().optional(),
  type: z.enum(['PURCHASE', 'DELIVERY', 'RETURN', 'ADJUSTMENT', 'CONSUMPTION']),
  quantity: z.number().positive('مقدار باید مثبت باشد'),
  unitPrice: z.number().min(0).optional().default(0),
  totalPrice: z.number().min(0).optional().default(0),
  description: z.string().optional(),
  deliveryPerson: z.string().optional(),
  receivedBy: z.string().optional(),
  date: z.string().optional(),
  warehouseConfirmed: z.boolean().optional().default(false),
  actualQuantity: z.number().optional(),
  discrepancy: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  materialId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  supplierId: z.string().optional(),
  purchaseId: z.string().optional(),
  type: z.enum(['PURCHASE', 'DELIVERY', 'RETURN', 'ADJUSTMENT', 'CONSUMPTION']).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  description: z.string().optional(),
  deliveryPerson: z.string().optional(),
  receivedBy: z.string().optional(),
  date: z.string().optional(),
  warehouseConfirmed: z.boolean().optional(),
  actualQuantity: z.number().optional(),
  discrepancy: z.string().optional(),
});

// ─── شمای پرداخت ───
export const createPaymentSchema = z.object({
  amount: z.number().positive('مبلغ باید مثبت باشد'),
  method: z.enum(['CASH', 'CHECK', 'CREDIT']),
  purchaseId: z.string().min(1, 'فاکتور الزامی است'),
  dueDate: z.string().optional(),
  checkNumber: z.string().optional(),
  bankName: z.string().optional(),
  note: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  method: z.enum(['CASH', 'CHECK', 'CREDIT']).optional(),
  status: z.enum(['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().optional(),
  checkNumber: z.string().optional(),
  bankName: z.string().optional(),
  note: z.string().optional(),
});

// ─── شمای هشدار ───
export const createAlertSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
  message: z.string().min(1, 'پیام الزامی است'),
  type: z.enum(['info', 'warning', 'danger']).optional().default('info'),
  category: z.enum(['due_date', 'low_stock', 'payment', 'system', 'general']).optional().default('general'),
  triggerDate: z.string(),
  projectId: z.string().optional(),
  purchaseId: z.string().optional(),
  userId: z.string().optional(),
});

// ─── تایپ‌های استخراج‌شده ───
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
