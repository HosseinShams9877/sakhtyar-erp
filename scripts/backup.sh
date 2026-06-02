#!/bin/bash
# ─── اسکریپت پشتیبان‌گیری پایگاه داده ───
# استفاده: ./scripts/backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-erp_construction}"
POSTGRES_USER="${POSTGRES_USER:-erp_user}"
USE_DOCKER="${USE_DOCKER:-false}"
DOCKER_CONTAINER="${DOCKER_CONTAINER:-erp-db}"
DAILY_RETENTION="${BACKUP_DAILY_RETENTION:-30}"
WEEKLY_RETENTION="${BACKUP_WEEKLY_RETENTION:-12}"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"; }

# بررسی فضای دیسک
AVAILABLE=$(df -BG "${BACKUP_DIR}" | awk 'NR==2{print $4}' | tr -d 'G')
if [ "${AVAILABLE:-0}" -lt 1 ]; then
  log "ERROR: فضای دیسک کافی نیست (${AVAILABLE}GB)"
  exit 1
fi

# تعیین نوع پشتیبان
DAY_OF_WEEK=$(date +%u)
if [ "${DAY_OF_WEEK}" = "7" ]; then
  TYPE="weekly"
  WEEK=$(date +%V)
  SUFFIX="weekly_W${WEEK}"
else
  TYPE="daily"
  SUFFIX="daily"
fi

DATE=$(date +%Y%m%d)
FILENAME="erp_construction_${SUFFIX}_${DATE}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

log "شروع پشتیبان‌گیری ${TYPE}: ${FILENAME}"

# اجرای pg_dump
if [ "${USE_DOCKER}" = "true" ]; then
  docker exec "${DOCKER_CONTAINER}" pg_dump -U "${POSTGRES_USER}" -Fc --compress=6 "${POSTGRES_DB}" > "${FILEPATH}" 2>>"${LOG_FILE}"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -Fc --compress=6 "${POSTGRES_DB}" > "${FILEPATH}" 2>>"${LOG_FILE}"
fi

# بررسی یکپارچگی فایل
if gzip -t "${FILEPATH}" 2>/dev/null; then
  SIZE=$(du -h "${FILEPATH}" | cut -f1)
  log "پشتیبان‌گیری موفق: ${FILENAME} (${SIZE})"
else
  log "ERROR: فایل پشتیبان آسیب‌دیده است، حذف می‌شود"
  rm -f "${FILEPATH}"
  exit 1
fi

# پاکسازی پشتیبان‌های قدیمی
find "${BACKUP_DIR}" -name "erp_construction_daily_*.sql.gz" -mtime +${DAILY_RETENTION} -delete 2>/dev/null
find "${BACKUP_DIR}" -name "erp_construction_weekly_*.sql.gz" -mtime +$((WEEKLY_RETENTION * 7)) -delete 2>/dev/null

log "پاکسازی قدیمی‌ها انجام شد"
