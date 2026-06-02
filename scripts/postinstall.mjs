// ═══════════════════════════════════════════════════════
// ساختمان یار — اسکریپت پس از نصب
// Sakhteman Yar — Post-Install Script
// ═══════════════════════════════════════════════════════
// This runs automatically after `npm install` / `bun install`
// It ensures the db/ directory and .env file exist,
// then runs `prisma generate`.

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ─── Ensure db/ directory exists ───
function ensureDbDirectory() {
  const dbDir = join(ROOT, 'db');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

// ─── Ensure .env file exists ───
function ensureEnvFile() {
  const envPath = join(ROOT, '.env');
  const envExamplePath = join(ROOT, '.env.example');

  if (existsSync(envPath)) {
    return;
  }

  // Try to copy from .env.example first
  if (existsSync(envExamplePath)) {
    const exampleContent = readFileSync(envExamplePath, 'utf-8');
    writeFileSync(envPath, exampleContent, 'utf-8');
    return;
  }

  // Fallback: create minimal .env
  const defaultEnv = `# ═══════════════════════════════════════════════════════
# ساختمان یار — پیکربندی محیطی
# ═══════════════════════════════════════════════════════

DATABASE_URL=file:./db/custom.db
NEXTAUTH_SECRET=sakhteman-yar-erp-secret-key-2024-change-in-production
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
`;
  writeFileSync(envPath, defaultEnv, 'utf-8');
}

// ─── Run prisma generate ───
function generatePrisma() {
  try {
    execSync('npx prisma generate', {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  } catch {
    // Silently fail — prisma may not be installed yet during first install
    // The user can run `npm run setup` manually later
  }
}

// ─── Main ───
ensureDbDirectory();
ensureEnvFile();
generatePrisma();
