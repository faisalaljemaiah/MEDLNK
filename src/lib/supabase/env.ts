/**
 * Deliberately static `process.env.NEXT_PUBLIC_*` references, not a
 * `requireEnv(name)` helper doing `process.env[name]` — Next.js can only
 * inline a `NEXT_PUBLIC_*` variable into the browser bundle when it sees
 * the literal property access at build time; a dynamic bracket lookup
 * with a variable name defeats that, so it worked from server code (a
 * real process.env exists there) but silently resolved to undefined from
 * any client component. Caught when the browser Supabase client
 * (src/lib/supabase/client.ts) got its first-ever caller, the password
 * reset page.
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Supabase project's URL and anon key.`,
    );
  }
  return value;
}

export const supabaseUrl = () =>
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () =>
  requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
