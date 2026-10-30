import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewFollowersDigestEmail } from "@/lib/email";

// How far back to look for a profile that has never been sent a digest
// before (last_follower_digest_at is null) — a little over the weekly cron
// interval (vercel.json) so the very first run after this shipped doesn't
// dig up months of historical follows and flood everyone with an
// unexpectedly huge first email.
const FIRST_RUN_WINDOW_DAYS = 8;
// Upper bound on how far back the initial fetch looks at all, regardless of
// any one profile's own cutoff — generous slack for the cron having missed
// a run or two, without scanning the whole follows table every time.
const FETCH_WINDOW_DAYS = 30;

/**
 * Batches every new follower since each profile's last digest into one
 * email, instead of the one-push-per-follow notify_new_follower already
 * does (src/app/actions/reactions.ts) — see that flow for the
 * immediate in-app/push notification; this is the opt-in-by-default,
 * much-less-frequent email on top of it. Invoked weekly by Vercel Cron
 * (vercel.json), same CRON_SECRET auth as purge-deleted-accounts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const fetchSince = new Date(Date.now() - FETCH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rawFollows, error: followsError } = await admin
    .from("follows")
    .select("followee_id, created_at, follower:profiles!follows_follower_id_fkey(handle, full_name)")
    .gte("created_at", fetchSince);

  if (followsError) {
    return NextResponse.json({ error: followsError.message }, { status: 500 });
  }
  // database.types.ts's hand-maintained Database type has empty
  // Relationships arrays (see every Tables entry), so supabase-js can't
  // verify this embedded select against real FK metadata and falls back to
  // SelectQueryError — same situation, same cast, as getFollowList
  // (src/lib/follows.ts).
  const recentFollows = (rawFollows ?? []) as unknown as {
    followee_id: string;
    created_at: string;
    follower: { handle: string; full_name: string | null } | null;
  }[];
  if (recentFollows.length === 0) {
    return NextResponse.json({ sent: 0, checked: 0 });
  }

  const followeeIds = [...new Set(recentFollows.map((f) => f.followee_id))];
  const { data: followees, error: followeesError } = await admin
    .from("profiles")
    .select("id, handle, full_name, last_follower_digest_at")
    .in("id", followeeIds);

  if (followeesError) {
    return NextResponse.json({ error: followeesError.message }, { status: 500 });
  }

  // listUsers, not one getUserById per recipient — this can touch many
  // profiles in one run, same N+1-avoidance as the admin Users directory
  // (src/components/admin-dashboard.tsx).
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authList?.users.map((u) => [u.id, u.email ?? null]) ?? []);

  const now = new Date();
  const firstRunCutoff = new Date(now.getTime() - FIRST_RUN_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let sent = 0;
  for (const followee of followees ?? []) {
    const since = followee.last_follower_digest_at
      ? new Date(followee.last_follower_digest_at)
      : firstRunCutoff;

    const newFollowers = recentFollows
      .filter((f) => f.followee_id === followee.id && new Date(f.created_at) > since)
      .map((f) => f.follower)
      .filter((f): f is { handle: string; full_name: string | null } => Boolean(f));

    if (newFollowers.length === 0 || !followee.handle) continue;

    const email = emailById.get(followee.id);
    if (email) {
      await sendNewFollowersDigestEmail(
        email,
        followee.full_name || `@${followee.handle}`,
        followee.handle,
        newFollowers,
      );
      sent += 1;
    }

    // Advances the cutoff even if there was no email on file (shouldn't
    // happen, but Supabase Auth is the source of truth for that, not this
    // table) — otherwise a profile stuck without a resolvable email would
    // re-accumulate the same "new" followers and get reprocessed every run.
    await admin
      .from("profiles")
      .update({ last_follower_digest_at: now.toISOString() })
      .eq("id", followee.id);
  }

  return NextResponse.json({ checked: followees?.length ?? 0, sent });
}
