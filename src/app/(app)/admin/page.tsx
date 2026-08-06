import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveUserAction, rejectUserAction } from "@/app/actions/admin";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) redirect("/");

  const { data: pending } = await supabase
    .from("profiles")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-xl text-text">Verification queue</h1>
      <p className="mt-1 text-sm text-muted">
        Manually approve or reject new sign-ups based on their license
        number. No automated license checking yet.
      </p>

      {!pending || pending.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          Nothing pending — you&apos;re all caught up.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {pending.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
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
      )}
    </div>
  );
}
