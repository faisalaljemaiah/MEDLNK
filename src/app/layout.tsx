import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getViewerProfile } from "@/lib/auth";
import { localeDir } from "@/lib/i18n";

// Single clean sans-serif for the whole app — see theme.css for how this
// maps to --font-headline / --font-body / --font-label.
const bodyFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEDLNK",
  description:
    "A clinical knowledge network for verified medical professionals.",
};

export const viewport: Viewport = {
  // Tints the mobile browser chrome — keep in sync with --bg in theme.css.
  themeColor: "#f6f8fc",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        {children}
      </body>
    </html>
  );
}
