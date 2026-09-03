"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { createCaseAction } from "@/app/actions/case";
import { polishDraftAction, type PolishedField } from "@/app/actions/ai";
import { CASE_TYPES, NEAR_MISS_PROMPTS, caseTypeMeta } from "@/lib/case-types";
import { countryName } from "@/lib/countries";
import { toUploadableImage } from "@/lib/heic";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AIButton } from "@/components/ui/ai-button";
import { ReelIcon } from "@/components/icons";

/** Longest title auto-derived from a video's caption — long enough to read
 *  as a real headline in the Spool info-peel, short enough to stay a
 *  headline rather than repeating the whole caption verbatim. */
const VIDEO_TITLE_MAX = 60;

/** Free-text fields worth copy-editing — specialty and tags are controlled vocabulary. */
const POLISH_FIELDS = [
  "title",
  "short_caption",
  "presentation",
  "tricky",
  "actions",
  "lesson",
] as const;

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  short_caption: "Short caption",
  presentation: "Presentation",
  tricky: "What was tricky",
  actions: "What we did",
  lesson: "The lesson",
};

function Textarea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={props.name}
        className="font-label text-xs uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <textarea
        id={props.name}
        className="min-h-24 resize-y rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        {...props}
      />
    </div>
  );
}

/**
 * A pick-your-own-sections toggle, same pill styling as the post-type and
 * Attach-kind buttons — tap to include that section's textarea below, tap
 * again to remove it (and its text along with it, since the field
 * unmounts). Used for both the full-case body and the Patient Safety
 * prompts: neither forces every prompt any more, just at least one.
 */
function SectionChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-full border px-3 py-1.5 text-sm transition-colors duration-150",
        active
          ? "border-accent bg-accent/10 font-medium text-accent"
          : "border-line text-muted hover:text-text",
      )}
    >
      {label}
    </button>
  );
}

/**
 * One of the four numbered groups the form is organized into — Case,
 * Clinical Context, Global Exchange, Supporting Material. The connecting
 * line between them is a single element drawn by the parent (not one per
 * section), so it reads as one continuous thread rather than four
 * separately-aligned segments; each circle just needs an opaque background
 * to visually sit "on" that line, which is why it's --color-surface rather
 * than the accent-soft wash used elsewhere.
 */
