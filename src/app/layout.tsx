import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        {children}
      </body>
    </html>
  );
}
