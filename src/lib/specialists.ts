import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  SpecialistAnswer,
  SpecialistRequest,
} from "@/lib/database.types";
import type { FeedAuthor } from "@/lib/cases";

type Client = SupabaseClient<Database>;

export type SpecialistAnswerView = SpecialistAnswer & {
  responder: FeedAuthor | null;
};

export type SpecialistThread = SpecialistRequest & {
  requester: FeedAuthor | null;
  answers: SpecialistAnswerView[];
};

const THREAD_SELECT =
  "*," +
  "requester:profiles!specialist_requests_requester_id_fkey(id,handle,full_name,role,verified,badge_tier,avatar_url)," +
  "specialist_answers(*,responder:profiles!specialist_answers_responder_id_fkey(id,handle,full_name,role,verified,badge_tier,avatar_url))";

type ThreadRow = SpecialistRequest & {
  requester: FeedAuthor | null;
  specialist_answers: SpecialistAnswerView[] | null;
};

function toThread(row: ThreadRow): SpecialistThread {
  const answers = [...(row.specialist_answers ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const rest = { ...row } as Partial<ThreadRow>;
  delete rest.specialist_answers;
  return { ...(rest as SpecialistRequest & { requester: FeedAuthor | null }), answers };
}

/**
 * Every specialist ask on a case, with its answers, in one round trip.
 *
 * Returns null rather than [] when the read fails — 0012 has to be applied by
 * hand on the hosted project, and an empty thread and an absent feature look
 * identical on screen otherwise.
 */
export async function getCaseSpecialistThreads(
  supabase: Client,
  caseId: string,
): Promise<SpecialistThread[] | null> {
  const { data, error } = await supabase
    .from("specialist_requests")
    .select(THREAD_SELECT)
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  if (error) return null;
  return ((data ?? []) as unknown as ThreadRow[]).map(toThread);
}

export type ConsultRequest = SpecialistThread & {
  subject_case: { case_number: string | null; title: string } | null;
};

/**
 * The open asks waiting on the viewer's specialty.
 *
 * Matched on lower(trim(...)) because profiles.specialty is free text, so
 * "Cardiology" and " cardiology " are the same specialty and a case-sensitive
 * comparison would quietly hide half the queue. PostgREST has no lower() filter,
 * so the narrowing happens in JS over the open-request set — fine while a
 * platform-wide open queue is small, and the index is there for when it isn't.
 */
export async function getOpenConsults(
  supabase: Client,
  specialty: string | null,
): Promise<ConsultRequest[] | null> {
  const wanted = specialty?.trim().toLowerCase();
  if (!wanted) return [];

  const { data, error } = await supabase
    .from("specialist_requests")
    .select(
      `${THREAD_SELECT},subject_case:cases!specialist_requests_case_id_fkey(case_number,title)`,
    )
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (error) return null;

  const rows = data as unknown as (ThreadRow & {
    subject_case: { case_number: string | null; title: string } | null;
  })[];

  return (rows ?? [])
    .filter((r) => r.specialty.trim().toLowerCase() === wanted)
    .map((r) => ({ ...toThread(r), subject_case: r.subject_case }));
}
