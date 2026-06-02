// ─── سیستم ایمیل سامانه ERP مصالح عمرانی ───

import nodemailer from 'nodemailer';

function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function createTransporter() {
  if (!isEmailConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  } as any);
}

function baseHtmlTemplate(content: string, title: string): string {
  return `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Tahoma,Arial,sans-serif;background:#f5f5f5;direction:rtl;">
<table width="100%" style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:20px 30px;color:#fff;">
<h1 style="margin:0;font-size:20px;">سامانه مدیریت مصالح عمرانی</h1>
</td></tr>
<tr><td style="padding:30px;">
<h2 style="margin:0 0 15px;color:#1e293b;font-size:18px;">${title}</h2>
${content}
</td></tr>
<tr><td style="padding:15px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center;">
این ایمیل به صورت خودکار ارسال شده است. لطفاً پاسخ ندهید.
</td></tr>
</table></body></html>`;
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  if (!isEmailConfigured()) return;
  try {
    const transporter = createTransporter();
    if (!transporter) return;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ERP مصالح عمرانی" <noreply@erp-construction.ir>',
      to,
      subject,
      html,
      text: text || subject,
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
}

export async function sendLowStockAlert(
  material: { name: string; code: string; unit: string; minStock: number },
  currentStock: number,
  recipients: string[]
) {
  if (!recipients.length) return;
  const percentage = Math.min(100, Math.max(0, (currentStock / material.minStock) * 100));
  const barColor = percentage < 30 ? '#ef4444' : percentage < 70 ? '#f59e0b' : '#22c55e';
  const content = `
    <div style="padding:15px;background:#fef2f2;border-radius:6px;border-right:4px solid #ef4444;margin-bottom:15px;">
      <p style="margin:0;font-size:16px;font-weight:bold;color:#991b1b;">هشدار: موجودی مصالح زیر حد مجاز رسیده است</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:15px 0;">
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">نام مصالح</td><td style="padding:8px;border:1px solid #e2e8f0;">${material.name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">کد</td><td style="padding:8px;border:1px solid #e2e8f0;">${material.code}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">موجودی فعلی</td><td style="padding:8px;border:1px solid #e2e8f0;color:#ef4444;font-weight:bold;">${currentStock} ${material.unit}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">حداقل موجودی</td><td style="padding:8px;border:1px solid #e2e8f0;">${material.minStock} ${material.unit}</td></tr>
    </table>
    <div style="background:#e2e8f0;border-radius:4px;height:8px;margin:10px 0;">
      <div style="background:${barColor};height:8px;border-radius:4px;width:${percentage}%;"></div>
    </div>`;
  await sendEmail({
    to: recipients.join(','),
    subject: `هشدار موجودی کم: ${material.name} (${material.code})`,
    html: baseHtmlTemplate(content, 'هشدار موجودی کم'),
  });
}

export async function sendInvoiceStatusEmail(
  invoice: { invoiceNumber: string; totalAmount: number; vendorName: string },
  status: string,
  recipients: string[]
) {
  const statusMap: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'در انتظار بررسی', color: '#f59e0b' },
    APPROVED: { label: 'تأیید شده', color: '#22c55e' },
    REJECTED: { label: 'رد شده', color: '#ef4444' },
    PAID: { label: 'پرداخت شده', color: '#3b82f6' },
  };
  const s = statusMap[status] || { label: status, color: '#6b7280' };
  const content = `
    <div style="padding:15px;background:#f8fafc;border-radius:6px;border-right:4px solid ${s.color};margin-bottom:15px;">
      <p style="margin:0;font-size:16px;font-weight:bold;color:#334155;">فاکتور ${s.label}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:15px 0;">
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">شماره فاکتور</td><td style="padding:8px;border:1px solid #e2e8f0;">${invoice.invoiceNumber}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">فروشنده</td><td style="padding:8px;border:1px solid #e2e8f0;">${invoice.vendorName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">مبلغ کل</td><td style="padding:8px;border:1px solid #e2e8f0;">${invoice.totalAmount.toLocaleString('fa-IR')} ریال</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">وضعیت</td><td style="padding:8px;border:1px solid #e2e8f0;"><span style="background:${s.color};color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;">${s.label}</span></td></tr>
    </table>`;
  await sendEmail({
    to: recipients.join(','),
    subject: `فاکتور ${invoice.invoiceNumber} - ${s.label}`,
    html: baseHtmlTemplate(content, `وضعیت فاکتور: ${s.label}`),
  });
}

export async function sendNewUserWelcomeEmail(
  user: { name: string; email: string },
  tempPassword: string,
  recipients: string[]
) {
  const content = `
    <div style="padding:15px;background:#f0fdf4;border-radius:6px;border-right:4px solid #22c55e;margin-bottom:15px;">
      <p style="margin:0;font-size:16px;font-weight:bold;color:#166534;">حساب کاربری شما ایجاد شد</p>
    </div>
    <p style="margin:0 0 10px;color:#334155;">کاربر گرامی ${user.name}، به سامانه مدیریت مصالح عمرانی خوش آمدید.</p>
    <table style="width:100%;border-collapse:collapse;margin:15px 0;">
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">ایمیل</td><td style="padding:8px;border:1px solid #e2e8f0;">${user.email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">رمز عبور موقت</td><td style="padding:8px;border:1px solid #e2e8f0;"><code style="background:#1e293b;color:#fff;padding:4px 12px;border-radius:4px;font-family:monospace;">${tempPassword}</code></td></tr>
    </table>
    <div style="padding:12px;background:#fef3c7;border-radius:6px;margin:10px 0;color:#92400e;">
      <strong>توجه:</strong> لطفاً بلافاصله پس از ورود، رمز عبور خود را تغییر دهید.
    </div>`;
  await sendEmail({
    to: recipients.join(','),
    subject: 'خوش آمدید - سامانه مدیریت مصالح عمرانی',
    html: baseHtmlTemplate(content, 'حساب کاربری جدید'),
  });
}
