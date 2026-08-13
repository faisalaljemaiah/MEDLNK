# Local schema tests

Applies every migration to a throwaway local Postgres and asserts the security
properties that RLS and column privileges are supposed to give us — the ones
that are invisible in the app and expensive to get wrong.

Needs `postgresql-16` locally (server, not just `psql`). Nothing here touches
the hosted Supabase project.

```bash
./supabase/tests/run.sh
```

`00_supabase_stub.sql` stands in for the Supabase-managed pieces the migrations
lean on: `auth.users`, `auth.uid()`, the `storage` schema, and — importantly —
the default `anon` / `authenticated` grants on `public`. Without those grants
the privilege tests pass for the wrong reason: everything is denied because
nothing was ever granted, rather than because we revoked it.

`0008_interactive_cases.test.sql` covers, among others:

- `case_options.is_correct` is unreadable by a browser role, including via
  `select *` — an interactive case must not ship its own answer key.
- `submit_case_answer()` grades, refuses an option borrowed from another
  question, and honours `allow_change` without ever duplicating an attempt.
- One user cannot read another's attempt, while the aggregate distribution
  stays readable.
- Only a case's author can publish updates to it.
- Clients cannot insert their own notifications.
