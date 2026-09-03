import { setStudentModeAction } from "@/app/actions/student-mode";

/**
 * A form, not a client component: one boolean, one submit, no state to keep in
 * sync with the server.
 */
export function StudentModeToggle({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">Student mode</p>
        <p className="mt-0.5 text-xs text-muted">
          Puts Learn first, so the app opens on what to practise rather than
          what&apos;s new. Everything else stays the same — you can still
          post, reply and follow.
        </p>
      </div>

      <form action={setStudentModeAction.bind(null, !enabled)}>
        <button
          type="submit"
          className={
            enabled
              ? "shrink-0 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 font-label text-xs text-accent"
              : "shrink-0 rounded-full border border-line px-4 py-1.5 font-label text-xs text-muted hover:text-text"
          }
        >
          {enabled ? "On — turn off" : "Off — turn on"}
        </button>
      </form>
    </div>
  );
}
