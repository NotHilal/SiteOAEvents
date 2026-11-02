#!/usr/bin/env bash
# Builds origin/main on the VPS and switches the site to it. Run on the server:
#   /var/www/oa-evenementiel/repo/deploy/deploy.sh
# If the build or the health check fails, the previous release keeps serving
# (or is restored). See DEPLOIEMENT.md.
set -euo pipefail

ROOT=/var/www/oa-evenementiel
REPO=$ROOT/repo
ENV_FILE=$ROOT/shared/.env
HEALTH_URL=http://127.0.0.1:3140/api/health

cd "$REPO"
git fetch --quiet origin main
git reset --quiet --hard origin/main
RELEASE=$ROOT/releases/$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)

# In a subshell: public values are baked into the browser bundle at build time,
# but nothing from .env may reach pm2 below. pm2 would store it, and it would
# then take priority over the file read by --env-file at every restart.
(
  set -a; . "$ENV_FILE"; set +a
  # Low priority and bounded memory: other sites run on this server.
  export NODE_OPTIONS=--max-old-space-size=2048 NEXT_TELEMETRY_DISABLED=1 NODE_ENV=development
  nice -n 10 npm ci --no-audit --no-fund
  export NODE_ENV=production
  nice -n 10 npm run build
)

mkdir -p "$RELEASE"
cp -a .next/standalone/. "$RELEASE/"
cp -a .next/static "$RELEASE/.next/static"
# The standalone output may already hold a public/ folder: merge into it.
mkdir -p "$RELEASE/public"
cp -a public/. "$RELEASE/public/"

PREVIOUS=$(readlink "$ROOT/current" || true)
ln -sfn "$RELEASE" "$ROOT/current.new" && mv -T "$ROOT/current.new" "$ROOT/current"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env

healthy=
for _ in $(seq 1 30); do
  sleep 2
  if curl -fsS -m 3 "$HEALTH_URL" >/dev/null 2>&1; then healthy=1; break; fi
done
if [ -z "$healthy" ]; then
  echo "ÉCHEC : le site ne répond pas sur $HEALTH_URL" >&2
  pm2 logs oa-evenementiel --lines 30 --nostream >&2 || true
  if [ -n "$PREVIOUS" ]; then
    ln -sfn "$PREVIOUS" "$ROOT/current.new" && mv -T "$ROOT/current.new" "$ROOT/current"
    pm2 startOrReload deploy/ecosystem.config.cjs --update-env
    echo "Version précédente restaurée : $PREVIOUS" >&2
  fi
  exit 1
fi
pm2 save --force >/dev/null

# Keep the current release and the two before it.
ls -1dt "$ROOT"/releases/* | tail -n +4 | xargs -r rm -rf
echo "En ligne : $RELEASE"
