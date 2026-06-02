// ─── توابع کمکی لاگ حسابرسی ───
// مدل AuditLog و User و Material و Transaction حذف شده‌اند
// تمام عملیات‌ها به صورت no-op یا console.log اجرا می‌شوند

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE';
type AuditEntity = 'User' | 'Material' | 'MaterialCategory' | 'Project' | 'Vendor' | 'Invoice' | 'Transaction' | 'Notification';

export async function createAuditLog(params: {
  userId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  // مدل AuditLog حذف شده — فقط لاگ کنسول
  console.log('[AUDIT]', JSON.stringify({
    userId: params.userId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    details: params.details,
    timestamp: new Date().toISOString(),
  }));
}

// ─── توابع کمکی نوتیفیکیشن ───

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  link?: string;
}) {
  try {
    const { db } = await import('./db');
    await db.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        link: params.link,
      },
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// ─── هشدار موجودی کم ───
// مدل Material و Transaction حذف شده — عملیات غیرفعال

export async function checkLowStock(_materialId: string) {
  // مدل‌های Material و Transaction وجود ندارند — بررسی موجودی غیرفعال
  return;
}
