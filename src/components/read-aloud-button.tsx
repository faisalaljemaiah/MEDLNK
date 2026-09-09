"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { SpeakerWaveIcon, StopIcon } from "@/components/icons";

/**
 * Text-to-speech via the browser's own SpeechSynthesis API — no server, no
 * API key, no per-use cost. On the Capacitor-wrapped iOS/Android builds
 * this reaches the same system voices Siri/Android's assistant use, not a
 * canned robotic one. Renders nothing when the API isn't available (older
 * WebViews, some desktop browsers) rather than a button that would just
 * silently fail on click.
 */
export function ReadAloudButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    function check() {
      setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    }
    check();
    // Leaving the page (or the case content changing under this button)
    // must not leave a voice narrating a screen the reader has already
    // moved past.
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  if (!supported || !text.trim()) return null;

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    // Cancel first — Chrome's queue otherwise stacks a second utterance
    // behind whatever (if anything) is already speaking instead of
    // replacing it.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

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
