/**
 * Splits prose into sentence-sized chunks that, concatenated in order,
 * reproduce the original string exactly — including whitespace and line
 * breaks. That guarantee is what lets a caller render each chunk as its
 * own `<span>` (see HighlightSentence) with zero visual difference from
 * rendering the plain string, while still having a per-sentence unit to
 * highlight as ReadAloudButton reads through it.
 *
 * A single regex match on ".", "!", "?" isn't safe here: a decimal like
 * "7.2" or a unit like "98.6" has a "." with no following space, and a
 * naive `[^.!?]*[.!?]+` alternation can fail to match at that position and
 * have `String.match` silently skip past those characters entirely — not
 * just a wrong split, but actually dropping and reordering text (caught
 * live: "Potassium came back at 7.2." rendered as "2.tassium came back at
 * 7.2."). Scanning character-by-character and only treating a terminator
 * as a boundary when it's followed by whitespace or the end of the string
 * guarantees every character ends up in exactly one chunk, in order.
 *
 * Doesn't need to be linguistically perfect otherwise (an abbreviation
 * like "Dr." followed by a capitalized name will still split early) — the
 * cost of a wrong split there is one sentence highlighting a beat early,
 * not lost or reordered text.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    const next = text[i + 1];
    if (next !== undefined && !/\s/.test(next)) continue;
    let end = i + 1;
    while (end < text.length && /[.!?\s]/.test(text[end])) end++;
    sentences.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) sentences.push(text.slice(start));
  return sentences.filter((s) => s.length > 0);
}

export type SpokenSegment = { id: string | null; text: string };
export type SentenceRange = { id: string; start: number; end: number };

/**
 * Builds the flat string a SpeechSynthesisUtterance actually reads, plus
 * the character range each highlightable segment occupies within it.
 * ReadAloudProvider maps the utterance's reported charIndex (from the
 * browser's boundary event) to whichever range contains it, to know which
 * sentence to highlight — this works whether the browser fires that event
 * per word or only per sentence, since either way the reported index lands
 * inside the right range.
 *
 * A segment with id: null is spoken but has nothing on the page to
 * highlight — section labels ("Presentation") and other connective text
 * that reads naturally aloud but isn't itself part of the write-up.
 */
export function buildSpokenText(segments: SpokenSegment[]): {
  text: string;
  ranges: SentenceRange[];
} {
  let text = "";
  const ranges: SentenceRange[] = [];
  for (const segment of segments) {
    const trimmed = segment.text.trim();
    if (!trimmed) continue;
    if (text.length > 0) text += " ";
    const start = text.length;
    text += trimmed;
    if (segment.id) ranges.push({ id: segment.id, start, end: text.length });
  }
  return { text, ranges };
}
