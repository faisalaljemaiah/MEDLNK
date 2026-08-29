import type { CapacitorConfig } from "@capacitor/cli";

/**
 * This wraps the real, live Next.js site — it does not bundle a copy of
 * it. MEDLNK is full Next.js SSR (Server Actions, Server Components doing
 * a per-request Supabase read, cookie-based auth via src/proxy.ts) — none
 * of that has a static-export equivalent (`output: 'export'` supports
 * none of it), so `webDir` below is a harmless placeholder Capacitor
 * requires to exist, and `server.url` is what actually matters: the
 * native shell's WebView just navigates to the deployed site.
 *
 * Update `server.url` to the real production domain — the same value
 * NEXT_PUBLIC_SITE_URL should already be set to (see .env.example) —
 * before building for an actual App Store/Play Store submission. Left
 * pointing at localhost by default so a debug build against `next dev`
 * works out of the box.
 */
const serverUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "com.medlnk.app",
  appName: "MEDLNK",
  webDir: "public/capacitor-www",
  server: {
    url: serverUrl,
    // Only ever true for plain-http localhost during development — both
    // stores flag cleartext traffic without justification, and iOS's App
    // Transport Security blocks it by default anyway. Once NEXT_PUBLIC_SITE_URL
    // is a real https production domain this is false automatically.
    cleartext: serverUrl.startsWith("http://"),
  },
  ios: {
    // Lets content draw edge-to-edge; the app's own safe-area CSS
    // (globals.css, top-header.tsx, bottom-nav.tsx) insets it correctly
    // rather than the WebView reserving its own strip on top of that.
    contentInset: "never",
  },
};

export default config;
