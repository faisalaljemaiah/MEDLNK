import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * The service-role key, server-only, used for exactly one thing right now:
 * deleting a user's own `auth.users` row from `deleteAccountAction`
 * (src/app/actions/account.ts). There is no non-privileged way to do that —
 * a user can never delete their own `auth.users` row through the normal
 * RLS-scoped client, only an account with the service role can.
 *
 * Never call this with an ID the caller doesn't already own. Every caller
 * must first confirm the target ID via the *regular* session-bound client's
 * own `getUser()` — this client bypasses RLS entirely, so it is only ever
 * as safe as whatever already verified who's asking before reaching here.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill it in.",
    );
  }
  return createSupabaseClient<Database>(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
