"use client";

import { useState } from "react";

/**
 * Blind Cases: keeps the closing section covered until the reader asks for it,
 * so they commit to their own reasoning first.
 *
 * This is a reading aid, not a security control — the text ships with the page.
 * That's the right trade here: the content is public either way, and gating it
 * server-side would cost a round trip to protect nothing. Where hiding genuinely
 * matters (the answer to an interactive question) it is enforced in the
 * database instead.
 */
export function RevealSection({
  label,
  children,
  prompt = "Reveal",
  hint,
}: {
  label: string;
  children: React.ReactNode;
  prompt?: string;
  hint?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <div className="animate-enter">
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          {label}
        </p>
        <div className="mt-1.5">{children}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-accent-2/50 bg-accent-2/5 p-4">
      <p className="font-label text-xs uppercase tracking-wide text-accent-2">
        {label} — hidden
      </p>
      <p className="mt-1 text-sm text-muted">
        {hint ?? "Work through the case first, then reveal it."}
      </p>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="mt-3 rounded-lg border border-accent-2/50 px-3.5 py-2 text-sm font-medium text-accent-2 transition-transform duration-150 ease-out active:scale-95"
      >
        {prompt}
      </button>
    </div>
  );
}
