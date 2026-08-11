#!/usr/bin/env bash
# Shared test runner for run.sh and apply-file.sh.
#
# Both scripts build a database a different way and then need to run the same
# files and fail the same way, so the "run them and report" half lives here
# rather than being copy-pasted and drifting.
#
# The suite cannot use psql's exit code: half these assertions are "this write
# MUST FAIL", so ON_ERROR_STOP has to be off and errors in the transcript are
# expected. Failures are recorded into test.failures by the assertion helpers
# instead, and this reads that table after each file.

# run_test_files <socket-dir> <port> <repo-root>
run_test_files() {
  local work="$1" port="$2" root="$3"
  local psql_cmd="psql -h $work -p $port -U postgres -d medlnk"
  local total_failures=0
  local file_failures

  for t in "$root"/supabase/tests/*.test.sql; do
    echo
    echo "=== $(basename "$t") ==="

    # Cleared per file so the failure list below belongs to this file alone.
    $psql_cmd -q -c "select test.reset();" >/dev/null

    # Strips psql's own furniture — statement tags, the column-name header the
    # assertion helpers produce, rule lines and row counts — so what's left is
    # the section headings and one PASS/FAIL line per assertion.
    $psql_cmd -f "$t" 2>&1 | grep -Ev \
      '^(SET|RESET|INSERT|UPDATE|DELETE|TRUNCATE|SELECT)( |$)|^ *(check|expect_error|reset|fan_out_[a-z_]+) *$|^-+$|^\([0-9]+ rows?\)$|^ *$'

    file_failures=$($psql_cmd -tAc "select count(*) from test.failures;")
    if [ "$file_failures" != "0" ]; then
      echo
      echo "--- $file_failures FAILED in $(basename "$t") ---"
      $psql_cmd -tAc \
        "select '  ' || label || ' -- ' || detail from test.failures order by id;"
      total_failures=$((total_failures + file_failures))
    fi
  done

  echo
  if [ "$total_failures" != "0" ]; then
    echo "FAILED: $total_failures assertion(s)"
    return 1
  fi
  echo "All assertions passed."
  return 0
}
