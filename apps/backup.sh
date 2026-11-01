#!/bin/bash
BACKUP_DIR=/root/dbugg/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME=dbugg_backup_${TIMESTAMP}.sql.gz

docker exec dbugg-postgres pg_dump -U dbugg -d dbugg | gzip > ${BACKUP_DIR}/${FILENAME}

# Keep only last 7 days
find ${BACKUP_DIR} -name 'dbugg_backup_*.sql.gz' -mtime +7 -delete

echo "[$(date)] Backup created: ${FILENAME} ($(du -h ${BACKUP_DIR}/${FILENAME} | cut -f1))"
