"use client";

import { clsx } from "clsx";
import { SpeakerWaveIcon, StopIcon } from "@/components/icons";
import { useReadAloud } from "@/components/read-aloud-context";

/**
 * Starts/stops the SpeechSynthesisUtterance that ReadAloudProvider owns —
 * the actual speech lifecycle lives there, not here, since a case page
 * wraps its whole write-up in one provider so every HighlightSentence
 * scattered through it can react to the same state this button toggles.
 */
export function ReadAloudButton() {
  const { supported, speaking, toggle } = useReadAloud();

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      aria-label={speaking ? "Stop reading aloud" : "Read case aloud"}
      className={clsx(
        "flex items-center gap-1.5 rounded-full border-2 border-audio px-3 py-1.5 text-sm font-medium text-audio transition-transform duration-150 ease-out active:scale-95",
        speaking ? "audio-pulse-active" : "audio-pulse",
      )}
    >
      {speaking ? <StopIcon width={16} height={16} /> : <SpeakerWaveIcon width={16} height={16} />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
