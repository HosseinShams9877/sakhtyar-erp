// ─── API مستندات (OpenAPI 3.0) ───
import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.0.3',
  info: { title: 'ساخت‌یار مصالح عمرانی', version: '1.0.0', description: 'مستندات API سامانه مدیریت یکپارچه مصالح عمرانی' },
  servers: [{ url: '/api', description: 'سرور فعلی' }],
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'next-auth.session-token' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
      Pagination: { type: 'object', properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, totalItems: { type: 'integer' }, totalPages: { type: 'integer' } } },
      User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string', enum: ['ADMIN','PROJECT_MANAGER','CONTRACTOR_REP','WAREHOUSE_KEEPER','RESIDENT_ENGINEER'] }, phone: { type: 'string' }, isActive: { type: 'boolean' }, createdAt: { type: 'string' } } },
      Material: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, code: { type: 'string' }, categoryId: { type: 'string' }, unit: { type: 'string' }, minStock: { type: 'number' }, description: { type: 'string' } } },
      Project: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, code: { type: 'string' }, location: { type: 'string' }, status: { type: 'string', enum: ['ACTIVE','COMPLETED','ON_HOLD','CANCELLED'] }, budget: { type: 'number' } } },
      Vendor: { type: 'object', properties: { id: { type: 'string' }, companyName: { type: 'string' }, contactName: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, isActive: { type: 'boolean' } } },
      Invoice: { type: 'object', properties: { id: { type: 'string' }, invoiceNumber: { type: 'string' }, totalAmount: { type: 'number' }, taxAmount: { type: 'number' }, status: { type: 'string', enum: ['PENDING','APPROVED','REJECTED','PAID'] } } },
      Transaction: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string', enum: ['PURCHASE','DELIVERY','RETURN','ADJUSTMENT'] }, quantity: { type: 'number' }, unitPrice: { type: 'number' }, totalPrice: { type: 'number' } } },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    '/users': { get: { summary: 'دریافت لیست کاربران', tags: ['کاربران'], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'pageSize', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'لیست کاربران با صفحه‌بندی' }, 401: { description: 'عدم احراز هویت' }, 403: { description: 'عدم مجوز' } } }, post: { summary: 'ایجاد کاربر جدید', tags: ['کاربران'], responses: { 201: { description: 'کاربر ایجاد شد' }, 400: { description: 'داده نامعتبر' } } }, put: { summary: 'بروزرسانی کاربر', tags: ['کاربران'], responses: { 200: { description: 'کاربر بروزرسانی شد' } } }, delete: { summary: 'حذف کاربر', tags: ['کاربران'], responses: { 200: { description: 'کاربر غیرفعال شد' } } } },
    '/materials': { get: { summary: 'دریافت لیست مصالح', tags: ['مصالح'], parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'categoryId', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'لیست مصالح' } } }, post: { summary: 'ایجاد مصالح جدید', tags: ['مصالح'], responses: { 201: { description: 'مصالح ایجاد شد' } } } },
    '/projects': { get: { summary: 'دریافت لیست پروژه‌ها', tags: ['پروژه‌ها'], parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'لیست پروژه‌ها' } } }, post: { summary: 'ایجاد پروژه جدید', tags: ['پروژه‌ها'], responses: { 201: { description: 'پروژه ایجاد شد' } } } },
    '/vendors': { get: { summary: 'دریافت لیست فروشندگان', tags: ['فروشندگان'], responses: { 200: { description: 'لیست فروشندگان' } } }, post: { summary: 'ایجاد فروشنده جدید', tags: ['فروشندگان'], responses: { 201: { description: 'فروشنده ایجاد شد' } } } },
    '/invoices': { get: { summary: 'دریافت لیست فاکتورها', tags: ['فاکتورها'], parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'projectId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'لیست فاکتورها' } } }, post: { summary: 'ایجاد فاکتور جدید', tags: ['فاکتورها'], responses: { 201: { description: 'فاکتور ایجاد شد' } } } },
    '/transactions': { get: { summary: 'دریافت لیست تراکنش‌ها', tags: ['تراکنش‌ها'], parameters: [{ name: 'type', in: 'query', schema: { type: 'string' } }, { name: 'projectId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'لیست تراکنش‌ها' } } }, post: { summary: 'ایجاد تراکنش جدید', tags: ['تراکنش‌ها'], responses: { 201: { description: 'تراکنش ایجاد شد' } } } },
    '/material-categories': { get: { summary: 'دریافت لیست دسته‌بندی‌ها', tags: ['دسته‌بندی مصالح'], responses: { 200: { description: 'لیست دسته‌بندی‌ها' } } } },
    '/dashboard': { get: { summary: 'دریافت آمار داشبورد', tags: ['داشبورد'], responses: { 200: { description: 'آمار و نمودارها' } } } },
    '/audit-logs': { get: { summary: 'دریافت لاگ‌های حسابرسی', tags: ['حسابرسی'], parameters: [{ name: 'entity', in: 'query', schema: { type: 'string' } }, { name: 'action', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'لیست لاگ‌ها' } } } },
    '/notifications': { get: { summary: 'دریافت نوتیفیکیشن‌ها', tags: ['نوتیفیکیشن'], responses: { 200: { description: 'لیست نوتیفیکیشن‌ها' } } }, put: { summary: 'علامت‌گذاری خوانده‌شده', tags: ['نوتیفیکیشن'], responses: { 200: { description: 'عملیات موفق' } } } },
    '/upload': { post: { summary: 'آپلود فایل', tags: ['آپلود'], responses: { 201: { description: 'فایل آپلود شد' } } } },
    '/health': { get: { summary: 'بررسی سلامت سیستم', tags: ['سیستم'], security: [], responses: { 200: { description: 'سیستم سالم است' }, 503: { description: 'سیستم ناسالم' } } } },
    '/backup': { get: { summary: 'لیست پشتیبان‌ها', tags: ['پشتیبان‌گیری'], responses: { 200: { description: 'لیست فایل‌های پشتیبان' } } }, post: { summary: 'ایجاد پشتیبان', tags: ['پشتیبان‌گیری'], responses: { 201: { description: 'پشتیبان ایجاد شد' } } } },
    '/metrics': { get: { summary: 'متریک‌های سیستم', tags: ['مانیتورینگ'], parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'prometheus'] } }], responses: { 200: { description: 'متریک‌ها' } } } },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
