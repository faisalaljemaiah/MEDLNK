import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/welcome`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Anon, unauthenticated client — case pages are public (RLS lets anon
  // read cases, same as the signed-out home feed), and a sitemap request
  // has no viewer to scope a session to anyway.
  const supabase = createClient(supabaseUrl(), supabaseAnonKey());
  const { data: cases } = await supabase
    .from("cases")
    .select("case_number, created_at")
    .not("case_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  const caseRoutes: MetadataRoute.Sitemap = (cases ?? []).map((c) => ({
    url: `${siteUrl}/case/${c.case_number}`,
    lastModified: c.created_at,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...caseRoutes];
}
