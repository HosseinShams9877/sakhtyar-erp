import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

//GET:Api/Notification
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || '';
    
    // ─── اگر کاربر انباردار است ───
    if (auth.role === 'WAREHOUSE_KEEPER') {
      // پیدا کردن roleId نقش WAREHOUSE_KEEPER
      const warehouseRole = await db.role.findFirst({
        where: { name: 'WAREHOUSE_KEEPER' },
        select: { id: true }
      });
    
      if (!warehouseRole) {
        return NextResponse.json({ notifications: [], unreadCount: 0 });
      }
    
      // شرط: فقط نوتیفیکیشن‌هایی که برای نقش WAREHOUSE_KEEPER ارسال شده
      const where: any = {
        roleId: warehouseRole.id
      };
    
      // اگر projectId از هدر اومده، فیلتر کن
      if (projectId && projectId !== 'all') {
        where.projectId = projectId;
      }
    
      const storedNotifications = await db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    
      const allNotifications = storedNotifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
        projectId: n.projectId,
      }));
    
      const unreadCount = allNotifications.filter(n => !n.isRead).length;
    
      return NextResponse.json({ notifications: allNotifications.slice(0, 50), unreadCount });
    }
    
// ─── اگر کاربر مسئول خرید است (PURCHASER) ───
if (auth.role === 'PURCHASER') {
  // پیدا کردن roleId نقش PURCHASER (سیستمی، نه برای هر کاربر)
  const purchaserRole = await db.role.findFirst({
    where: { name: 'PURCHASER' },
    select: { id: true }
  });

  if (!purchaserRole) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  // شرط: فقط نوتیفیکیشن‌هایی که برای نقش PURCHASER ارسال شده
  const where: any = {
    roleId: purchaserRole.id  // ✅ فقط roleId، نه userId
  };

  // اگر projectId از هدر اومده، فیلتر کن
  if (projectId && projectId !== 'all') {
    where.projectId = projectId;
  }

  const storedNotifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const allNotifications = storedNotifications.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
    projectId: n.projectId,
  }));

  const unreadCount = allNotifications.filter(n => !n.isRead).length;

  return NextResponse.json({ notifications: allNotifications.slice(0, 50), unreadCount });
}

