#!/usr/bin/env bash
set -Eeuo pipefail

# Applies only committed Drizzle migrations. It never generates new SQL.
# Required: DATABASE_URL and NODE_ENV=production.

if [[ "${NODE_ENV:-}" != "production" ]]; then
  echo "ERROR: refuse to run production migration unless NODE_ENV=production" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

if [[ "${DATABASE_URL}" == *"user:password@host"* || "${DATABASE_URL}" == *"localhost"* ]]; then
  echo "ERROR: DATABASE_URL looks like a placeholder or local database" >&2
  exit 1
fi

if [[ "${DATABASE_URL}" != mysql://* && "${DATABASE_URL}" != mysql2://* ]]; then
  echo "ERROR: DATABASE_URL must use mysql:// or mysql2://" >&2
  exit 1
fi

if [[ ! -f drizzle/0003_modern_blackheart.sql ]]; then
  echo "ERROR: expected migration drizzle/0003_modern_blackheart.sql is missing" >&2
  exit 1
fi

if [[ "${ALLOW_PRODUCTION_MIGRATION:-}" != "yes" ]]; then
  echo "ERROR: set ALLOW_PRODUCTION_MIGRATION=yes to confirm this production operation" >&2
  exit 1
fi

echo "Applying committed Drizzle migrations to the configured production database..."
pnpm exec drizzle-kit migrate

echo "Production migrations completed."
