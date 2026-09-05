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
  // Applied to every response. No Content-Security-Policy here yet — this
  // app loads external fonts/scripts in a few places, and a wrong CSP fails
  // silently in the browser (broken fonts, dead buttons) rather than
  // erroring loudly, so it needs its own pass with a real click-through
  // test rather than being bundled into a general hardening change.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Blocks this site from being loaded in an <iframe> on another
          // origin (clickjacking). Doesn't affect the Capacitor app — that
          // WebView navigates to the site directly, it doesn't frame it.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from guessing a file's type from its content
          // and executing it as something else (e.g. a case image upload
          // that a browser might otherwise sniff and render as HTML/JS).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Full URL to a same-origin page, only the origin to a
          // cross-origin one — a case number or handle in the path
          // shouldn't leak into another site's referer log.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Tells browsers to only ever reach this host over HTTPS for the
          // next two years, subdomains included — the app is already
          // HTTPS-only end to end (capacitor.config.ts's cleartext check,
          // Vercel's own TLS termination), this just makes that a
          // browser-enforced guarantee instead of only a server behavior.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // Explicitly denies browser features this app never uses via
          // getUserMedia/geolocation JS APIs — file inputs still reach the
          // OS's native camera/photo picker for avatar and case uploads,
          // which this does not affect.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
