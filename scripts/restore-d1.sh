#!/usr/bin/env bash
# Loads a database export into a NEW D1 database, so a restore can be looked at before
# anything points to it. It never writes to the live database.
#
#   scripts/restore-d1.sh <export.sql> <new-database-name>
#
# The export comes from the nightly backup workflow (its artifact), or from
#   npx wrangler d1 export DB --remote --config apps/web/wrangler.jsonc --output export.sql
# To go back a few minutes or hours instead, D1's own history is quicker:
#   npx wrangler d1 time-travel restore <database> --timestamp <unix seconds>
# docs/OPERATIONS.md has the whole procedure, including pointing the Worker at the copy.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: scripts/restore-d1.sh <export.sql> <new-database-name>" >&2
  exit 1
fi
export_file="$1"
name="$2"
if [ ! -s "$export_file" ]; then
  echo "$export_file is missing or empty." >&2
  exit 1
fi
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Set CLOUDFLARE_API_TOKEN first (D1 Edit)." >&2
  exit 1
fi

cd "$(dirname "$0")/../apps/web"
echo "Creating the database $name..."
npx wrangler d1 create "$name"
echo "Loading $export_file into $name..."
npx wrangler d1 execute "$name" --remote --file "$export_file" --yes
echo
echo "Loaded. Count a table or two to confirm, for example:"
echo "  npx wrangler d1 execute $name --remote --command \"select count(*) from auth_user\""
echo "To serve from it, set database_name to \"$name\" in apps/web/wrangler.jsonc and deploy."
