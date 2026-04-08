#!/bin/bash
# Database Backup Script for UniAct
# Schedule with cron: 0 2 * * * /opt/uniact/backup-db.sh

set -e

# Configuration
DB_PATH="/var/lib/uniact/uniact.db"
BACKUP_DIR="/var/backups/uniact/db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/uniact_${TIMESTAMP}.db"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
LOG_FILE="/var/log/uniact/backup.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    log_error "Database file not found: $DB_PATH"
    exit 1
fi

# Get database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
log "Database size: $DB_SIZE"

# Create backup using SQLite .backup command
log "Creating backup: $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

if [ $? -eq 0 ]; then
    log_success "Backup created successfully"
else
    log_error "Backup failed"
    exit 1
fi

# Verify backup
log "Verifying backup integrity..."
sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" > /tmp/backup_check.txt
INTEGRITY_CHECK=$(cat /tmp/backup_check.txt)
rm -f /tmp/backup_check.txt

if [ "$INTEGRITY_CHECK" = "ok" ]; then
    log_success "Backup integrity verified"
else
    log_error "Backup integrity check failed: $INTEGRITY_CHECK"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Compress backup
log "Compressing backup..."
gzip "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log_success "Backup compressed: $COMPRESSED_SIZE"
else
    log_error "Compression failed"
    exit 1
fi

# Create daily directory and copy latest backup
DAILY_DIR="${BACKUP_DIR}/daily"
mkdir -p "$DAILY_DIR"
cp "$COMPRESSED_FILE" "${DAILY_DIR}/uniact_${DATE}.db.gz"
log "Daily backup saved to: ${DAILY_DIR}/uniact_${DATE}.db.gz"

# Weekly backup (every Sunday)
if [ $(date +%u) -eq 7 ]; then
    WEEKLY_DIR="${BACKUP_DIR}/weekly"
    mkdir -p "$WEEKLY_DIR"
    cp "$COMPRESSED_FILE" "${WEEKLY_DIR}/uniact_week_$(date +%Y_W%V).db.gz"
    log_success "Weekly backup created"
fi

# Monthly backup (first day of month)
if [ $(date +%d) -eq 01 ]; then
    MONTHLY_DIR="${BACKUP_DIR}/monthly"
    mkdir -p "$MONTHLY_DIR"
    cp "$COMPRESSED_FILE" "${MONTHLY_DIR}/uniact_$(date +%Y_%m).db.gz"
    log_success "Monthly backup created"
fi

# Remove old backups (keep only last N days)
log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "uniact_*.db.gz" -type f -mtime +${RETENTION_DAYS} -delete
DELETED_COUNT=$(find "$BACKUP_DIR" -name "uniact_*.db.gz" -type f -mtime +${RETENTION_DAYS} | wc -l)
log "Removed $DELETED_COUNT old backup(s)"

# Calculate total backup size
TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Total backup size: $TOTAL_BACKUP_SIZE"

# Count total backups
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "*.db.gz" -type f | wc -l)
log "Total backups: $TOTAL_BACKUPS"

# Send notification (optional - can integrate with email or monitoring system)
# echo "Backup completed at $(date)" | mail -s "UniAct Backup Success" admin@uniact.local

log_success "Backup completed successfully"
log "Backup file: $COMPRESSED_FILE"
log "----------------------------------------"

exit 0
