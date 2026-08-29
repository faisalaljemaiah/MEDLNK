"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

/**
 * No-ops entirely in the browser (Capacitor.isNativePlatform() is false
 * there) — this only does anything inside the wrapped iOS/Android app.
 * Mounted once in the root layout.
 *
 * Handles the three things a bare WebView doesn't get for free, all of
 * which App Store/Play reviewers actually look for on a web-wrapped app:
 * hiding the native splash screen once the real page has painted, matching
 * the status bar's text color to Asyashare's light theme, and making
 * Android's hardware/gesture back button behave like a back button (go
 * back in-app, only exit at the true root) instead of the OS default of
 * closing the WebView's own history, which doesn't know about Next.js's
 * client-side router.
 */
export function NativeBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;

    (async () => {
      const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
        import("@capacitor/app"),
      ]);

      await SplashScreen.hide().catch(() => {});
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          router.back();
        } else {
          App.exitApp();
        }
      });
      removeListener = () => listener.remove();
    })();

    return () => removeListener?.();
  }, [router]);

  return null;
}
