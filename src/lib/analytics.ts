import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getFeedCases, type FeedCase } from "@/lib/cases";
import { countryName } from "@/lib/countries";
import {
  FEATURE_USAGE_EVENTS,
  ONBOARDING_FUNNEL_STEPS,
} from "@/lib/analytics-events";

type Client = SupabaseClient<Database>;

export type MonthlyCount = { month: string; count: number };

export type PersonalAnalytics = {
  casesByMonth: MonthlyCount[];
  signal: {
    interesting: number;
    changed_thinking: number;
    patient_safety: number;
  };
  totalReactionsReceived: number;
  topCase: FeedCase | null;
};

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function engagementScore(c: FeedCase): number {
  return (
    c.counts.interesting + c.counts.changed_thinking + c.counts.patient_safety
  );
}

/**
 * One clinician's own contribution trend (spec §30). Built on the same feed
 * query as getProfileByHandle rather than a dedicated aggregate table — this
 * is a personal view, not a platform metric, and reuses whatever the viewer
 * could already see about their own cases.
 */
export async function getPersonalAnalytics(
  supabase: Client,
  userId: string,
): Promise<PersonalAnalytics> {
  const all = await getFeedCases(supabase, userId);
  const mine = all.filter((c) => c.author_id === userId);

  const byMonth = new Map<string, number>();
  for (const c of mine) {
    const key = monthKey(c.created_at);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const casesByMonth = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const signal = mine.reduce(
    (acc, c) => ({
      interesting: acc.interesting + c.counts.interesting,
      changed_thinking: acc.changed_thinking + c.counts.changed_thinking,
      patient_safety: acc.patient_safety + c.counts.patient_safety,
    }),
    { interesting: 0, changed_thinking: 0, patient_safety: 0 },
  );

  const topCase =
    mine.length === 0
      ? null
      : mine.reduce((top, c) =>
          engagementScore(c) > engagementScore(top) ? c : top,
        );

  return {
    casesByMonth,
    signal,
    totalReactionsReceived:
      signal.interesting + signal.changed_thinking + signal.patient_safety,
    topCase,
  };
}

export type PlatformAnalytics = {
  totalUsers: number;
  verifiedUsers: number;
  totalCases: number;
  casesByType: { type: string; count: number }[];
  openReports: number;
};

/**
 * Platform-wide numbers for the admin console. Returns null — not zeroes —
 * when the underlying read fails, same convention as everything else here:
 * an admin looking at "0 cases" pre-migration would read as a broken
 * platform rather than an unmigrated one.
 */
export async function getPlatformAnalytics(
  supabase: Client,
): Promise<PlatformAnalytics | null> {
  const [usersRes, verifiedRes, casesRes, reportsRes] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verified", true),
    supabase.from("cases").select("case_type"),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (casesRes.error) return null;

  const casesByTypeMap = new Map<string, number>();
  for (const row of casesRes.data ?? []) {
    const t = (row as { case_type: string | null }).case_type ?? "clinical_case";
    casesByTypeMap.set(t, (casesByTypeMap.get(t) ?? 0) + 1);
  }

  return {
    totalUsers: usersRes.count ?? 0,
    verifiedUsers: verifiedRes.count ?? 0,
    totalCases: casesRes.data?.length ?? 0,
    casesByType: [...casesByTypeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    // null (reports table missing pre-0009) reads the same as zero here,
    // which is fine: this one number degrading quietly on an unmigrated
    // project is a reasonable tradeoff against a null-checking dance for a
    // count that's advisory even when the table exists.
    openReports: reportsRes.count ?? 0,
  };
}

export type FeatureUsage = { event_type: string; count: number }[];

/**
 * Raw counts per tracked feature-usage event (0032_analytics_events.sql) —
 * "what are users clicking on." Returns null, not zeroes, on a failed read
 * (unmigrated project), same convention getPlatformAnalytics uses.
 */
export async function getFeatureUsage(supabase: Client): Promise<FeatureUsage | null> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_type")
    .in("event_type", [...FEATURE_USAGE_EVENTS]);

  if (error) return null;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.event_type, (counts.get(row.event_type) ?? 0) + 1);
  }

  // Every tracked event type appears even at zero, so the admin sees "not
  // used yet" rather than a feature silently missing from the list.
  return FEATURE_USAGE_EVENTS.map((event_type) => ({
    event_type,
    count: counts.get(event_type) ?? 0,
  }));
}

export type OnboardingFunnelStep = { event_type: string; count: number };
export type OnboardingFunnel = {
  steps: OnboardingFunnelStep[];
  loginScreenReached: number;
};

/**
 * "How far in the onboarding process do users get" — raw event counts per
 * step, in the order a new visitor actually hits them. Not distinct-user
 * counts: a page view is a page view, and the funnel already includes
 * signed-out visitors (welcome/signup/login) who have no user_id yet.
 */
export async function getOnboardingFunnel(supabase: Client): Promise<OnboardingFunnel | null> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_type")
    .in("event_type", [...ONBOARDING_FUNNEL_STEPS, "login_viewed"]);

  if (error) return null;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.event_type, (counts.get(row.event_type) ?? 0) + 1);
  }

  return {
    steps: ONBOARDING_FUNNEL_STEPS.map((event_type) => ({
      event_type,
      count: counts.get(event_type) ?? 0,
    })),
    loginScreenReached: counts.get("login_viewed") ?? 0,
  };
}

