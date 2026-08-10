import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getFeedCases } from "@/lib/cases";
import { CaseCard } from "@/components/case-card";

export default async function FeedPage() {
  const supabase = await createClient();
  const user = await getViewer();

  const cases = await getFeedCases(supabase, user?.id ?? null);

  return (
    <div>
      {cases.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          No cases yet — be the first to share one.
        </p>
      ) : (
        cases.map((c) => <CaseCard key={c.id} feedCase={c} path="/" />)
      )}
    </div>
  );
}
