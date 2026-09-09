"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SentenceRange } from "@/lib/text-segments";

type ReadAloudContextValue = {
  supported: boolean;
  speaking: boolean;
  /** The sentence id currently being spoken (see HighlightSentence), or
   *  null when nothing is playing. */
  activeId: string | null;
  toggle: () => void;
};

const ReadAloudContext = createContext<ReadAloudContextValue | null>(null);

export function useReadAloud() {
  const ctx = useContext(ReadAloudContext);
  if (!ctx) {
    throw new Error("useReadAloud must be used within a ReadAloudProvider");
  }
  return ctx;
}

/**
 * Owns the one SpeechSynthesisUtterance for a case page — shared between
 * ReadAloudButton (which starts/stops it) and every HighlightSentence
 * scattered through the write-up (which light up while the utterance is
 * over their sentence). `ranges` comes from buildSpokenText
 * (src/lib/text-segments.ts), built server-side alongside `text` itself so
 * the sentence ids always line up with what's actually being spoken.
 */
export function ReadAloudProvider({
  text,
  ranges,
  children,
}: {
  text: string;
  ranges: SentenceRange[];
  children: React.ReactNode;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    function check() {
      setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    }
    check();
    // Leaving the page (or the case content changing under this provider)
    // must not leave a voice narrating a screen the reader has already
    // moved past.
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setActiveId(null);
      return;
    }
    if (!text.trim()) return;

    // Cancel first — Chrome's queue otherwise stacks a second utterance
    // behind whatever (if anything) is already speaking instead of
    // replacing it.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onboundary = (event) => {
      const range = ranges.find((r) => event.charIndex >= r.start && event.charIndex < r.end);
      if (range) setActiveId(range.id);
    };
    utterance.onend = () => {
      setSpeaking(false);
      setActiveId(null);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setActiveId(null);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <ReadAloudContext.Provider value={{ supported, speaking, activeId, toggle }}>
      {children}
    </ReadAloudContext.Provider>
  );
}
