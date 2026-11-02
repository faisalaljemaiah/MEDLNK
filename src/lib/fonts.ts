import localFont from "next/font/local";

/**
 * Gloock (OFL, see src/app/(auth)/fonts/Gloock-OFL.txt) — the stamped
 * headline face for the sign-up flow. Exposed as the --font-stamp CSS
 * variable and read by .font-stamp (globals.css). Applied on the layouts
 * that actually use it, so it's only preloaded on those routes.
 */
export const stampFont = localFont({
  src: "../app/(auth)/fonts/Gloock-Regular.ttf",
  variable: "--font-stamp",
  display: "swap",
});
