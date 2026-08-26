import { redirect } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { approveUserAction, rejectUserAction } from "@/app/actions/admin";
import { getReportQueue, getModerationLog } from "@/lib/moderation";
import { getPlatformAnalytics } from "@/lib/analytics";
import { REPORT_REASON_LABELS, REPORT_STATUS_META } from "@/lib/report-reasons";
import { caseTypeMeta } from "@/lib/case-types";
import { ReportReview } from "@/components/report-review";
import { UnavailableNotice } from "@/components/unavailable-notice";

const TABS = [
  { key: "verification", label: "Verification" },
  { key: "reports", label: "Reports" },
  { key: "log", label: "Audit log" },
  { key: "analytics", label: "Analytics" },
] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; resolved?: string }>;
}) {
  const { tab: rawTab, resolved } = await searchParams;
  const supabase = await createClient();
  const user = await getViewer();

  if (!user) redirect("/login");
  const me = await getViewerProfile();
  if (!me?.is_admin) redirect("/");

  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "verification";
  const showResolved = resolved === "1";

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-xl text-text">Moderation</h1>

      <div className="mt-4 flex border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "verification" ? "/admin" : `/admin?tab=${t.key}`}
            className={clsx(
              "flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition-colors duration-150",
              tab === t.key
                ? "border-text text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "verification" && <VerificationQueue supabase={supabase} />}
      {tab === "reports" && (
        <ReportsQueue supabase={supabase} showResolved={showResolved} />
      )}
      {tab === "log" && <AuditLog supabase={supabase} />}
      {tab === "analytics" && <PlatformAnalyticsPanel supabase={supabase} />}
    </div>
  );
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function VerificationQueue({ supabase }: { supabase: Client }) {
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
              <form action={approveUserAction.bind(null, p.id)}>
                <button
                  type="submit"
                  className="rounded-lg bg-positive px-3.5 py-2 text-sm font-medium text-white"
                >
                  Approve
                </button>
              </form>
              <form action={rejectUserAction.bind(null, p.id)}>
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

async function ReportsQueue({
  supabase,
  showResolved,
}: {
  supabase: Client;
  showResolved: boolean;
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
          href={showResolved ? "/admin?tab=reports" : "/admin?tab=reports&resolved=1"}
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

                {r.status === "pending" && <ReportReview reportId={r.id} />}
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
  const data = await getPlatformAnalytics(supabase);

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
