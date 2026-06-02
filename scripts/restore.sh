#!/bin/bash
# ─── اسکریپت بازیابی پایگاه داده ───
# استفاده: ./scripts/restore.sh <backup_file_path>

set -euo pipefail

BACKUP_FILE="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-erp_construction}"
POSTGRES_USER="${POSTGRES_USER:-erp_user}"
USE_DOCKER="${USE_DOCKER:-false}"
DOCKER_CONTAINER="${DOCKER_CONTAINER:-erp-db}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "خطا: مسیر فایل پشتیبان الزامی است"
  echo "استفاده: $0 <backup_file_path>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "خطا: فایل '${BACKUP_FILE}' یافت نشد"
  exit 1
fi

# بررسی یکپارچگی فایل
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "خطا: فایل پشتیبان آسیب‌دیده است"
  exit 1
fi

echo "⚠️  هشدار: این عملیات تمام داده‌های فعلی را جایگزین می‌کند!"
echo "پایگاه داده: ${POSTGRES_DB}"
echo "فایل پشتیبان: ${BACKUP_FILE}"
echo ""
echo -n "آیا مطمئن هستید؟ (yes): "
read -r CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "عملیات لغو شد"
  exit 0
fi

# ایجاد پشتیبان پیش از بازیابی
PRE_RESTORE_FILE="${BACKUP_DIR}/erp_construction_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "ایجاد پشتیبان پیش از بازیابی: ${PRE_RESTORE_FILE}"

if [ "${USE_DOCKER}" = "true" ]; then
  docker exec "${DOCKER_CONTAINER}" pg_dump -U "${POSTGRES_USER}" -Fc --compress=6 "${POSTGRES_DB}" > "${PRE_RESTORE_FILE}"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -Fc --compress=6 "${POSTGRES_DB}" > "${PRE_RESTORE_FILE}"
fi

# بازیابی
echo "شروع بازیابی..."

if [ "${USE_DOCKER}" = "true" ]; then
  docker exec -i "${DOCKER_CONTAINER}" pg_restore --clean --if-exists -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${BACKUP_FILE}"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_restore --clean --if-exists -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${BACKUP_FILE}"
fi

echo "بازیابی با موفقیت انجام شد!"
