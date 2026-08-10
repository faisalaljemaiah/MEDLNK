import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Viewer = { id: string };

/**
 * Per-request viewer lookup, verified locally.
 *
 * `getUser()` calls the Auth server to validate the JWT — a ~250ms network
 * round trip on every render, which dominated page latency. This project signs
 * tokens with ES256 (asymmetric), so `getClaims()` verifies the signature
 * locally via WebCrypto against a cached JWKS instead: ~1-2ms once warm. It is
 * a real cryptographic check, not `getSession()`'s "trust the cookie".
 *
 * Tradeoff: a locally-verified token is trusted until it expires (access tokens
 * are short-lived), so a mid-session revocation server-side isn't seen until
 * the next refresh. Server Actions that write still use `getUser()` so
 * mutations are always checked against the Auth server.
 *
 * cache() keeps the layout and the page it wraps to one lookup per render.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { id: sub };
});

/**
 * Per-request profile row for the signed-in viewer. Selects every column so the
 * layout (avatar) and pages (verified, is_admin) share one query rather than
 * issuing a near-identical one each.
 */
export const getViewerProfile = cache(async () => {
  const viewer = await getViewer();
  if (!viewer) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", viewer.id)
    .maybeSingle();
  return data;
});