function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-10">
      <div className="relative z-[1] mb-3 flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-surface font-label text-xs font-semibold text-accent shadow-[0_1px_2px_rgb(var(--shadow-tint)/0.08)]">
          {number}
        </span>
        <p className="font-label text-xs uppercase tracking-wide text-muted">{title}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function ComposeForm({
  initialType = "clinical_case",
  viewerCountryCode = null,
}: {
  /** Preselects the post-type picker — e.g. a Home page quick-create action
   *  linking in as `/compose?type=what_would_you_do`. Falls back to the
   *  standard format for an unknown value, same as caseTypeMeta everywhere
   *  else. */
  initialType?: string;
  /** Display-only (0026) — the case's actual country is set server-side
   *  from the author's profile, never from anything this form submits. */
  viewerCountryCode?: string | null;
}) {
  const [state, action] = useActionState(createCaseAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const acknowledgeRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [convertingImage, setConvertingImage] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [suggestions, setSuggestions] = useState<PolishedField[]>([]);
  const [polishNote, setPolishNote] = useState<string | null>(null);
  const [isPolishing, startPolish] = useTransition();
  const [caseType, setCaseType] = useState<string>(
    () => caseTypeMeta(initialType).value,
  );
  // Only shown/used for full-write-up formats — every other format still
  // decides its media entirely from the post type (see typeMeta below).
  const [mediaKind, setMediaKind] = useState<"none" | "photo" | "video">(
    "none",
  );
  // Which of the full-case/Patient-Safety sections the author has chosen to
  // write — none forced any more, just at least one (enforced server-side
  // in createCaseAction). Empty by default: "add a section" reads as an
  // invitation, not four blank required boxes.
  const [bodySections, setBodySections] = useState<string[]>([]);
  const [nearMissSections, setNearMissSections] = useState<string[]>([]);
  const [mediaPlacement, setMediaPlacement] = useState("top");

  // Spool's minimal video composer (below) has no visible title field — the
  // server still requires one (every case needs a headline elsewhere in the
  // app), so it's derived from the caption as the author types and carried
  // in a hidden input instead of asked for twice.
  const videoTitleRef = useRef<HTMLInputElement>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleCaptionInputForTitle(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!videoTitleRef.current) return;
    const trimmed = e.target.value.trim();
    videoTitleRef.current.value = trimmed
      ? trimmed.length > VIDEO_TITLE_MAX
        ? `${trimmed.slice(0, VIDEO_TITLE_MAX)}…`
        : trimmed
      : "Video";
  }

  const typeMeta = caseTypeMeta(caseType);
  const showFullBody = !typeMeta.shortForm && !typeMeta.usesNearMiss;

  const FULL_BODY_SECTIONS = [
    { name: "presentation", label: "Presentation" },
    { name: "tricky", label: "What was tricky" },
    { name: "actions", label: "What we did" },
    {
      name: "lesson",
      label: typeMeta.usesStagedReveal ? "The lesson (hidden until reveal)" : "The lesson",
    },
  ] as const;

  // A media placement pointing at a section the author has since removed
  // would silently attach the photo/video to a section that never renders —
  // derived during render rather than corrected after the fact in an
  // effect, since it's a pure function of state already in hand.
  const effectiveMediaPlacement =
    mediaPlacement !== "top" && !bodySections.includes(mediaPlacement)
      ? "top"
      : mediaPlacement;

  const warning = state && "warning" in state ? state.warning : null;
  const error = state && "error" in state ? state.error : null;

  function fieldElement(name: string) {
    return formRef.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
  }

  function handlePolish() {
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const fields: Record<string, string> = {};
    for (const name of POLISH_FIELDS) {
      const value = String(data.get(name) ?? "");
      if (value.trim()) fields[name] = value;
    }

    setSuggestions([]);
    setPolishNote(null);

    if (Object.keys(fields).length === 0) {
      setPolishNote("Write something first and I'll tidy it up.");
      return;
    }

    startPolish(async () => {
      const result = await polishDraftAction(fields);
      setSuggestions(result.suggestions);
      setPolishNote(result.message ?? null);
    });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const input = imageInputRef.current;
    if (!file || !input) return;

    setConvertingImage(true);
    try {
      const uploadable = await toUploadableImage(file);
      if (uploadable !== file) {
        const transfer = new DataTransfer();
        transfer.items.add(uploadable);
        input.files = transfer.files;
      }
    } catch {
      // Conversion failed — leave the original file. The server-side check
      // in validateImageUpload will give a clear rejection if it can't be
      // used, same as it would have before conversion existed.
    } finally {
      setConvertingImage(false);
    }
  }

  function acceptOne(field: string) {
    const suggestion = suggestions.find((s) => s.field === field);
    if (!suggestion) return;
    const el = fieldElement(field);
    if (el) el.value = suggestion.after;
    setSuggestions((prev) => prev.filter((s) => s.field !== field));
  }

  function acceptAll() {
    for (const suggestion of suggestions) {
      const el = fieldElement(suggestion.field);
      if (el) el.value = suggestion.after;
    }
    setSuggestions([]);
  }

  // Video is Spool's format, and Spool is TikTok/Instagram-shaped: pick a
  // clip, write a caption, post — not the numbered multi-section template
  // every other format uses. Everything the rest of the app needs (a title,
  // the de-identification warning flow, the same legal checkbox every case
  // requires) still happens, just without asking for it as separate steps.
  if (typeMeta.requiresVideo) {
    return (
      <form ref={formRef} action={action} className="flex flex-col gap-5">
        <input type="hidden" name="acknowledge_warning" ref={acknowledgeRef} defaultValue="false" />
        <input type="hidden" name="case_type" value={caseType} />
        <input type="hidden" name="title" ref={videoTitleRef} defaultValue="Video" />

        <label
          htmlFor="video"
          className="relative flex aspect-[9/16] max-h-[65vh] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 text-center transition-colors duration-150 hover:border-accent"
        >
          {videoPreviewUrl ? (
            <video
              src={videoPreviewUrl}
              muted
              loop
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <ReelIcon width={22} height={22} strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-text">Choose a video</span>
              <span className="px-6 text-xs text-muted">
                From your camera roll — MP4, WebM or MOV, up to 50MB.
              </span>
            </>
          )}
          <input
            id="video"
            name="video"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mov"
            required
            onChange={handleVideoFileChange}
            className="sr-only"
          />
        </label>

        <Textarea
          label="Caption"
          name="short_caption"
          placeholder="A sentence or two — what you saw and why it stuck with you."
          onChange={handleCaptionInputForTitle}
          required
        />

        <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-3 text-xs leading-relaxed text-muted">
          <span className="font-medium text-text">Keep it de-identified.</span>{" "}
          No patient names, medical record numbers, addresses, or footage that
          could identify someone.
        </p>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {warning && (
          <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <p className="text-sm text-warning">⚠ {warning}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (acknowledgeRef.current) acknowledgeRef.current.value = "true";
                  formRef.current?.requestSubmit();
                }}
                className="rounded-lg border border-warning/50 px-3.5 py-2 text-sm text-warning"
              >
                Post anyway
              </button>
              <p className="self-center text-xs text-muted">
                or edit the caption and post again
              </p>
            </div>
          </div>
        )}

        <label className="flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger/5 px-3.5 py-3 text-xs leading-relaxed text-text">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            required
            className="mt-0.5 size-3.5 shrink-0 accent-[var(--danger)]"
          />
          <span>
            I confirm this post contains no real patient names, medical record
            numbers, identifying footage, or other personally identifying
            information, and that everything I&apos;ve written is accurate to
            the best of my knowledge. I understand I am solely responsible for
            what I post, and that if patient-identifiable information — in
            text or in the video — is found, my account will be{" "}
            <span className="font-medium">permanently blocked from Asyashare</span>{" "}
            — I will not be able to sign up again.
          </span>
        </label>

        <SubmitButton disabled={!agreedToTerms}>Post</SubmitButton>
      </form>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="acknowledge_warning" ref={acknowledgeRef} defaultValue="false" />

      <input type="hidden" name="case_type" value={caseType} />

      {/* The four groups below share one continuous connecting line — Case →
          Clinical Context → Global Exchange → Supporting Material, the same
          order the AI features and the profile page already imply: the raw
          case becomes something searchable and shareable in stages. The line
          is one absolutely-positioned element behind all four circles rather
          than one per section, so it reads as a single thread. Plain accent,
          not the AI-hue sweep — composing a case isn't an AI feature. */}
      <div className="relative flex flex-col gap-8">
        <span
          aria-hidden
          className="absolute left-[13px] top-3.5 bottom-3.5 w-px bg-accent opacity-30"
        />

        <FormSection number="01" title="The Case">
          <div className="flex flex-col gap-1.5">
            <span className="font-label text-xs uppercase tracking-wide text-muted">
              Post type
            </span>
            <div className="flex flex-wrap gap-2">
              {CASE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setCaseType(t.value)}
                  aria-pressed={caseType === t.value}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors duration-150",
                    caseType === t.value
                      ? "border-accent bg-accent/10 font-medium text-accent"
                      : "border-line text-muted hover:text-text",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">{typeMeta.hint}</p>
          </div>

          <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-3 text-xs leading-relaxed text-muted">
            <span className="font-medium text-text">Keep it de-identified.</span> No
            patient names, medical record numbers, exact dates of birth, addresses,
            phone numbers, or photographs that could identify someone. Post cases as
            educational discussion — not advice about a specific patient.
          </p>

          <TextField
            label="Title"
            name="title"
            placeholder={
              typeMeta.isQuote ? "On staying humble" : "Hydralazine, meet hydroxyzine"
            }
            required
          />
          <Textarea
            label={typeMeta.isQuote ? "The quote" : typeMeta.shortForm ? "What happened?" : "Short caption"}
            name="short_caption"
            placeholder={
              typeMeta.isQuote
                ? "“The best clinicians I know are the ones still asking questions.” — an attending, my first week"
                : typeMeta.shortForm
                  ? "A sentence or two — what you saw and why it stuck with you."
                  : "One or two sentences that hook a reader in the feed."
            }
            required
          />

          {showFullBody && (
            <div className="rounded-xl border border-line bg-surface-2/40 p-4">
              <p className="font-label mb-1 text-xs uppercase tracking-wide text-accent">
                Full case
              </p>
              <p className="mb-3 text-xs text-muted">
                Add whichever sections fit this case — pick at least one.
              </p>
              <div className="flex flex-wrap gap-2">
                {FULL_BODY_SECTIONS.map((s) => (
                  <SectionChip
                    key={s.name}
                    label={s.label}
                    active={bodySections.includes(s.name)}
                    onClick={() =>
                      setBodySections((prev) =>
                        prev.includes(s.name)
                          ? prev.filter((n) => n !== s.name)
                          : [...prev, s.name],
                      )
                    }
                  />
                ))}
              </div>
              {bodySections.length > 0 && (
                <div className="mt-4 flex flex-col gap-4">
                  {FULL_BODY_SECTIONS.filter((s) => bodySections.includes(s.name)).map((s) =>
                    s.name === "actions" ? (
                      <Textarea
                        key="actions"
                        label="What we did (one action per line)"
                        name="actions"
                        placeholder={"Confirmed the order against the indication\nCalled the prescriber to verify intent"}
                        required
                      />
                    ) : (
                      <Textarea key={s.name} label={s.label} name={s.name} required />
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {typeMeta.usesNearMiss && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
              <p className="font-label mb-1 text-xs uppercase tracking-wide text-warning">
                Patient safety
              </p>
              <p className="mb-3 text-xs text-muted">
                Add whichever prompts apply here — pick at least one.
              </p>
              <div className="flex flex-wrap gap-2">
                {NEAR_MISS_PROMPTS.map((prompt) => (
                  <SectionChip
                    key={prompt.name}
                    label={prompt.label}
                    active={nearMissSections.includes(prompt.name)}
                    onClick={() =>
                      setNearMissSections((prev) =>
                        prev.includes(prompt.name)
                          ? prev.filter((n) => n !== prompt.name)
                          : [...prev, prompt.name],
                      )
                    }
                  />
                ))}
              </div>
              {nearMissSections.length > 0 && (
                <div className="mt-4 flex flex-col gap-4">
                  {NEAR_MISS_PROMPTS.filter((p) => nearMissSections.includes(p.name)).map(
                    (prompt) => (
                      <Textarea
                        key={prompt.name}
                        label={prompt.label}
                        name={`near_miss_${prompt.name}`}
                        required
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {typeMeta.usesComparison && (
            <div className="rounded-xl border border-line bg-surface-2/50 p-4">
              <p className="font-label mb-1 text-xs uppercase tracking-wide text-muted">
                The two cases
              </p>
              <p className="mb-3 text-xs text-muted">
                Reference cases already on Asyashare by their number, so readers can
                open each one in full. Yours or anyone else&apos;s.
              </p>
              <div className="flex flex-col gap-4">
                {/* Stacked on a phone: two short fields side by side at 360px
                    leaves neither wide enough to read what you typed. */}
                <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <TextField
                      label="First case"
                      name="compare_left"
                      placeholder="CASE-0006"
                      required
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <TextField
                      label="Second case"
                      name="compare_right"
                      placeholder="CASE-0012"
                      required
                    />
                  </div>
                </div>
                <Textarea
                  label="What changes the management?"
                  name="compare_what"
                  required
                />
              </div>
            </div>
          )}

          {typeMeta.usesQuestion && (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
              <p className="font-label mb-3 text-xs uppercase tracking-wide text-accent">
                The question
              </p>
              <div className="flex flex-col gap-4">
                <Textarea
                  label="What are you asking?"
                  name="question_prompt"
                  placeholder="What would you do?"
                  required
                />

                <div className="flex flex-col gap-2">
                  <span className="font-label text-xs uppercase tracking-wide text-muted">
                    Answers — select the correct one
                  </span>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct_option"
                        value={i}
                        aria-label={`Mark answer ${String.fromCharCode(65 + i)} correct`}
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span className="font-label w-4 shrink-0 text-xs text-muted">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        name={`option_${i}`}
                        placeholder={i < 2 ? "Required" : "Optional"}
                        className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  ))}
                </div>

                <Textarea
                  label="Explanation (shown after they answer)"
                  name="question_explanation"
                />
                <Textarea label="Clinical reasoning" name="question_reasoning" />
                <Textarea label="References / evidence" name="question_evidence" />

                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    name="allow_change"
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  Let readers change their answer after seeing the results
                </label>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection number="02" title="Clinical Context">
          <TextField
            label="Specialty"
            name="specialty"
            placeholder="Internal Medicine"
            required={!typeMeta.shortForm}
          />
          <TextField
            label="Tags (comma separated)"
            name="tags"
            placeholder="LASA, medication-error"
            required={!typeMeta.shortForm}
          />
        </FormSection>

        <FormSection number="03" title="Global Exchange">
          <div className="flex flex-col gap-1.5">
            <span className="font-label text-xs uppercase tracking-wide text-muted">
              Country
            </span>
            {viewerCountryCode ? (
              <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-2.5 text-sm text-text">
                {countryName(viewerCountryCode) ?? viewerCountryCode}
              </p>
            ) : (
              <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-2.5 text-xs text-muted">
                Not set —{" "}
                <Link href="/onboarding" className="text-accent hover:underline">
                  add your country to your profile
                </Link>{" "}
                to include this case in the Global Case Exchange.
              </p>
            )}
            <p className="text-xs text-muted">
              Taken from your profile, not picked per case — so every case is
              tagged with where its author actually practices, never a
              hospital or unit.
            </p>
          </div>
        </FormSection>

        <FormSection number="04" title="Supporting Material">
          {typeMeta.requiresVideo ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="video"
                className="font-label text-xs uppercase tracking-wide text-muted"
              >
                Video
              </label>
              <input
                id="video"
                name="video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mov"
                required
                className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
              />
              <p className="text-xs text-muted">MP4, WebM or MOV, up to 50MB.</p>
            </div>
          ) : showFullBody ? (
            <>
              <input type="hidden" name="media_kind" value={mediaKind} />
              <div className="flex flex-col gap-1.5">
                <span className="font-label text-xs uppercase tracking-wide text-muted">
                  Attach (optional)
                </span>
                <div className="flex gap-2">
                  {(
                    [
                      { key: "none", label: "None" },
                      { key: "photo", label: "Photo" },
                      { key: "video", label: "Video" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMediaKind(opt.key)}
                      aria-pressed={mediaKind === opt.key}
                      className={clsx(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors duration-150",
                        mediaKind === opt.key
                          ? "border-accent bg-accent/10 font-medium text-accent"
                          : "border-line text-muted hover:text-text",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {mediaKind === "photo" && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="image"
                    className="font-label text-xs uppercase tracking-wide text-muted"
                  >
                    Photo
                  </label>
                  <input
                    ref={imageInputRef}
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={handleImageChange}
                    className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
                  />
                  {convertingImage && (
                    <p className="text-xs text-muted">Converting photo…</p>
                  )}
                </div>
              )}

              {mediaKind === "video" && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="video"
                    className="font-label text-xs uppercase tracking-wide text-muted"
                  >
                    Video
                  </label>
                  <input
                    id="video"
                    name="video"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mov"
                    className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
                  />
                  <p className="text-xs text-muted">MP4, WebM or MOV, up to 50MB.</p>
                </div>
              )}

              {mediaKind !== "none" && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="media_placement"
                    className="font-label text-xs uppercase tracking-wide text-muted"
                  >
                    Place it under
                  </label>
                  <select
                    id="media_placement"
                    name="media_placement"
                    value={effectiveMediaPlacement}
                    onChange={(e) => setMediaPlacement(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="top">Top of the case</option>
                    {FULL_BODY_SECTIONS.filter((s) => bodySections.includes(s.name)).map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name === "actions" ? "What we did" : s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="image"
                className="font-label text-xs uppercase tracking-wide text-muted"
              >
                {typeMeta.requiresImage ? "Photo" : "Image (optional)"}
              </label>
              <input
                ref={imageInputRef}
                id="image"
                name="image"
                type="file"
                accept="image/*,.heic,.heif"
                required={typeMeta.requiresImage}
                onChange={handleImageChange}
                className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
              />
              {convertingImage && (
                <p className="text-xs text-muted">Converting photo…</p>
              )}
            </div>
          )}
        </FormSection>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <AIButton
            pending={isPolishing}
            onClick={handlePolish}
            idleLabel="Check spelling & clarity"
            pendingLabel="Checking…"
          />
          <p className="text-xs text-muted">
            Suggests wording only — you approve every change.
          </p>
        </div>
        {polishNote && <p className="text-xs text-muted">{polishNote}</p>}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-text">
              {suggestions.length} suggested{" "}
              {suggestions.length === 1 ? "edit" : "edits"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
              >
                Use all
              </button>
              <button
                type="button"
                onClick={() => setSuggestions([])}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted"
              >
                Dismiss
              </button>
            </div>
          </div>

          {suggestions.map((s) => (
            <div
              key={s.field}
              className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3"
            >
              <p className="font-label text-xs uppercase tracking-wide text-muted">
                {FIELD_LABELS[s.field] ?? s.field}
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted line-through decoration-danger/40">
                {s.before}
              </p>
              <p className="whitespace-pre-wrap text-sm text-text">{s.after}</p>

              {s.numbersChanged && (
                <p className="text-xs text-warning">
                  ⚠ A number changed in this edit — check any dose or value
                  before using it.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => acceptOne(s.field)}
                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent"
                >
                  Use this
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSuggestions((prev) =>
                      prev.filter((p) => p.field !== s.field),
                    )
                  }
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted"
                >
                  Keep mine
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {warning && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm text-warning">⚠ {warning}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (acknowledgeRef.current) acknowledgeRef.current.value = "true";
                formRef.current?.requestSubmit();
              }}
              className="rounded-lg border border-warning/50 px-3.5 py-2 text-sm text-warning"
            >
              Post anyway
            </button>
            <p className="self-center text-xs text-muted">
              or edit the fields above and post again
            </p>
          </div>
        </div>
      )}

      <label className="flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger/5 px-3.5 py-3 text-xs leading-relaxed text-text">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          required
          className="mt-0.5 size-3.5 shrink-0 accent-[var(--danger)]"
        />
        <span>
          I confirm this post contains no real patient names, medical record
          numbers, identifying photographs, or other personally identifying
          information, and that everything I&apos;ve written is accurate to
          the best of my knowledge. I understand I am solely responsible for
          what I post, and that if patient-identifiable information — in
          text or in any photo or video — is found, my account will be{" "}
          <span className="font-medium">permanently blocked from Asyashare</span>{" "}
          — I will not be able to sign up again.
        </span>
      </label>

      <SubmitButton disabled={convertingImage || !agreedToTerms}>
        {typeMeta.requiresImage || typeMeta.requiresVideo || typeMeta.isQuote
          ? "Post"
          : "Post case"}
      </SubmitButton>
    </form>
  );
}