//مدیر پروژه
if (auth.role === 'PROJECT_MANAGER') {
  // گرفتن projectId از هدر (از طریق query parameter)
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId') || '';
  
  // تعیین پروژه‌های هدف
  let targetProjectIds: string[] = [];
  
  if (projectId && projectId !== 'all') {
    // اگر پروژه خاصی انتخاب شده، فقط همان پروژه
    targetProjectIds = [projectId];
  } else {
    // اگر پروژه‌ای انتخاب نشده، همه پروژه‌های فعال
    const allProjects = await db.project.findMany({
      where: { status: 'active' },
      select: { id: true }
    });
    targetProjectIds = allProjects.map(p => p.id);
  }
  
  const today = todayISO();
  const threeDaysLater = addDaysISO(3);
  const weekLater = addDaysISO(7);
  
  // پیدا کردن roleId نقش PROJECT_MANAGER
  const projectManagerRole = await db.role.findFirst({
    where: { name: 'PROJECT_MANAGER' },
    select: { id: true }
  });
  
  // شرط جستجو برای نوتیفیکیشن‌های ذخیره شده
  const storedNotificationsWhere: any = {
    OR: [
      { userId: auth.userId },  // نوتیفیکیشن‌های مستقیم به این کاربر
      { roleId: projectManagerRole?.id },  // نوتیفیکیشن‌های مربوط به نقش PROJECT_MANAGER (مثل مغایرت‌ها)
    ]
  };
  
  // اگر projectId خاصی انتخاب شده، فقط نوتیفیکیشن‌های همون پروژه
  if (projectId && projectId !== 'all') {
    storedNotificationsWhere.projectId = projectId;
  }
  
  const storedNotifications = await db.notification.findMany({
    where: storedNotificationsWhere,
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  
  const unpaidPurchases = await db.purchase.findMany({
    where: {
      status: { not: 'paid' },
      projectId: { in: targetProjectIds },
    },
    include: {
      supplier: { select: { companyName: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  });
  
  const liveNotifications: any[] = [];
  
  for (const p of unpaidPurchases) {
    const dueDateStr = p.dueDate.toISOString().split('T')[0];
    const remaining = p.totalAmount - p.paidAmount;
    if (remaining <= 0) continue;
    
    if (dueDateStr < today) {
      const daysOverdue = Math.floor((new Date(today).getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24));
      liveNotifications.push({
        id: `overdue-${p.id}`,
        title: '⚠️ سررسید گذشته',
        message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysOverdue} روز معوقه — پروژه: ${p.project?.name}`,
        type: 'error',
        isRead: false,
        link: `/invoices/${p.id}`,
        createdAt: p.dueDate.toISOString(),
        projectId: p.projectId,
        projectName: p.project?.name,
      });
    } else if (dueDateStr <= threeDaysLater) {
      const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      liveNotifications.push({
        id: `urgent-${p.id}`,
        title: '⏰ سررسید نزدیک',
        message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft === 0 ? 'امروز' : `${daysLeft} روز مانده`} — پروژه: ${p.project?.name}`,
        type: 'warning',
        isRead: false,
        link: `/invoices/${p.id}`,
        createdAt: new Date().toISOString(),
        projectId: p.projectId,
        projectName: p.project?.name,
      });
    } else if (dueDateStr <= weekLater) {
      const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      liveNotifications.push({
        id: `upcoming-${p.id}`,
        title: '📅 یادآوری سررسید',
        message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft} روز مانده — پروژه: ${p.project?.name}`,
        type: 'info',
        isRead: false,
        link: `/invoices/${p.id}`,
        createdAt: new Date().toISOString(),
        projectId: p.projectId,
        projectName: p.project?.name,
      });
    }
  }
  
  const allNotifications = [
    ...liveNotifications,
    ...storedNotifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
      projectId: n.projectId,
      projectName: null,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const unreadCount = allNotifications.filter(n => !n.isRead).length;
  
  return NextResponse.json({ notifications: allNotifications.slice(0, 50), unreadCount });
}
    // ─── برای مدیر کل ───
    if (auth.role === 'SUPER_MANAGER') {
      const allProjects = await db.project.findMany({
        where: { status: 'active' },
        select: { id: true }
      });
      const targetProjectIds = allProjects.map(p => p.id);
      
      const today = todayISO();
      const threeDaysLater = addDaysISO(3);
      const weekLater = addDaysISO(7);
      
      const storedNotifications = await db.notification.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      
      const unpaidPurchases = await db.purchase.findMany({
        where: {
          status: { not: 'paid' },
          projectId: { in: targetProjectIds },
        },
        include: {
          supplier: { select: { companyName: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      });
      
      const liveNotifications: any[] = [];
      
      for (const p of unpaidPurchases) {
        const dueDateStr = p.dueDate.toISOString().split('T')[0];
        const remaining = p.totalAmount - p.paidAmount;
        if (remaining <= 0) continue;
        
        if (dueDateStr < today) {
          const daysOverdue = Math.floor((new Date(today).getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24));
          liveNotifications.push({
            id: `overdue-${p.id}`,
            title: '⚠️ سررسید گذشته',
            message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysOverdue} روز معوقه — پروژه: ${p.project?.name}`,
            type: 'error',
            isRead: false,
            link: `/invoices/${p.id}`,
            createdAt: p.dueDate.toISOString(),
            projectId: p.projectId,
            projectName: p.project?.name,
          });
        } else if (dueDateStr <= threeDaysLater) {
          const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
          liveNotifications.push({
            id: `urgent-${p.id}`,
            title: '⏰ سررسید نزدیک',
            message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft === 0 ? 'امروز' : `${daysLeft} روز مانده`} — پروژه: ${p.project?.name}`,
            type: 'warning',
            isRead: false,
            link: `/invoices/${p.id}`,
            createdAt: new Date().toISOString(),
            projectId: p.projectId,
            projectName: p.project?.name,
          });
        } else if (dueDateStr <= weekLater) {
          const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
          liveNotifications.push({
            id: `upcoming-${p.id}`,
            title: '📅 یادآوری سررسید',
            message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft} روز مانده — پروژه: ${p.project?.name}`,
            type: 'info',
            isRead: false,
            link: `/invoices/${p.id}`,
            createdAt: new Date().toISOString(),
            projectId: p.projectId,
            projectName: p.project?.name,
          });
        }
      }
      
      const allNotifications = [
        ...liveNotifications,
        ...storedNotifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          link: n.link,
          createdAt: n.createdAt.toISOString(),
          projectId: null,
          projectName: null,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const unreadCount = allNotifications.filter(n => !n.isRead).length;
      
      return NextResponse.json({ notifications: allNotifications.slice(0, 50), unreadCount });
    }
    
    // ─── برای سایر نقش‌ها (PROJECT_MANAGER, ADMIN) ───
    const today = todayISO();
    const threeDaysLater = addDaysISO(3);
    const weekLater = addDaysISO(7);
    
    const userProjects = await db.userProject.findMany({
      where: { userId: auth.userId },
      select: { projectId: true },
    });
    const accessibleProjectIds = userProjects.map(up => up.projectId);
    
    const targetProjectIds = projectId ? [projectId] : accessibleProjectIds;
    
    if (projectId && !accessibleProjectIds.includes(projectId)) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
    
    const storedNotifications = await db.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    
    const unpaidPurchases = await db.purchase.findMany({
      where: {
        status: { not: 'paid' },
        projectId: { in: targetProjectIds },
      },
      include: {
        supplier: { select: { companyName: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });
    
    const liveNotifications: any[] = [];
    
    for (const p of unpaidPurchases) {
      const dueDateStr = p.dueDate.toISOString().split('T')[0];
      const remaining = p.totalAmount - p.paidAmount;
      if (remaining <= 0) continue;
      
      if (dueDateStr < today) {
        const daysOverdue = Math.floor((new Date(today).getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24));
        liveNotifications.push({
          id: `overdue-${p.id}`,
          title: '⚠️ سررسید گذشته',
          message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysOverdue} روز معوقه — پروژه: ${p.project?.name}`,
          type: 'error',
          isRead: false,
          link: `/invoices/${p.id}`,
          createdAt: p.dueDate.toISOString(),
          projectId: p.projectId,
          projectName: p.project?.name,
        });
      } else if (dueDateStr <= threeDaysLater) {
        const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        liveNotifications.push({
          id: `urgent-${p.id}`,
          title: '⏰ سررسید نزدیک',
          message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft === 0 ? 'امروز' : `${daysLeft} روز مانده`} — پروژه: ${p.project?.name}`,
          type: 'warning',
          isRead: false,
          link: `/invoices/${p.id}`,
          createdAt: new Date().toISOString(),
          projectId: p.projectId,
          projectName: p.project?.name,
        });
      } else if (dueDateStr <= weekLater) {
        const daysLeft = Math.floor((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        liveNotifications.push({
          id: `upcoming-${p.id}`,
          title: '📅 یادآوری سررسید',
          message: `فاکتور ${p.invoiceNumber} از ${p.supplier?.companyName || 'نامشخص'} — ${daysLeft} روز مانده — پروژه: ${p.project?.name}`,
          type: 'info',
          isRead: false,
          link: `/invoices/${p.id}`,
          createdAt: new Date().toISOString(),
          projectId: p.projectId,
          projectName: p.project?.name,
        });
      }
    }
    
    const allNotifications = [
      ...liveNotifications,
      ...storedNotifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
        projectId: null,
        projectName: null,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const unreadCount = allNotifications.filter(n => !n.isRead).length;
    
    return NextResponse.json({ notifications: allNotifications.slice(0, 50), unreadCount });
  } catch (error: any) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();

    if (body.markAllRead) {
      await db.notification.updateMany({
        where: { userId: auth.userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    if (body.notificationId) {
      try {
        await db.notification.update({
          where: { id: body.notificationId },
          data: { isRead: true },
        });
      } catch {
        // نوتیفیکیشن زنده - نادیده گرفته می‌شود
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { title, message, type, link } = body;

    const notification = await db.notification.create({
      data: {
        userId: auth.userId,
        title: title || 'نوتیفیکیشن',
        message: message || '',
        type: type || 'info',
        link: link || null,
      },
    });

    return NextResponse.json({ notification });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: حذف نوتیفیکیشن ───
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: 'شناسه نوتیفیکیشن الزامی است' }, { status: 400 });
    }

    // فقط نوتیفیکیشن‌های دیتابیس را حذف کن (نه live notifications)
    await db.notification.deleteMany({
      where: {
        id: notificationId,
        userId: auth.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}