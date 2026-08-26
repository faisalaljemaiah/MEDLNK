import { redirect } from "next/navigation";
import { getViewer, getViewerProfile } from "@/lib/auth";
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
