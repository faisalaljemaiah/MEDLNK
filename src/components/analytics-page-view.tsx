"use client";

import { useEffect } from "react";
import { trackEventAction } from "@/app/actions/analytics";
import type { AnalyticsEventType } from "@/lib/analytics-events";

/** Renders nothing — fires one page-view event on mount. Drop it into any
 *  page (server or client component) to add it to the onboarding funnel. */
export function AnalyticsPageView({ event }: { event: AnalyticsEventType }) {
  useEffect(() => {
    trackEventAction(event);
    // Fire once per mount only — not on every re-render this effect's own
    // dependency array would otherwise catch nothing else changing anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
