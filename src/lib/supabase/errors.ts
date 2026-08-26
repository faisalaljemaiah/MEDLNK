/**
 * A column that's genuinely missing shows up two different ways depending
 * on where the request fails: 42703 (undefined_column) if it somehow
 * reaches Postgres directly, or PostgREST's own PGRST204 ("Could not find
 * the '...' column ... in the schema cache") when PostgREST's cached
 * schema — built from its last introspection of the database — rejects a
 * write payload before a query is ever sent. In practice it's almost
 * always PGRST204 for an insert/update like the ones in this codebase, but
 * both are checked so this stays correct regardless of PostgREST version
 * or query shape. Used wherever a write needs to degrade gracefully on a
 * project that hasn't run a migration yet, instead of surfacing a raw DB
 * error.
 */
export function isMissingColumnError(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

/**
 * A storage bucket that hasn't been created yet (e.g. verification-docs,
 * 0027, on a project that hasn't run the migration) fails an upload with a
 * plain "Bucket not found" StorageApiError — no numeric code shared with
 * isMissingColumnError above, since this never reaches PostgREST at all.
 * Used the same way: let a write degrade gracefully instead of hard-failing
 * a whole form over one not-yet-migrated piece of infrastructure.
 */
export function isMissingBucketError(error: { message?: string } | null): boolean {
  return Boolean(error?.message?.toLowerCase().includes("bucket not found"));
}
