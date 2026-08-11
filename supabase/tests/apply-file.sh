#!/usr/bin/env bash
# Verifies supabase/APPLY_TO_HOSTED.sql the way the hosted project will see it.
#
# The hosted project is at 0006: 0001-0004 and 0006 are applied, 0005/0007/0008
# are not. This reproduces exactly that starting point, applies the paste-file,
# and then runs the same schema tests run.sh does — so "the file is complete"
# is asserted, not assumed.
#
# It applies the file twice. The Supabase SQL Editor runs a paste in one
# transaction, so a half-applied state isn't the risk; re-running it after a
# success is, and the second pass proves that is a no-op.
#
# Never touches the hosted Supabase project.
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
WORK=${WORK:-/var/tmp/medlnk-applytest}
PORT=${PORT:-5434}

if [ ! -x "$PGBIN/initdb" ]; then
  echo "Postgres server binaries not found at $PGBIN (set PGBIN=...)" >&2
  exit 1
fi

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

# The hosted project's actual state: everything except 0005, 0007 and 0008.
for f in 0001_extensions 0002_tables 0003_functions_triggers 0004_rls 0006_avatars; do
  $PSQL -f "$ROOT/supabase/migrations/$f.sql" >/dev/null
  echo "applied $f.sql"
done

echo
echo "### first apply"
$PSQL --single-transaction -f "$ROOT/supabase/APPLY_TO_HOSTED.sql"

echo
echo "### second apply -- must not error"
$PSQL --single-transaction -f "$ROOT/supabase/APPLY_TO_HOSTED.sql" >/dev/null
echo "re-applied cleanly"

# Applying the paste-file must leave the same schema the migrations would have,
# so the same behavioural tests run.sh uses are the real check on it.
for t in "$ROOT"/supabase/tests/*.test.sql; do
  echo
  echo "### $(basename "$t") against the pasted schema"
  psql -h "$WORK" -p "$PORT" -U postgres -d medlnk -f "$t" 2>&1 \
    | grep -v '^SET$\|^RESET\|^INSERT\|^UPDATE'
done
