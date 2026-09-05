import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getViewerProfile } from "@/lib/auth";
import { localeDir } from "@/lib/i18n";
import { NativeBootstrap } from "@/components/native-bootstrap";

// Single clean sans-serif for the whole app — see theme.css for how this
// maps to --font-headline / --font-body / --font-label.
const bodyFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Needed so file-based images (opengraph-image.tsx, twitter-image.tsx)
  // resolve to an absolute og:image/twitter:image URL — without it Next
  // emits one relative to the request, which most link-unfurlers won't
  // fetch. Same env var and fallback sitemap.ts/robots.ts already use.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Asyashare",
  description:
    "A clinical knowledge network for verified medical professionals.",
  // favicon.ico itself is served via the src/app/favicon.ico file convention
  // (Next injects that link automatically) — these add the sharper SVG mark
  // and the icon Apple actually uses for "Add to Home Screen".
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  // Tints the mobile browser chrome — keep in sync with --bg in theme.css.
  themeColor: "#f6f8fc",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // "cover" lets the page draw under the iPhone notch/Dynamic Island and
  // the home-indicator area instead of a native browser reserving a strip
  // for its own chrome there — required once this is wrapped in Capacitor,
  // where there is no browser chrome to reserve that space at all. Content
  // then has to inset itself with env(safe-area-inset-*) (globals.css) or
  // it sits under the notch/home indicator.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Signed-out visitors and any request where the profile read fails get
  // English — there's no preference to read yet, and defaulting to English
  // rather than failing the whole page is the same "degrade, don't break"
  // stance every other read in this app takes.
  const profile = await getViewerProfile();
  const locale = profile?.locale ?? "en";

  return (
    <html
      lang={locale}
      dir={localeDir(locale)}
      className={`${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <NativeBootstrap />
        {children}
      </body>
    </html>
  );
}
