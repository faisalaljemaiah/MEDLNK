import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

// Refreshes the Supabase auth session cookie on every request. Called from
// src/proxy.ts (Next.js 16 renamed Middleware -> Proxy; same mechanism).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Required so an expiring/expired session gets refreshed — don't remove.
  //
  // getClaims() rather than getUser(): both refresh a session that's about to
  // expire, but getUser() always asks the Auth server (~250ms on every single
  // request, including static pages). This project signs with ES256, so
  // getClaims() verifies the JWT locally against a cached JWKS in ~1-2ms.
  await supabase.auth.getClaims();

  return response;
}
