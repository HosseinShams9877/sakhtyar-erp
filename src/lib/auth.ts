// ═══════════════════════════════════════════════════════════════════════
// پیکربندی NextAuth — سیستم احراز هویت با کد ملی و شماره موبایل
// ═══════════════════════════════════════════════════════════════════════
// نحوه ورود: کد ملی = یوزرنیم | شماره موبایل = پسورد
// هنگام تعریف هر فرد، کد ملی و شماره موبایل خودکار به عنوان
// شناسه ورود و رمز عبور تنظیم می‌شوند.

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════
// Auto-seed: وقتی دیتابیس خالی است، خودکار نقش‌ها و کاربران نمونه ایجاد می‌شود
// ═══════════════════════════════════════════════════════════════════════
async function autoSeedDatabase() {
  // ایجاد نقش‌ها
  const roles = await Promise.all([
    db.role.create({ data: { name: 'SUPER_MANAGER', label: 'مدیر کل پروژه‌ها', color: '#7c3aed', isSystem: true, priority: 1 } }),
    db.role.create({ data: { name: 'PROJECT_MANAGER', label: 'مدیر پروژه', color: '#2563eb', isSystem: true, priority: 2 } }),
    db.role.create({ data: { name: 'PURCHASER', label: 'مسئول خرید', color: '#d97706', isSystem: true, priority: 3 } }),
    db.role.create({ data: { name: 'WAREHOUSE_KEEPER', label: 'انباردار', color: '#059669', isSystem: true, priority: 4 } }),
    db.role.create({ data: { name: 'ADMIN', label: 'ادمین سیستم', color: '#dc2626', isSystem: true, priority: 5 } }),
  ]);

  // ایجاد کاربران نمونه
  const usersData = [
    { name: 'احمد توکلی', nationalCode: '1234567890', mobile: '09121234567', roleId: roles[0].id },
    { name: 'حسن نوری', nationalCode: '1234567891', mobile: '09122345678', roleId: roles[1].id },
    { name: 'رضا کریمی', nationalCode: '1234567892', mobile: '09123456789', roleId: roles[2].id },
    { name: 'علی حسینی', nationalCode: '1234567893', mobile: '09124567890', roleId: roles[3].id },
    { name: 'مریم احمدی', nationalCode: '1234567894', mobile: '09125678901', roleId: roles[4].id },
  ];

  await Promise.all(
    usersData.map(async (u) => {
      const hashedPassword = await bcrypt.hash(u.mobile, 12);
      return db.user.create({
        data: { name: u.name, nationalCode: u.nationalCode, mobile: u.mobile, password: hashedPassword, isActive: true, roleId: u.roleId },
      });
    })
  );

  console.log('[Auth] Auto-seed complete — 5 users and 5 roles created.');
}

// ─── تولید رمز امنیتی در صورت عدم تنظیم env ───
// WARNING: در تولید حتماً NEXTAUTH_SECRET تنظیم شود
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret === 'change-me-in-production') {
    // فقط در runtime تولید خطا بده — نه در build time
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error(
        '⚠️  NEXTAUTH_SECRET is not set in production! ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
    return 'dev-only-secret-key-do-not-use-in-production';
  }
  return secret;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        nationalCode: { label: 'کد ملی', type: 'text' },
        mobile: { label: 'شماره موبایل', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.nationalCode || !credentials?.mobile) {
          throw new Error('کد ملی و شماره موبایل الزامی است');
        }

        // جلوگیری از حملات brute force — حداکثر طول ورودی
        if (credentials.nationalCode.length > 20 || credentials.mobile.length > 20) {
          throw new Error('ورودی خیلی طولانی است');
        }

        // جستجوی کاربر از دیتابیس با کد ملی
        let user;
        try {
          user = await db.user.findUnique({
            where: { nationalCode: credentials.nationalCode },
            include: { role: { include: { permissions: true } } },
          });
        } catch (dbError) {
          console.error('[Auth] Database query error:', dbError);
          throw new Error('خطا در ارتباط با پایگاه داده. لطفاً مطمئن شوید دیتابیس مقداردهی شده است.');
        }

        // ─── Auto-seed: اگر هیچ کاربری وجود ندارد، خودکار seed کن ───
        if (!user) {
          try {
            const userCount = await db.user.count();
            if (userCount === 0) {
              console.log('[Auth] No users found — auto-seeding database...');
              await autoSeedDatabase();
              // دوباره کاربر را جستجو کن
              user = await db.user.findUnique({
                where: { nationalCode: credentials.nationalCode },
                include: { role: { include: { permissions: true } } },
              });
            }
          } catch (seedError) {
            console.error('[Auth] Auto-seed error:', seedError);
          }
        }

        if (!user) {
          // پیام vague برای جلوگیری از user enumeration
          throw new Error('کد ملی یا شماره موبایل اشتباه است');
        }

        if (!user.isActive) {
          throw new Error('حساب کاربری شما غیرفعال شده است. با مدیر سیستم تماس بگیرید.');
        }

        // مقایسه شماره موبایل واردشده با هش ذخیره‌شده
        let isValidPassword: boolean;
        try {
          isValidPassword = await bcrypt.compare(credentials.mobile, user.password);
        } catch (bcryptError) {
          console.error('[Auth] bcrypt compare error:', bcryptError);
          throw new Error('خطا در تأیید رمز عبور. لطفاً دوباره تلاش کنید.');
        }

        if (!isValidPassword) {
          throw new Error('کد ملی یا شماره موبایل اشتباه است');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email || user.nationalCode,
          role: user.role?.name || 'WAREHOUSE_KEEPER',
          avatar: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.avatar = (user as any).avatar; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // ۸ ساعت به جای ۲۴ — امن‌تر
  },
  secret: getSecret(),
  debug: process.env.NODE_ENV === 'development',
};

/**
 * هش کردن شماره موبایل به عنوان رمز عبور
 * هنگام ایجاد یا ویرایش کاربر، شماره موبایل خودکار هش شده
 * و در فیلد password ذخیره می‌شود.
 */
export async function hashPassword(password: string): Promise<string> {
  // حداقل طول رمز عبور (شماره موبایل ایران ۱۱ رقم است)
  if (password.length < 6) {
    throw new Error('رمز عبور باید حداقل ۶ کاراکتر باشد');
  }
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
