import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in-only surfaces with nothing to index, plus auth/admin
      // routes that shouldn't turn up in search results.
      disallow: [
        "/admin",
        "/settings",
        "/messages",
        "/notifications",
        "/onboarding",
        "/analytics",
        "/consults",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
