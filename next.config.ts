import type { NextConfig } from "next";
import path from "path";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // Default is 1MB, which silently broke every image/video upload past
      // that size with a raw "Body exceeded 1 MB limit" crash rather than the
      // friendly validateImageUpload/validateVideoUpload error — case photos
      // (validateImageUpload) are capped at 8MB and case videos
      // (validateVideoUpload) at 50MB (see src/lib/uploads.ts and the
      // matching storage bucket limits in supabase/migrations), so this
      // needs to clear the larger of the two with room for multipart
      // overhead.
      bodySizeLimit: "52mb",
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
