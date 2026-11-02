# syntax=docker/dockerfile:1
# OA Événementiel — site + admin (Next.js standalone). See DEPLOIEMENT.md.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm cache kept between builds: rebuilds don't re-download every package.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Full source + dev dependencies: builds the app, and runs the one-off
# tools (data import from the old SQLite file) — `docker compose run tools …`.
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public values baked into the browser bundle at build time.
ARG NEXT_PUBLIC_SITE_URL=https://oa-evenementiel.fr
ARG NEXT_PUBLIC_SITE_PHONE=
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
ARG NEXT_PUBLIC_PLAUSIBLE_SRC=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SITE_PHONE=$NEXT_PUBLIC_SITE_PHONE \
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN \
    NEXT_PUBLIC_PLAUSIBLE_SRC=$NEXT_PUBLIC_PLAUSIBLE_SRC
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# tini as PID 1: forwards SIGTERM to Node (clean, fast `docker compose down`
# and restarts) and reaps zombie processes.
RUN apk add --no-cache tini && addgroup -S app && adduser -S app -G app
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
# /api/health also checks PostgreSQL. start-period covers the first boot,
# when the schema migrations and the starter catalogue are applied.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
