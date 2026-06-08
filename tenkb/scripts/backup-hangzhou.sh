#!/bin/bash
# tenkb/scripts/backup-hangzhou.sh
# PostgreSQL 备份脚本（在杭州服务器上运行）
# 建议添加到 crontab：0 2 * * * /root/tenkb/scripts/backup-hangzhou.sh

set -e

DB_NAME="newapi"
DB_USER="newapi"
DB_HOST="127.0.0.1"
DB_PORT="5432"
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)
RETAIN_DAYS=7
RETAIN_WEEKS=4
RETAIN_MONTHS=3

mkdir -p ${BACKUP_DIR}/{daily,weekly,monthly}

BACKUP_FILE="${BACKUP_DIR}/daily/newapi_${DATE}.sql.gz"

echo "🚀 开始备份 PostgreSQL..."
echo "📅 时间: $(date)"

# 使用 pg_dump 备份（通过 docker exec 进入 postgres 容器）
docker exec postgres pg_dump -U ${DB_USER} -h ${DB_HOST} -p ${DB_PORT} \
  --clean --if-exists --create ${DB_NAME} | gzip > ${BACKUP_FILE}

# 验证备份
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
  SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
  echo "✅ 备份成功: ${BACKUP_FILE} (${SIZE})"
else
  echo "❌ 备份失败！"
  exit 1
fi

# 创建周备份（周日）
if [ "${DAY_OF_WEEK}" == "7" ]; then
  cp ${BACKUP_FILE} ${BACKUP_DIR}/weekly/newapi_weekly_${DATE}.sql.gz
  echo "📦 已创建周备份"
fi

# 创建月备份（每月1号）
if [ "${DAY_OF_MONTH}" == "01" ]; then
  cp ${BACKUP_FILE} ${BACKUP_DIR}/monthly/newapi_monthly_${DATE}.sql.gz
  echo "📦 已创建月备份"
fi

# 清理旧备份
echo "🧹 清理旧备份..."
find ${BACKUP_DIR}/daily -name "newapi_*.sql.gz" -mtime +${RETAIN_DAYS} -delete
find ${BACKUP_DIR}/weekly -name "newapi_weekly_*.sql.gz" -mtime +$((RETAIN_WEEKS * 7)) -delete
find ${BACKUP_DIR}/monthly -name "newapi_monthly_*.sql.gz" -mtime +$((RETAIN_MONTHS * 30)) -delete

echo ""
echo "📊 当前备份:"
echo "  日备份: $(ls -1 ${BACKUP_DIR}/daily/*.sql.gz 2>/dev/null | wc -l) 个"
echo "  周备份: $(ls -1 ${BACKUP_DIR}/weekly/*.sql.gz 2>/dev/null | wc -l) 个"
echo "  月备份: $(ls -1 ${BACKUP_DIR}/monthly/*.sql.gz 2>/dev/null | wc -l) 个"
echo "✅ 备份完成！"
