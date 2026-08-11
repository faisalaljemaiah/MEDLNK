import Link from "next/link";
import { acknowledgeSafetyAlertAction } from "@/app/actions/safety-alerts";
import type { LiveSafetyAlert } from "@/lib/safety-alerts";

/**
 * Live safety alerts, above everything else (spec §17).
 *
 * The only thing in the app that interrupts rather than waits its turn. That is
 * the whole justification for the feature — a hazard other clinicians need to
 * know about now cannot depend on them scrolling far enough — so it is also the
 * reason it has to stay rare and dismissible. Each one goes away permanently
 * for this reader the moment they acknowledge it.
 */
export function SafetyAlertBanner({ alerts }: { alerts: LiveSafetyAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-4 pt-4">
      {alerts.map((a) => (
        <article
          key={a.id}
          className="rounded-xl border border-danger/40 bg-danger/5 p-3.5"
        >
          <p className="font-label text-xs uppercase tracking-wide text-danger">
            ⚠️ Safety alert
          </p>
          <Link
            href={a.case_number ? `/case/${a.case_number}` : "#"}
            className="mt-1 block font-headline text-base text-text hover:underline"
          >
            {a.title}
          </Link>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {a.short_caption}
          </p>

          <div className="mt-2.5 flex items-center gap-3">
            <Link
              href={a.case_number ? `/case/${a.case_number}` : "#"}
              className="font-label text-xs text-danger underline-offset-2 hover:underline"
            >
              Read it
            </Link>
            <form action={acknowledgeSafetyAlertAction.bind(null, a.id)}>
              <button
                type="submit"
                className="rounded-full border border-danger/40 px-3 py-1 font-label text-xs text-danger transition-transform duration-150 ease-out active:scale-95"
              >
                Got it
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
