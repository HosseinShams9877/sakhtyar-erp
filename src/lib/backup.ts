// ─── سیستم پشتیبان‌گیری پایگاه داده ───

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface BackupInfo {
  fileName: string;
  filePath: string;
  size: number;
  type: 'daily' | 'weekly' | 'manual' | 'pre_restore';
  date: string;
}

export interface BackupResult {
  success: boolean;
  fileName?: string;
  filePath?: string;
  size?: number;
  error?: string;
}

function getBackupDir(): string {
  return process.env.BACKUP_DIR || '/backups';
}

async function ensureBackupDir(): Promise<void> {
  const dir = getBackupDir();
  await fs.mkdir(dir, { recursive: true });
}

export async function executeBackup(options?: { label?: string }): Promise<BackupResult> {
  const backupDir = getBackupDir();
  await ensureBackupDir();

  const now = new Date();
  const isSunday = now.getDay() === 0;
  const type = isSunday ? 'weekly' : 'daily';
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const label = options?.label || type;
  const fileName = `erp_construction_${label}_${dateStr}.sql.gz`;
  const filePath = path.join(backupDir, fileName);

  const dbUrl = process.env.DATABASE_URL || '';
  const useDocker = process.env.USE_DOCKER === 'true';
  const container = process.env.DOCKER_CONTAINER || 'erp-db';

  try {
    let cmd: string;
    let args: string[];

    if (useDocker) {
      cmd = 'docker';
      args = ['exec', container, 'pg_dump', '-Fc', '--compress=6', '-f', `/tmp/${fileName}`, process.env.POSTGRES_DB || 'erp_construction'];
    } else {
      const dbName = new URL(dbUrl).pathname.slice(1);
      const dbHost = new URL(dbUrl).hostname;
      const dbPort = new URL(dbUrl).port || '5432';
      const dbUser = new URL(dbUrl).username;
      cmd = 'pg_dump';
      args = ['-Fc', '--compress=6', `-h${dbHost}`, `-p${dbPort}`, `-U${dbUser}`, `-f`, filePath, dbName];
    }

    const { stderr } = await execFileAsync(cmd, args, { timeout: 300000 });
    if (stderr && !stderr.includes('warning')) {
      console.warn('Backup stderr:', stderr);
    }

    const stats = await fs.stat(filePath);
    return { success: true, fileName, filePath, size: stats.size };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listBackups(): Promise<BackupInfo[]> {
  const backupDir = getBackupDir();
  try {
    await fs.access(backupDir);
  } catch {
    return [];
  }

  const files = await fs.readdir(backupDir);
  const backups: BackupInfo[] = [];

  for (const file of files) {
    if (!file.endsWith('.sql.gz') && !file.endsWith('.sql')) continue;
    const filePath = path.join(backupDir, file);
    const stats = await fs.stat(filePath);
    let type: BackupInfo['type'] = 'manual';
    if (file.includes('_daily_')) type = 'daily';
    else if (file.includes('_weekly_')) type = 'weekly';
    else if (file.includes('_pre_restore_')) type = 'pre_restore';

    backups.push({ fileName: file, filePath, size: stats.size, type, date: stats.mtime.toISOString() });
  }

  return backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function cleanupOldBackups(): Promise<{ removed: number }> {
  const backups = await listBackups();
  const now = Date.now();
  const dailyRetention = parseInt(process.env.BACKUP_DAILY_RETENTION || '30') * 86400000;
  const weeklyRetention = parseInt(process.env.BACKUP_WEEKLY_RETENTION || '12') * 7 * 86400000;
  let removed = 0;

  for (const backup of backups) {
    const age = now - new Date(backup.date).getTime();
    const shouldRemove =
      (backup.type === 'daily' && age > dailyRetention) ||
      (backup.type === 'weekly' && age > weeklyRetention) ||
      (backup.type === 'pre_restore' && age > 7 * 86400000);
    if (shouldRemove) {
      await fs.unlink(backup.filePath).catch(() => {});
      removed++;
    }
  }
  return { removed };
}
