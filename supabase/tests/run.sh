#!/usr/bin/env bash
# Spins up a throwaway Postgres, applies every migration, runs the schema tests.
# Never touches the hosted Supabase project.
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
WORK=${WORK:-/var/tmp/medlnk-pgtest}
PORT=${PORT:-5433}

if [ ! -x "$PGBIN/initdb" ]; then
  echo "Postgres server binaries not found at $PGBIN (set PGBIN=...)" >&2
  exit 1
fi

# initdb refuses to run as root, so hand the cluster to the postgres user.
RUNAS=""
if [ "$(id -u)" = "0" ]; then
  id -u postgres >/dev/null 2>&1 || useradd -m postgres
  RUNAS="postgres"
fi

rm -rf "$WORK"
mkdir -p "$WORK/pgdata"
[ -n "$RUNAS" ] && chown -R "$RUNAS" "$WORK"

run() { if [ -n "$RUNAS" ]; then su "$RUNAS" -c "$1"; else bash -c "$1"; fi; }

run "$PGBIN/initdb -D $WORK/pgdata -U postgres --auth=trust" >/dev/null

# Unix socket only — a TCP listener would collide with any other Postgres on
# this box, and nothing outside this script needs to reach the cluster.
{
  echo "listen_addresses = ''"
  echo "port = $PORT"
  echo "unix_socket_directories = '$WORK'"
} >> "$WORK/pgdata/postgresql.conf"

run "$PGBIN/pg_ctl -D $WORK/pgdata -l $WORK/pg.log start" >/dev/null
trap 'run "$PGBIN/pg_ctl -D $WORK/pgdata -m immediate stop" >/dev/null 2>&1 || true' EXIT
sleep 2

PSQL="psql -h $WORK -p $PORT -U postgres -d medlnk -v ON_ERROR_STOP=1 -q"
psql -h "$WORK" -p "$PORT" -U postgres -q -c "create database medlnk;"

$PSQL -f "$ROOT/supabase/tests/00_supabase_stub.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  $PSQL -f "$f" >/dev/null
  echo "applied $(basename "$f")"
done

for t in "$ROOT"/supabase/tests/*.test.sql; do
  echo
  echo "=== $(basename "$t") ==="
  psql -h "$WORK" -p "$PORT" -U postgres -d medlnk -f "$t" 2>&1 \
    | grep -v '^SET$\|^RESET\|^INSERT\|^UPDATE'
done