export type CategoryCount = { label: string; count: number };

const OTHER_LABEL = "Other";

/**
 * Collapses a normalized-key -> count map into the top N plus a single
 * "Other" bucket for the rest — the >~7-classes-that-carry-meaning rule: past
 * a handful, more slices stop being readable and folding the tail in is more
 * honest than a legend nobody can match to a sliver.
 */
function bucketTopN(counts: Map<string, number>, topN: number): CategoryCount[] {
  const sorted = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length <= topN) return sorted;

  const otherCount = sorted.slice(topN).reduce((sum, c) => sum + c.count, 0);
  return [...sorted.slice(0, topN), { label: OTHER_LABEL, count: otherCount }];
}

/**
 * role/specialty are free text (the onboarding form's own "Other" option
 * falls back to it, same as profiles.city) rather than an enum, so this
 * groups by a trimmed/lowercased key — the same lower(trim(...)) matching
 * Ask a Specialist (0012) already relies on for the same reason — and
 * displays the first-seen original casing for that key.
 */
async function groupByTextColumn(
  supabase: Client,
  column: "role" | "specialty",
  topN: number,
): Promise<CategoryCount[] | null> {
  // Selects both columns regardless of which one is asked for — a dynamic
  // column-name select loses its row typing in supabase-js (the return type
  // becomes a union it can't safely index by a variable key), and role +
  // specialty are two small text columns, cheap enough to over-fetch.
  const { data, error } = await supabase.from("profiles").select("role, specialty");
  if (error) return null;

  const counts = new Map<string, number>();
  const display = new Map<string, string>();
  for (const row of data ?? []) {
    const raw = column === "role" ? row.role : row.specialty;
    if (!raw || !raw.trim()) continue;
    const key = raw.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!display.has(key)) display.set(key, raw.trim());
  }

  return bucketTopN(counts, topN).map((c) => ({
    label: c.label === OTHER_LABEL ? OTHER_LABEL : (display.get(c.label) ?? c.label),
    count: c.count,
  }));
}

/** What kind of clinician is actually on the platform (profiles.role). */
export async function getPractitionerTypeBreakdown(
  supabase: Client,
  topN = 8,
): Promise<CategoryCount[] | null> {
  return groupByTextColumn(supabase, "role", topN);
}

/** Which specialties are represented (profiles.specialty). */
export async function getSpecialtyBreakdown(
  supabase: Client,
  topN = 8,
): Promise<CategoryCount[] | null> {
  return groupByTextColumn(supabase, "specialty", topN);
}

/**
 * Where members practice (profiles.country_code, 0026) — the only location
 * this app ever collects; there is no city/region-level tracking to break
 * down further than this.
 */
export async function getCountryBreakdown(
  supabase: Client,
  topN = 8,
): Promise<CategoryCount[] | null> {
  const { data, error } = await supabase.from("profiles").select("country_code");
  if (error) return null;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.country_code) continue;
    counts.set(row.country_code, (counts.get(row.country_code) ?? 0) + 1);
  }

  return bucketTopN(counts, topN).map((c) => ({
    label: c.label === OTHER_LABEL ? OTHER_LABEL : (countryName(c.label) ?? c.label),
    count: c.count,
  }));
}

export type DailyCount = { date: string; count: number };

function daysAgo(days: number): Date {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);
  return since;
}

/** Every day in `[since, since+days)` appears even at zero, so a quiet day
 *  reads as "nothing happened" rather than a missing point on the line. */
function buildDailySeries(timestamps: string[], since: Date, days: number): DailyCount[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const day = ts.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const result: DailyCount[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return result;
}

/**
 * New members per day for the last `days` days. This is a signup trend, not
 * a login/session metric — there is no last-sign-in or session tracking
 * anywhere in this app yet (Supabase Auth records it internally, but nothing
 * here reads it), so this is the honest "activity over time" signal that
 * actually exists.
 */
export async function getSignupTrend(
  supabase: Client,
  days = 30,
): Promise<DailyCount[] | null> {
  const since = daysAgo(days);
  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", since.toISOString());

  if (error) return null;
  return buildDailySeries(data?.map((r) => r.created_at) ?? [], since, days);
}

/** Cases posted per day — the other half of "is the platform growing," not
 *  just who's joining but whether they're actually using it. */
export async function getCasesTrend(
  supabase: Client,
  days = 30,
): Promise<DailyCount[] | null> {
  const since = daysAgo(days);
  const { data, error } = await supabase
    .from("cases")
    .select("created_at")
    .gte("created_at", since.toISOString());

  if (error) return null;
  return buildDailySeries(data?.map((r) => r.created_at) ?? [], since, days);
}

/** Reactions (0010's clinical-value reactions) per day — engagement with what's
 *  already posted, the third leg alongside growth (signups) and output (cases). */
export async function getReactionsTrend(
  supabase: Client,
  days = 30,
): Promise<DailyCount[] | null> {
  const since = daysAgo(days);
  const { data, error } = await supabase
    .from("analytics_events")
    .select("created_at")
    .eq("event_type", "reaction_toggled")
    .gte("created_at", since.toISOString());

  if (error) return null;
  return buildDailySeries(data?.map((r) => r.created_at) ?? [], since, days);
}
