import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { SettingsIcon } from "@/components/icons";
import { signOutAction } from "@/app/actions/auth";
import {
  approveUserAction,
  rejectUserAction,
  removeCaseAction,
  restoreCaseAction,
  toggleSuspensionAction,
  setBadgeTierAction,
} from "@/app/actions/admin";
import { getReportQueue, getModerationLog } from "@/lib/moderation";
import { getPlatformAnalytics, getFeatureUsage, getOnboardingFunnel } from "@/lib/analytics";
import { FEATURE_USAGE_LABELS, FUNNEL_STEP_LABELS } from "@/lib/analytics-events";
import { searchAllUsers, searchAllCases, getTotalUserCount } from "@/lib/admin-directory";
import { REPORT_REASON_LABELS, REPORT_STATUS_META } from "@/lib/report-reasons";
import { getSupportMessages } from "@/lib/support";
import { SUPPORT_REASON_LABELS } from "@/lib/support-reasons";
import { resolveSupportMessageAction } from "@/app/actions/support";
import { caseTypeMeta } from "@/lib/case-types";
import { ReportReview } from "@/components/report-review";
import { UnavailableNotice } from "@/components/unavailable-notice";

const TABS = [
  { key: "requests", label: "Requests" },
  { key: "users", label: "Users" },
  { key: "posts", label: "Posts" },
  { key: "reports", label: "Reports" },
  { key: "support", label: "Support" },
  { key: "log", label: "Audit log" },
  { key: "analytics", label: "Analytics" },
] as const;

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * The moderation dashboard's actual body — used two ways: standalone at
 * `/admin`, and embedded directly in place of the normal profile view at
 * `/u/[handle]` when that page belongs to an admin viewing their own
 * profile (see that page's own comment for why). `basePath` is whichever
 * of those two routes rendered it, so tab links stay correct either way.
 */
export async function AdminDashboard({
  tab: rawTab,
  resolved,
  userQuery = "",
  caseQuery = "",
  basePath,
  viewerHandle,
}: {
  tab?: string;
  resolved?: boolean;
  userQuery?: string;
  caseQuery?: string;
  basePath: string;
  viewerHandle: string | null;
}) {
  const supabase = await createClient();
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "requests";

  function tabHref(key: string) {
    return key === "requests" ? basePath : `${basePath}?tab=${key}`;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-headline text-xl text-text">Admin dashboard</h1>
        {/* This dashboard replaces the normal profile view entirely (see
            this component's own doc comment), so it's the only place an
            admin's own account ever renders — Settings/Sign out have to
            live here, not on a profile action row that never shows up. */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-text transition-transform duration-150 ease-out active:scale-90"
          >
            <SettingsIcon width={16} height={16} strokeWidth={2} />
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text transition-transform duration-150 ease-out active:scale-95"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-line pb-px">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={clsx(
              "shrink-0 rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              tab === t.key
                ? "border-text text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "requests" && (
        <VerificationQueue supabase={supabase} viewerHandle={viewerHandle} />
      )}
      {tab === "users" && (
        <UsersDirectory
          supabase={supabase}
          query={userQuery}
          basePath={basePath}
          viewerHandle={viewerHandle}
        />
      )}
      {tab === "posts" && (
        <PostsDirectory
          supabase={supabase}
          query={caseQuery}
          basePath={basePath}
          viewerHandle={viewerHandle}
        />
      )}
      {tab === "reports" && (
        <ReportsQueue
          supabase={supabase}
          showResolved={Boolean(resolved)}
          basePath={basePath}
          viewerHandle={viewerHandle}
        />
      )}
      {tab === "support" && (
        <SupportInbox supabase={supabase} showResolved={Boolean(resolved)} basePath={basePath} />
      )}
      {tab === "log" && <AuditLog supabase={supabase} />}
      {tab === "analytics" && <PlatformAnalyticsPanel supabase={supabase} />}
    </div>
  );
}

async function VerificationQueue({
  supabase,
  viewerHandle,
}: {
  supabase: Client;
  viewerHandle: string | null;
}) {
  const { data: pending } = await supabase
    .from("profiles")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  if (!pending || pending.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-muted">
        Nothing pending — you&apos;re all caught up.
      </p>
    );
  }

  // Signed, not public — verification-docs (0027) is a private bucket, so
  // reviewing a document means minting a short-lived URL server-side rather
  // than ever exposing a public one. 10 minutes is long enough to review
  // one queue pass without leaving a stale link usable long after.
  const withDocs = await Promise.all(
    pending.map(async (p) => {
      const path = p.license_document_path;
      if (!path) return { ...p, documentUrl: null };
      const { data } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(path, 600);
      return { ...p, documentUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <ul className="mt-5 flex flex-col gap-3">
      {withDocs.map((p) => (
        <li key={p.id} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-text">
                {p.full_name || "(no name yet)"}
              </p>
              <p className="font-label text-xs text-muted">
                {p.role || "no role"} · {p.city || "no city"}
              </p>
              <p className="mt-1 text-sm text-muted">
                License: {p.license_number || "—"}
              </p>
              {p.documentUrl ? (
                <a
                  href={p.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-accent hover:underline"
                >
                  View license / proof of study →
                </a>
              ) : (
                <p className="mt-1 text-sm text-danger">
                  No document uploaded
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <form action={approveUserAction.bind(null, p.id, viewerHandle)}>
                <button
                  type="submit"
                  className="rounded-lg bg-positive px-3.5 py-2 text-sm font-medium text-white"
                >
                  Approve
                </button>
              </form>
              <form action={rejectUserAction.bind(null, p.id, viewerHandle)}>
                <button
                  type="submit"
                  className="rounded-lg border border-danger/50 px-3.5 py-2 text-sm font-medium text-danger"
                >
                  Reject
                </button>
              </form>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function UsersDirectory({
  supabase,
  query,
  basePath,
  viewerHandle,
}: {
  supabase: Client;
  query: string;
  basePath: string;
  viewerHandle: string | null;
}) {
  const [users, totalCount] = await Promise.all([
    searchAllUsers(supabase, query),
    getTotalUserCount(supabase),
  ]);

  // Signed, not public — same as the Requests queue — so a member's
  // document stays reviewable from here at any point, not just while
  // their verification is pending.
  const withDocs = await Promise.all(
    users.map(async (u) => {
      if (!u.license_document_path) return { ...u, documentUrl: null };
      const { data } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(u.license_document_path, 600);
      return { ...u, documentUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-muted">
        {totalCount === null ? (
          "Member count unavailable"
        ) : (
          <>
            <span className="font-medium text-text">{totalCount}</span>{" "}
            {totalCount === 1 ? "member" : "members"} total
          </>
        )}
      </p>
      <form action={basePath} className="flex gap-2">
        <input type="hidden" name="tab" value="users" />
        {/* Same rim as every other search bar in the app (.ai-glow
            .ai-glow-brand, globals.css) — Caribbean green and white. */}
        <div className="ai-glow ai-glow-round w-full ai-glow-brand">
          <input
            type="text"
            name="uq"
            defaultValue={query}
            placeholder="Search by name, handle, role, or specialty"
            className="w-full rounded-full bg-surface px-3.5 py-2 text-sm text-text placeholder:text-muted focus:outline-none"
          />
        </div>
      </form>

      {withDocs.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No members match that search.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {withDocs.map((u) => (
            <li key={u.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={u.handle ? `/u/${u.handle}` : "#"}
                    className="font-medium text-text hover:underline"
                  >
                    {u.full_name || "(no name yet)"}
                  </Link>
                  <p className="font-label text-xs text-muted">
                    @{u.handle ?? "—"} · {u.role || "no role"}
                    {u.specialty ? ` · ${u.specialty}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      className={clsx(
                        "rounded-full border px-2 py-0.5 font-label text-xs",
                        u.verification_status === "approved"
                          ? "border-positive/40 text-positive"
                          : u.verification_status === "rejected"
                            ? "border-danger/40 text-danger"
                            : "border-warning/40 text-warning",
                      )}
                    >
                      {u.verification_status}
                    </span>
                    {u.is_admin && (
                      <span className="rounded-full border border-accent/40 px-2 py-0.5 font-label text-xs text-accent">
                        admin
                      </span>
                    )}
                    {u.suspended_at && (
                      <span className="rounded-full border border-danger/40 px-2 py-0.5 font-label text-xs text-danger">
                        suspended
                      </span>
                    )}
                  </div>
                  {u.documentUrl ? (
                    <a
                      href={u.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-block text-sm text-accent hover:underline"
                    >
                      View license / proof of study →
                    </a>
                  ) : (
                    <p className="mt-1.5 text-sm text-muted">
                      No document uploaded
                    </p>
                  )}
                  {u.verified && (
                    <form
                      action={setBadgeTierAction.bind(null, u.id, viewerHandle)}
                      className="mt-2 flex items-center gap-2"
                    >
                      <label className="font-label text-xs text-muted" htmlFor={`tier-${u.id}`}>
                        Checkmark
                      </label>
                      <select
                        id={`tier-${u.id}`}
                        name="tier"
                        defaultValue={u.badge_tier ?? ""}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-text"
                      >
                        <option value="">Blue (default)</option>
                        <option value="green">Green</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                        <option value="diamond">Diamond</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-line px-2.5 py-1 text-sm text-text hover:border-accent"
                      >
                        Save
                      </button>
                    </form>
                  )}
                </div>
                <form
                  action={toggleSuspensionAction.bind(
                    null,
                    u.id,
                    !u.suspended_at,
                    viewerHandle,
                  )}
                >
                  <button
                    type="submit"
                    className={clsx(
                      "rounded-lg border px-3.5 py-2 text-sm font-medium",
                      u.suspended_at
                        ? "border-positive/50 text-positive"
                        : "border-danger/50 text-danger",
                    )}
                  >
                    {u.suspended_at ? "Unsuspend" : "Suspend"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function PostsDirectory({
  supabase,
  query,
  basePath,
  viewerHandle,
}: {
  supabase: Client;
  query: string;
  basePath: string;
  viewerHandle: string | null;
}) {
  const cases = await searchAllCases(supabase, query);

  return (
    <div className="mt-5">
      <form action={basePath} className="flex gap-2">
        <input type="hidden" name="tab" value="posts" />
        <div className="ai-glow ai-glow-round w-full ai-glow-brand">
          <input
            type="text"
            name="cq"
            defaultValue={query}
            placeholder="Search by title, case number, or author"
            className="w-full rounded-full bg-surface px-3.5 py-2 text-sm text-text placeholder:text-muted focus:outline-none"
          />
        </div>
      </form>

      {cases.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No posts match that search.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {cases.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={c.case_number ? `/case/${c.case_number}` : "#"}
                    className="font-medium text-text hover:underline"
                  >
                    {c.title}
                  </Link>
                  <p className="font-label text-xs text-muted">
                    {c.case_number ?? "no case number"} ·{" "}
                    {caseTypeMeta(c.case_type).label} · by @
                    {c.author?.handle ?? "unknown"}
                  </p>
                  {c.moderation_status === "removed" && (
                    <span className="mt-1.5 inline-block rounded-full border border-danger/40 px-2 py-0.5 font-label text-xs text-danger">
                      removed
                    </span>
                  )}
                </div>
                <form
                  action={
                    c.moderation_status === "removed"
                      ? restoreCaseAction.bind(null, c.id, viewerHandle)
                      : removeCaseAction.bind(null, c.id, viewerHandle)
                  }
                >
                  <button
                    type="submit"
                    className={clsx(
                      "rounded-lg border px-3.5 py-2 text-sm font-medium",
                      c.moderation_status === "removed"
                        ? "border-positive/50 text-positive"
                        : "border-danger/50 text-danger",
                    )}
                  >
                    {c.moderation_status === "removed" ? "Restore" : "Remove"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function SupportInbox({
  supabase,
  showResolved,
  basePath,
}: {
  supabase: Client;
  showResolved: boolean;
  basePath: string;
}) {
  const messages = await getSupportMessages(supabase, showResolved);

  if (messages === null) {
    return <UnavailableNotice feature="Support" />;
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {showResolved ? "All messages" : "Open messages"}, oldest first.
        </p>
        <Link
          href={
            showResolved
              ? `${basePath}?tab=support`
              : `${basePath}?tab=support&resolved=1`
          }
          className="text-xs text-accent hover:underline"
        >
          {showResolved ? "Show open only" : "Show resolved too"}
        </Link>
      </div>

      {messages.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No open messages — nothing needs your attention.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-text">
                  {SUPPORT_REASON_LABELS[m.reason] ?? m.reason}
                </p>
                {m.resolved && (
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-label text-xs text-muted">
                    Resolved
                  </span>
                )}
              </div>
              <p className="mt-1 font-label text-xs text-muted">
                {m.name ? `${m.name} · ` : ""}
                {m.email} ·{" "}
                {new Date(m.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>

              {m.reporter ? (
                <div className="mt-2 rounded-lg border border-line bg-surface-2 p-2.5">
                  <Link
                    href={m.reporter.handle ? `/u/${m.reporter.handle}` : "#"}
                    className="text-sm font-medium text-text hover:underline"
                  >
                    {m.reporter.full_name || "(no name yet)"}
                  </Link>
                  <p className="font-label text-xs text-muted">
                    @{m.reporter.handle ?? "—"} · {m.reporter.role || "no role"}
                    {m.reporter.specialty ? ` · ${m.reporter.specialty}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      className={clsx(
                        "rounded-full border px-2 py-0.5 font-label text-xs",
                        m.reporter.verification_status === "approved"
                          ? "border-positive/40 text-positive"
                          : m.reporter.verification_status === "rejected"
                            ? "border-danger/40 text-danger"
                            : "border-warning/40 text-warning",
                      )}
                    >
                      {m.reporter.verification_status}
                    </span>
                    {m.reporter.is_admin && (
                      <span className="rounded-full border border-accent/40 px-2 py-0.5 font-label text-xs text-accent">
                        admin
                      </span>
                    )}
                    {m.reporter.suspended_at && (
                      <span className="rounded-full border border-danger/40 px-2 py-0.5 font-label text-xs text-danger">
                        suspended
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  Not signed in when sent — only the name and email above are
                  available.
                </p>
              )}

              <p className="mt-2 whitespace-pre-wrap text-sm text-text">{m.message}</p>
              {!m.resolved && (
                <form
                  action={resolveSupportMessageAction.bind(null, m.id, basePath)}
                  className="mt-2"
                >
                  <button
                    type="submit"
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Mark resolved
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function ReportsQueue({
  supabase,
  showResolved,
  basePath,
  viewerHandle,
}: {
  supabase: Client;
  showResolved: boolean;
  basePath: string;
  viewerHandle: string | null;
}) {
  const reports = await getReportQueue(supabase, showResolved);

  if (reports === null) {
    return <UnavailableNotice feature="Reporting" />;
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {showResolved ? "All reports" : "Open reports"}, oldest first.
        </p>
        <Link
          href={
            showResolved
              ? `${basePath}?tab=reports`
              : `${basePath}?tab=reports&resolved=1`
          }
          className="text-xs text-accent hover:underline"
        >
          {showResolved ? "Show open only" : "Show resolved too"}
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No open reports — nothing needs your attention.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => {
            const status = REPORT_STATUS_META[r.status];
            return (
              <li
                key={r.id}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text">
                    {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                  </p>
                  <span
                    className={clsx(
                      "rounded-full border px-2.5 py-0.5 font-label text-xs",
                      status?.className,
                    )}
                  >
                    {status?.label ?? r.status}
                  </span>
                </div>

                <p className="mt-1 font-label text-xs text-muted">
                  Reported by @{r.reporter?.handle ?? "unknown"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>

                {r.details && (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-sm text-text">
                    {r.details}
                  </p>
                )}

                {r.reported_case ? (
                  <p className="mt-2 text-sm">
                    <Link
                      href={
                        r.reported_case.case_number
                          ? `/case/${r.reported_case.case_number}`
                          : "#"
                      }
                      className="text-accent hover:underline"
                    >
                      {r.reported_case.case_number
                        ? `${r.reported_case.case_number} · `
                        : ""}
                      {r.reported_case.title}
                    </Link>
                    {r.reported_case.moderation_status === "removed" && (
                      <span className="ml-2 font-label text-xs text-danger">
                        already removed
                      </span>
                    )}
                  </p>
                ) : r.reported_profile ? (
                  <p className="mt-2 text-sm">
                    Account:{" "}
                    <Link
                      href={
                        r.reported_profile.handle
                          ? `/u/${r.reported_profile.handle}`
                          : "#"
                      }
                      className="text-accent hover:underline"
                    >
                      {r.reported_profile.full_name ?? "Unnamed"}
                      {r.reported_profile.handle
                        ? ` (@${r.reported_profile.handle})`
                        : ""}
                    </Link>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    The reported content no longer exists.
                  </p>
                )}

                {r.reviewer_note && (
                  <p className="mt-2 text-xs text-muted">
                    Note: {r.reviewer_note}
                  </p>
                )}

                {r.status === "pending" && (
                  <ReportReview reportId={r.id} viewerHandle={viewerHandle} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function AuditLog({ supabase }: { supabase: Client }) {
  const events = await getModerationLog(supabase);

  if (events === null) return <UnavailableNotice feature="The audit log" />;

  if (events.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-muted">
        No moderation actions yet.
      </p>
    );
  }

  return (
    <ul className="mt-5 flex flex-col gap-2">
      {events.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5"
        >
          <p className="text-sm text-text">
            <span className="font-label text-xs text-muted">
              {new Date(e.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>{" "}
            {e.action.replace(/_/g, " ")} · {e.target_kind}
          </p>
          <p className="mt-0.5 font-label text-xs text-muted">
            by @{e.actor?.handle ?? "unknown"}
            {e.note ? ` — ${e.note}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

async function PlatformAnalyticsPanel({ supabase }: { supabase: Client }) {
  const [data, featureUsage, funnel] = await Promise.all([
    getPlatformAnalytics(supabase),
    getFeatureUsage(supabase),
    getOnboardingFunnel(supabase),
  ]);

  if (data === null) return <UnavailableNotice feature="Analytics" />;

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Members" value={data.totalUsers} />
        <StatCard label="Verified" value={data.verifiedUsers} />
        <StatCard label="Cases posted" value={data.totalCases} />
        <StatCard label="Open reports" value={data.openReports} />
      </div>

      <div>
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          Cases by format
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {data.casesByType.map(({ type, count }) => (
            <li
              key={type}
              className="flex items-center justify-between text-sm text-text"
            >
              <span>{caseTypeMeta(type).label}</span>
              <span className="tabular-nums text-muted">{count}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How far a new visitor gets before dropping off (0032_analytics_events).
          Bar width is relative to the first step, not each step's own
          predecessor — that's what makes overall drop-off readable at a
          glance instead of exaggerating small stage-to-stage swings. */}
      {funnel && (
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-muted">
            Onboarding funnel
          </p>
          <ul className="mt-2 flex flex-col gap-2.5">
            {funnel.steps.map((step) => {
              const top = funnel.steps[0].count || 1;
              const pct = Math.min(100, Math.round((step.count / top) * 100));
              return (
                <li key={step.event_type}>
                  <div className="flex items-center justify-between text-sm text-text">
                    <span>
                      {FUNNEL_STEP_LABELS[
                        step.event_type as keyof typeof FUNNEL_STEP_LABELS
                      ] ?? step.event_type}
                    </span>
                    <span className="tabular-nums text-muted">{step.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2.5 text-xs text-muted">
            Reached the login screen: {funnel.loginScreenReached}
          </p>
        </div>
      )}

      {featureUsage && (
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-muted">
            Feature usage
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {featureUsage.map(({ event_type, count }) => (
              <li
                key={event_type}
                className="flex items-center justify-between text-sm text-text"
              >
                <span>
                  {FEATURE_USAGE_LABELS[
                    event_type as keyof typeof FEATURE_USAGE_LABELS
                  ] ?? event_type}
                </span>
                <span className="tabular-nums text-muted">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <p className="text-xl font-semibold tabular-nums text-text">{value}</p>
      <p className="font-label text-xs text-muted">{label}</p>
    </div>
  );
}
