import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GRACE_DAYS = 30;

/**
 * The other half of the 30-day soft-delete (deleteAccountAction,
 * src/app/actions/account.ts): everything past its grace period gets the
 * exact same complete, cascading deletion that action used to do
 * immediately — `admin.auth.admin.deleteUser`, cascading through every
 * table that references profiles(id).
 *
 * Invoked once a day by Vercel Cron (vercel.json). Vercel signs its own
 * cron requests with `Authorization: Bearer $CRON_SECRET` when that env var
 * is set on the project — checked here so this can't become a public
 * endpoint anyone on the internet could hit to mass-delete accounts. Set
 * CRON_SECRET (any random string) as a Vercel environment variable for this
 * to do anything at all; until it's set, every invocation refuses rather
 * than silently running unauthenticated.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error } = await admin
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let purged = 0;
  for (const profile of expired ?? []) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(profile.id);
    if (!deleteError) purged += 1;
  }

  return NextResponse.json({ checked: expired?.length ?? 0, purged });
}
