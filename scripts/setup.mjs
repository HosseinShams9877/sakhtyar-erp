// ═══════════════════════════════════════════════════════
// ساختمان یار — اسکریپت راه‌اندازی اولیه
// Sakhteman Yar — Initial Setup Script
// ═══════════════════════════════════════════════════════
// Works on Windows, macOS, and Linux
// Usage: node scripts/setup.mjs  OR  npm run setup

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`  ▶ ${description}...`, colors.cyan);
    execSync(command, { cwd: ROOT, stdio: 'pipe', encoding: 'utf-8' });
    log(`  ✔ ${description} — 完成`, colors.green);
    return true;
  } catch (error) {
    log(`  ✖ ${description} — خطا`, colors.red);
    if (error.stderr) {
      log(`    ${error.stderr.toString().trim()}`, colors.red);
    }
    return false;
  }
}

// ─── Step 1: Create db/ directory ───
function ensureDbDirectory() {
  const dbDir = join(ROOT, 'db');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    log('  ✔ پوشه db/ ساخته شد', colors.green);
  } else {
    log('  ✔ پوشه db/ از قبل وجود دارد', colors.green);
  }
}

// ─── Step 2: Create .env file if missing ───
function ensureEnvFile() {
  const envPath = join(ROOT, '.env');
  const envExamplePath = join(ROOT, '.env.example');

  if (existsSync(envPath)) {
    log('  ✔ فایل .env از قبل وجود دارد', colors.green);
    return;
  }

  // Try to copy from .env.example first
  if (existsSync(envExamplePath)) {
    const exampleContent = readFileSync(envExamplePath, 'utf-8');
    writeFileSync(envPath, exampleContent, 'utf-8');
    log('  ✔ فایل .env از .env.example کپی شد', colors.green);
    return;
  }

  // Fallback: create default .env
  const defaultEnv = `# ═══════════════════════════════════════════════════════
# ساختمان یار — پیکربندی محیطی
# ═══════════════════════════════════════════════════════

# ─── دیتابیس (مسیر نسبی — در ویندوز و لینوکس کار می‌کند) ───
DATABASE_URL=file:./db/custom.db

# ─── NextAuth (الزامی برای احراز هویت) ───
NEXTAUTH_SECRET=sakhteman-yar-erp-secret-key-2024-change-in-production
NEXTAUTH_URL=http://localhost:3000

# ─── محیط اجرا ───
NODE_ENV=development
`;
  writeFileSync(envPath, defaultEnv, 'utf-8');
  log('  ✔ فایل .env با مقادیر پیش‌فرض ساخته شد', colors.green);
}

// ─── Step 3: Generate Prisma Client ───
function generatePrismaClient() {
  return runCommand('npx prisma generate', 'ساخت Prisma Client');
}

// ─── Step 4: Push database schema ───
function pushDatabaseSchema() {
  return runCommand('npx prisma db push', 'همگام‌سازی دیتابیس');
}

// ═══════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════
function main() {
  log('');
  log('═════════════════════════════════════════════════════════', colors.bold);
  log('  ساختمان یار — راه‌اندازی اولیه', colors.bold);
  log('  Sakhteman Yar — Initial Setup', colors.bold);
  log('═════════════════════════════════════════════════════════', colors.bold);
  log('');

  // Step 1
  log('[۱/۴] بررسی پوشه دیتابیس...', colors.yellow);
  ensureDbDirectory();
  log('');

  // Step 2
  log('[۲/۴] بررسی فایل پیکربندی...', colors.yellow);
  ensureEnvFile();
  log('');

  // Step 3
  log('[۳/۴] ساخت Prisma Client...', colors.yellow);
  const prismaOk = generatePrismaClient();
  log('');

  // Step 4
  log('[۴/۴] همگام‌سازی دیتابیس...', colors.yellow);
  const dbOk = pushDatabaseSchema();
  log('');

  // Summary
  log('═════════════════════════════════════════════════════════', colors.bold);
  if (prismaOk && dbOk) {
    log('  ✔ راه‌اندازی با موفقیت کامل شد!', colors.green);
    log('');
    log('  حالا اجرا کنید:  npm run dev', colors.cyan);
    log('  سپس مرورگر:     http://localhost:3000', colors.cyan);
  } else {
    log('  ⚠ راه‌اندازی با برخی خطاها مواجه شد.', colors.yellow);
    log('  لطفاً خطاهای بالا را بررسی کنید و دوباره تلاش کنید.', colors.yellow);
    if (!dbOk) {
      log('  نکته: اگر دیتابیس خطا داد، مطمئن شوید فایل .env وجود دارد.', colors.yellow);
    }
  }
  log('');
  log('  حساب‌های آزمایشی (بعد از seed):', colors.cyan);
  log('  مدیر کل:      کدملی=1234567890  موبایل=09121234567', colors.reset);
  log('  مدیر پروژه:   کدملی=1234567891  موبایل=09122345678', colors.reset);
  log('  مسئول خرید:   کدملی=1234567892  موبایل=09123456789', colors.reset);
  log('  انباردار:      کدملی=1234567893  موبایل=09124567890', colors.reset);
  log('  ادمین سیستم:  کدملی=1234567894  موبایل=09125678901', colors.reset);
  log('═════════════════════════════════════════════════════════', colors.bold);
  log('');
}

main();
