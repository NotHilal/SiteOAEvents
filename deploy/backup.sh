#!/usr/bin/env bash
# Nightly database dump (cron, see DEPLOIEMENT.md). The admin's photos live in
# the database, so this covers them too. Keeps 14 days.
set -euo pipefail

ROOT=/var/www/oa-evenementiel
DIR=$ROOT/backups
DATABASE_URL=$(sed -n 's/^DATABASE_URL=//p' "$ROOT/shared/.env")

mkdir -p "$DIR"
umask 077
FILE=$DIR/oa-$(date +%Y%m%d-%H%M%S).sql.gz
pg_dump "$DATABASE_URL" --no-owner --clean --if-exists | gzip -6 > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$DIR" -name 'oa-*.sql.gz' -mtime +14 -delete
