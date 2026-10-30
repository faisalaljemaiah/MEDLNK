import { redirect } from "next/navigation";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin-dashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    resolved?: string;
    uq?: string;
    cq?: string;
  }>;
}) {
  const { tab, resolved, uq, cq } = await searchParams;
  const user = await getViewer();

  if (!user) redirect("/login");
  const me = await getViewerProfile();
  if (!me?.is_admin) redirect("/");

  // Admin accounts hold the keys to every member's data (and, via the
  // Requests tab, their verification documents) — a password alone isn't
  // enough to guard that. src/app/(app)/layout.tsx already forces a 2FA
  // *challenge* on sign-in for anyone who has enrolled; this additionally
  // refuses to even render the panel for an admin who never enrolled at
  // all, sending them to set it up first rather than silently letting a
  // password-only admin session through.
  const supabase = await createClient();
  const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
  const hasMfa = Boolean(mfaFactors?.totp && mfaFactors.totp.length > 0);
  if (!hasMfa) redirect("/settings?require2fa=admin");

  return (
    <AdminDashboard
      tab={tab}
      resolved={resolved === "1"}
      userQuery={uq}
      caseQuery={cq}
      basePath="/admin"
      viewerHandle={me.handle}
    />
  );
}
