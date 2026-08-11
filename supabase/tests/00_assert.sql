-- Assertion helpers, so the suite fails instead of merely reporting.
--
-- Why this exists: every test file here states its expectation in an \echo
-- ("-- expect 0") and then prints the actual value. Reading the two and
-- noticing they disagree was left to a human. That did not happen — 0009's
-- "a member cannot un-remove their own case" printed `visible` against an
-- expectation of "still removed" for a whole session, which is how a real
-- moderation bypass shipped. A suite nobody reads is a suite that doesn't run.
--
-- The awkward part is that these files *want* errors: half the assertions are
-- "this write MUST FAIL", so `ON_ERROR_STOP` can't be on and psql's exit code
-- is meaningless. So failures are recorded into a table instead, and the runner
-- checks that table at the end.
--
-- The silent-regression case is the one that matters most: if RLS were dropped,
-- a "MUST FAIL" insert would simply succeed and print `INSERT 0 1`, which the
-- runner already filters out of the output. It would look like nothing at all.

create schema if not exists test;

create table if not exists test.failures (
  id serial primary key,
  label text not null,
  detail text not null,
  recorded_at timestamptz not null default now()
);

-- Truncated between files by the runner so each file's failures are its own.
create or replace function test.reset() returns void
language sql as $$
  truncate test.failures restart identity;
$$;

/**
 * Compares an actual value to an expected one, records a failure if they
 * differ, and returns a line for the transcript either way — the output stays
 * as readable as the bare select it replaces, and now it also fails the build.
 */
create or replace function test.check(
  p_label text,
  p_actual text,
  p_expected text
) returns text
language plpgsql as $$
begin
  if p_actual is not distinct from p_expected then
    return 'PASS  ' || p_label;
  end if;

  insert into test.failures (label, detail)
  values (p_label, format('expected %L, got %L', p_expected, p_actual));

  return format('FAIL  %s -- expected %L, got %L', p_label, p_expected, p_actual);
end;
$$;

/**
 * Runs a statement that must be rejected.
 *
 * Records a failure when it *succeeds*, which is the direction that would
 * otherwise be invisible: a dropped policy turns a MUST-FAIL insert into a
 * silent `INSERT 0 1`.
 *
 * Deliberately catches every exception rather than a specific SQLSTATE. These
 * assertions mean "the database refused this", and an RLS violation, a check
 * constraint and a unique index are all legitimate refusals — pinning the code
 * would make the test brittle about which of them fires.
 */
create or replace function test.expect_error(
  p_label text,
  p_statement text
) returns text
language plpgsql as $$
begin
  execute p_statement;

  insert into test.failures (label, detail)
  values (p_label, 'statement succeeded but should have been rejected');

  return format('FAIL  %s -- succeeded, expected rejection', p_label);
exception
  when others then
    return format('PASS  %s -- rejected: %s', p_label, sqlerrm);
end;
$$;

-- The helpers write to test.failures, so they must not be blocked by RLS or by
-- the caller's role — every test file runs most of its body as `authenticated`.
grant usage on schema test to anon, authenticated;
grant all on test.failures to anon, authenticated;
grant all on sequence test.failures_id_seq to anon, authenticated;
grant execute on function test.check(text, text, text) to anon, authenticated;
grant execute on function test.expect_error(text, text) to anon, authenticated;
grant execute on function test.reset() to anon, authenticated;
