"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { createCaseAction } from "@/app/actions/case";
import { polishDraftAction, type PolishedField } from "@/app/actions/ai";
import { CASE_TYPES, NEAR_MISS_PROMPTS, caseTypeMeta } from "@/lib/case-types";
import { countryName } from "@/lib/countries";
import { toUploadableImage } from "@/lib/heic";
import { t, caseTypeLabel, caseTypeHint, nearMissPromptLabel } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AIButton } from "@/components/ui/ai-button";
import {
  ReelIcon,
  FileIcon,
  QuestionIcon,
  MutedIcon,
  TrendingUpIcon,
  TargetIcon,
  AlertTriangleIcon,
  CompassIcon,
  StarIcon,
  LearnIcon,
  ClipboardIcon,
  FilePlusIcon,
  ImageIcon,
  CommentIcon,
} from "@/components/icons";
import type { CaseType } from "@/lib/database.types";

/** One icon per post type, for the swipeable picker below — a closer match
 *  to its meaning than a plain text pill, and what actually turns 13 options
 *  into something that reads as a strip of choices rather than a wall of
 *  text. Kept local to the composer rather than on CaseTypeMeta itself,
 *  since the feed/case-page code that also reads case-types.ts has no use
 *  for a component reference. */
const TYPE_ICONS: Record<CaseType, (props: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  clinical_case: FileIcon,
  what_would_you_do: QuestionIcon,
  blind_case: MutedIcon,
  case_evolution: TrendingUpIcon,
  near_miss: TargetIcon,
  safety_alert: AlertTriangleIcon,
  saw_this_today: CompassIcon,
  clinical_pearl: StarIcon,
  things_i_wish_i_knew: LearnIcon,
  case_vs_case: ClipboardIcon,
  research_finding: FilePlusIcon,
  photo_post: ImageIcon,
  quote_post: CommentIcon,
  video_post: ReelIcon,
};

/** Longest title auto-derived from a video's caption — long enough to read
 *  as a real headline wherever the case is shown, short enough to stay a
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

const FIELD_LABEL_KEYS = {
  title: "compose.titleLabel",
  short_caption: "compose.shortCaptionLabel",
  presentation: "compose.sectionPresentation",
  tricky: "compose.sectionTricky",
  actions: "compose.sectionActions",
  lesson: "compose.sectionLesson",
} as const;

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
        className="min-h-24 resize-y rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text placeholder:text-muted focus:border-accent focus:outline-none"
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
 * One of the form's groups — Case, Clinical Context, Global Exchange,
 * Supporting Material. Just a label over its fields, no per-section box:
 * the numbered-circle-and-connecting-line treatment this replaced read as
 * a "journey" worth announcing on a form most formats only spend two of
 * these groups on — chrome the type picker above now does the job of
 * (choosing a format already tells you what's coming), not a bigger frame
 * around every group regardless of format.
 */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 font-label text-xs uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

/**
 * Swipeable, one-per-card picker — the actual "toggle to choose a type of
 * post" this composer needed instead of 13 wrapped pills eating the top of
 * the form across four lines. Native CSS scroll-snap does the swipe
 * physics (momentum, settling) for free; the IntersectionObserver below
 * just watches which card the scroll settles closest to and selects it, so
 * swiping and tapping both work as ways to choose.
 */
function TypePicker({
  value,
  onChange,
  locale,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  // A tap's own recenter (below) is itself a scroll — without this, the
  // observer reads the cards passing through center *during* that smooth
  // scroll and overwrites the tap with whatever card the animation happened
  // to be passing when a frame fired, before it reaches the one actually
  // tapped.
  const isSettlingRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isSettlingRef.current) return;
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const type = mostVisible?.target.getAttribute("data-type");
        if (type) onChange(type);
      },
      { root: track, threshold: [0.6, 0.9] },
    );

    for (const card of cardRefs.current.values()) observer.observe(card);
    return () => observer.disconnect();
    // Re-observe only when the set of cards changes, not on every value
    // change — re-running this on every selection would fight the settle
    // it's supposed to be reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the active card centered when the type changes some other way —
  // the initial type from a deep link, or a tap that lands on a card the
  // swipe hasn't scrolled to yet. Guarded by isSettlingRef above for exactly
  // as long as the smooth scroll takes, so this recenter can't be read back
  // by the observer as a swipe to somewhere else.
  useEffect(() => {
    const card = cardRefs.current.get(value);
    if (!card) return;
    isSettlingRef.current = true;
    card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    const timeout = setTimeout(() => {
      isSettlingRef.current = false;
    }, 400);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div
      ref={trackRef}
      className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1"
    >
      {CASE_TYPES.map((ct) => {
        const Icon = TYPE_ICONS[ct.value];
        const active = value === ct.value;
        return (
          <button
            key={ct.value}
            type="button"
            data-type={ct.value}
            ref={(el) => {
              if (el) cardRefs.current.set(ct.value, el);
              else cardRefs.current.delete(ct.value);
            }}
            onClick={() => onChange(ct.value)}
            aria-pressed={active}
            className={clsx(
              "flex w-[4.75rem] shrink-0 snap-center flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-3 text-center transition-[border-color,background-color,transform] duration-150 ease-out active:scale-95",
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-muted hover:border-text/30 hover:text-text",
            )}
          >
            <Icon width={20} height={20} strokeWidth={2} />
            <span className="line-clamp-2 text-[11px] font-medium leading-tight">
              {caseTypeLabel(locale, ct.value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ComposeForm({
  initialType = "clinical_case",
  viewerCountryCode = null,
  locale = "en",
}: {
  /** Preselects the post-type picker — e.g. a Home page quick-create action
   *  linking in as `/compose?type=what_would_you_do`. Falls back to the
   *  standard format for an unknown value, same as caseTypeMeta everywhere
   *  else. */
  initialType?: string;
  /** Display-only (0026) — the case's actual country is set server-side
   *  from the author's profile, never from anything this form submits. */
  viewerCountryCode?: string | null;
  locale?: Locale;
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
  // Any format can carry an interactive question now — the case page already
  // renders one off whether a case_questions row exists, not off case_type
  // (src/lib/cases.ts). "What would you do?" just starts with this switched
  // on, as a convenience matching what that format is for — reapplied by
  // handleTypeChange below on every format switch, not just this initial
  // mount, so picking it from the on-page pills gets the same default a
  // deep link like /compose?type=what_would_you_do does.
  const [includeQuestion, setIncludeQuestion] = useState<boolean>(
    () => caseTypeMeta(initialType).usesQuestion === true,
  );

  function handleTypeChange(value: string) {
    setCaseType(value);
    setIncludeQuestion(caseTypeMeta(value).usesQuestion === true);
  }

  // The minimal video composer (below) has no visible title field — the
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
      : t(locale, "compose.videoLabel");
  }

  const typeMeta = caseTypeMeta(caseType);
  const showFullBody = !typeMeta.shortForm && !typeMeta.usesNearMiss;

  const FULL_BODY_SECTIONS = [
    { name: "presentation", label: t(locale, "compose.sectionPresentation") },
    { name: "tricky", label: t(locale, "compose.sectionTricky") },
    { name: "actions", label: t(locale, "compose.sectionActions") },
    {
      name: "lesson",
      label: typeMeta.usesStagedReveal
        ? t(locale, "compose.sectionLessonHidden")
        : t(locale, "compose.sectionLesson"),
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
      setPolishNote(t(locale, "compose.writeSomethingFirst"));
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

  // Video is TikTok/Instagram-shaped: pick a clip, write a caption, post —
  // not the numbered multi-section template every other format uses.
  // Everything the rest of the app needs (a title, the de-identification
  // warning flow, the same legal checkbox every case requires) still
  // happens, just without asking for it as separate steps.
  if (typeMeta.requiresVideo) {
    return (
      <form ref={formRef} action={action} className="flex flex-col gap-5">
        <input type="hidden" name="acknowledge_warning" ref={acknowledgeRef} defaultValue="false" />
        <input type="hidden" name="case_type" value={caseType} />
        <input type="hidden" name="title" ref={videoTitleRef} defaultValue="Video" />

        {/* The type picker stays even on this otherwise-minimal video form —
            without it, swiping (not just tapping) onto "Video" would strand
            the author here with no way back to another format. */}
        <div className="flex flex-col gap-1.5">
          <span className="font-label text-xs uppercase tracking-wide text-muted">
            {t(locale, "compose.postTypeLabel")}
          </span>
          <TypePicker value={caseType} onChange={handleTypeChange} locale={locale} />
          <p className="mt-1 text-xs text-muted">{caseTypeHint(locale, typeMeta.value)}</p>
        </div>

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
              <span className="text-sm font-medium text-text">
                {t(locale, "compose.chooseVideo")}
              </span>
              <span className="px-6 text-xs text-muted">
                {t(locale, "compose.chooseVideoHint")}
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
          label={t(locale, "compose.captionLabel")}
          name="short_caption"
          placeholder="A sentence or two — what you saw and why it stuck with you."
          onChange={handleCaptionInputForTitle}
          required
        />

        <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-3 text-xs leading-relaxed text-muted">
          <span className="font-medium text-text">{t(locale, "compose.deidentifyLabel")}</span>{" "}
          {t(locale, "compose.deidentifyBodyVideo")}
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
                {t(locale, "compose.postAnyway")}
              </button>
              <p className="self-center text-xs text-muted">
                {t(locale, "compose.editCaptionAndPostAgain")}
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
            {t(locale, "compose.legalPrefixVideo")}{" "}
            <span className="font-medium">{t(locale, "compose.legalBold")}</span>{" "}
            {t(locale, "compose.legalSuffix")}
          </span>
        </label>

        <SubmitButton disabled={!agreedToTerms}>{t(locale, "compose.postButton")}</SubmitButton>
      </form>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="acknowledge_warning" ref={acknowledgeRef} defaultValue="false" />

      <input type="hidden" name="case_type" value={caseType} />
      <input type="hidden" name="include_question" value={includeQuestion ? "true" : "false"} />

      {/* Choosing a format is its own moment up front — a swipeable strip,
          not one more field inside "The Case" — since which format is
          picked here decides which of the groups below even show up. */}
      <div className="flex flex-col gap-1.5">
        <span className="font-label text-xs uppercase tracking-wide text-muted">
          {t(locale, "compose.postTypeLabel")}
        </span>
        <TypePicker value={caseType} onChange={handleTypeChange} locale={locale} />
        <p className="mt-1 text-xs text-muted">{caseTypeHint(locale, typeMeta.value)}</p>
      </div>

      <div className="flex flex-col gap-8">
        <FormSection title={t(locale, "compose.sectionTheCase")}>
          <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-3 text-xs leading-relaxed text-muted">
            <span className="font-medium text-text">{t(locale, "compose.deidentifyLabel")}</span>{" "}
            {t(locale, "compose.deidentifyBody")}
          </p>

          <TextField
            label={t(locale, "compose.titleLabel")}
            name="title"
            placeholder={
              typeMeta.isQuote ? "On staying humble" : "Hydralazine, meet hydroxyzine"
            }
            required
          />
          <Textarea
            label={
              typeMeta.isQuote
                ? t(locale, "compose.theQuoteLabel")
                : typeMeta.shortForm
                  ? t(locale, "compose.whatHappenedLabel")
                  : t(locale, "compose.shortCaptionLabel")
            }
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
                {t(locale, "compose.fullCaseTitle")}
              </p>
              <p className="mb-3 text-xs text-muted">{t(locale, "compose.fullCaseHint")}</p>
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
                        label={t(locale, "compose.sectionActionsLines")}
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
                {t(locale, "compose.patientSafetyTitle")}
              </p>
              <p className="mb-3 text-xs text-muted">{t(locale, "compose.patientSafetyHint")}</p>
              <div className="flex flex-wrap gap-2">
                {NEAR_MISS_PROMPTS.map((prompt) => (
                  <SectionChip
                    key={prompt.name}
                    label={nearMissPromptLabel(locale, prompt.name)}
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
                        label={nearMissPromptLabel(locale, prompt.name)}
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
                {t(locale, "compose.twoCasesTitle")}
              </p>
              <p className="mb-3 text-xs text-muted">{t(locale, "compose.twoCasesHint")}</p>
              <div className="flex flex-col gap-4">
                {/* Stacked on a phone: two short fields side by side at 360px
                    leaves neither wide enough to read what you typed. */}
                <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <TextField
                      label={t(locale, "compose.firstCase")}
                      name="compare_left"
                      placeholder="CASE-0006"
                      required
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <TextField
                      label={t(locale, "compose.secondCase")}
                      name="compare_right"
                      placeholder="CASE-0012"
                      required
                    />
                  </div>
                </div>
                <Textarea
                  label={t(locale, "compose.whatChangesManagement")}
                  name="compare_what"
                  required
                />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-label mb-1 text-xs uppercase tracking-wide text-accent">
                  {t(locale, "compose.questionTitle")}
                </p>
                <p className="text-xs text-muted">{t(locale, "compose.questionHint")}</p>
              </div>
              <SectionChip
                label={
                  includeQuestion
                    ? t(locale, "compose.questionRemove")
                    : t(locale, "compose.questionAdd")
                }
                active={includeQuestion}
                onClick={() => setIncludeQuestion((v) => !v)}
              />
            </div>
            {includeQuestion && (
              <div className="mt-4 flex flex-col gap-4">
                <Textarea
                  label={t(locale, "compose.questionPromptLabel")}
                  name="question_prompt"
                  placeholder="What would you do?"
                  required
                />

                <div className="flex flex-col gap-2">
                  <span className="font-label text-xs uppercase tracking-wide text-muted">
                    {t(locale, "compose.answersLabel")}
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
                        placeholder={
                          i < 2
                            ? t(locale, "compose.optionRequired")
                            : t(locale, "compose.optionOptional")
                        }
                        className="flex-1 border-0 border-b-2 border-line bg-transparent px-0.5 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <Textarea
                  label={t(locale, "compose.explanationLabel")}
                  name="question_explanation"
                />
                <Textarea label={t(locale, "compose.reasoningLabel")} name="question_reasoning" />
                <Textarea label={t(locale, "compose.evidenceLabel")} name="question_evidence" />

                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    name="allow_change"
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {t(locale, "compose.allowChangeLabel")}
                </label>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title={t(locale, "compose.sectionClinicalContext")}>
          <TextField
            label={t(locale, "compose.specialtyLabel")}
            name="specialty"
            placeholder="Internal Medicine"
            required={!typeMeta.shortForm}
          />
          <TextField
            label={t(locale, "compose.tagsLabel")}
            name="tags"
            placeholder="LASA, medication-error"
            required={!typeMeta.shortForm}
          />
        </FormSection>

        <FormSection title={t(locale, "compose.sectionGlobalExchange")}>
          <div className="flex flex-col gap-1.5">
            <span className="font-label text-xs uppercase tracking-wide text-muted">
              {t(locale, "compose.countryLabel")}
            </span>
            {viewerCountryCode ? (
              <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-2.5 text-sm text-text">
                {countryName(viewerCountryCode) ?? viewerCountryCode}
              </p>
            ) : (
              <p className="rounded-lg border border-line bg-surface-2/60 px-3.5 py-2.5 text-xs text-muted">
                {t(locale, "compose.countryNotSet")}{" "}
                <Link href="/onboarding" className="text-accent hover:underline">
                  {t(locale, "compose.countryNotSetLink")}
                </Link>{" "}
                {t(locale, "compose.countryNotSetSuffix")}
              </p>
            )}
            <p className="text-xs text-muted">{t(locale, "compose.countryHint")}</p>
          </div>
        </FormSection>

        <FormSection title={t(locale, "compose.sectionSupportingMaterial")}>
          {typeMeta.requiresVideo ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="video"
                className="font-label text-xs uppercase tracking-wide text-muted"
              >
                {t(locale, "compose.videoLabel")}
              </label>
              <input
                id="video"
                name="video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mov"
                required
                className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
              />
              <p className="text-xs text-muted">{t(locale, "compose.videoHint")}</p>
            </div>
          ) : showFullBody ? (
            <>
              <input type="hidden" name="media_kind" value={mediaKind} />
              <div className="flex flex-col gap-1.5">
                <span className="font-label text-xs uppercase tracking-wide text-muted">
                  {t(locale, "compose.attachLabel")}
                </span>
                <div className="flex gap-2">
                  {(
                    [
                      { key: "none", label: t(locale, "compose.attachNone") },
                      { key: "photo", label: t(locale, "compose.attachPhoto") },
                      { key: "video", label: t(locale, "compose.attachVideo") },
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
                    {t(locale, "compose.photoLabel")}
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
                    <p className="text-xs text-muted">{t(locale, "compose.convertingPhoto")}</p>
                  )}
                </div>
              )}

              {mediaKind === "video" && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="video"
                    className="font-label text-xs uppercase tracking-wide text-muted"
                  >
                    {t(locale, "compose.videoLabel")}
                  </label>
                  <input
                    id="video"
                    name="video"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mov"
                    className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
                  />
                  <p className="text-xs text-muted">{t(locale, "compose.videoHint")}</p>
                </div>
              )}

              {mediaKind !== "none" && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="media_placement"
                    className="font-label text-xs uppercase tracking-wide text-muted"
                  >
                    {t(locale, "compose.placeUnder")}
                  </label>
                  <select
                    id="media_placement"
                    name="media_placement"
                    value={effectiveMediaPlacement}
                    onChange={(e) => setMediaPlacement(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                  >
                    <option value="top">{t(locale, "compose.topOfCase")}</option>
                    {FULL_BODY_SECTIONS.filter((s) => bodySections.includes(s.name)).map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name === "actions" ? t(locale, "compose.sectionActions") : s.label}
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
                {typeMeta.requiresImage
                  ? t(locale, "compose.photoLabel")
                  : t(locale, "compose.imageOptionalLabel")}
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
                <p className="text-xs text-muted">{t(locale, "compose.convertingPhoto")}</p>
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
            idleLabel={t(locale, "compose.checkSpelling")}
            pendingLabel={t(locale, "compose.checking")}
          />
          <p className="text-xs text-muted">{t(locale, "compose.polishHint")}</p>
        </div>
        {polishNote && <p className="text-xs text-muted">{polishNote}</p>}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-text">
              {t(
                locale,
                suggestions.length === 1
                  ? "compose.suggestedEditsOne"
                  : "compose.suggestedEditsMany",
                { n: String(suggestions.length) },
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
              >
                {t(locale, "compose.useAll")}
              </button>
              <button
                type="button"
                onClick={() => setSuggestions([])}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted"
              >
                {t(locale, "compose.dismiss")}
              </button>
            </div>
          </div>

          {suggestions.map((s) => (
            <div
              key={s.field}
              className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3"
            >
              <p className="font-label text-xs uppercase tracking-wide text-muted">
                {s.field in FIELD_LABEL_KEYS
                  ? t(locale, FIELD_LABEL_KEYS[s.field as keyof typeof FIELD_LABEL_KEYS])
                  : s.field}
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted line-through decoration-danger/40">
                {s.before}
              </p>
              <p className="whitespace-pre-wrap text-sm text-text">{s.after}</p>

              {s.numbersChanged && (
                <p className="text-xs text-warning">{t(locale, "compose.numberChangedWarning")}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => acceptOne(s.field)}
                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent"
                >
                  {t(locale, "compose.useThis")}
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
                  {t(locale, "compose.keepMine")}
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
              {t(locale, "compose.postAnyway")}
            </button>
            <p className="self-center text-xs text-muted">
              {t(locale, "compose.editAndPostAgain")}
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
          {t(locale, "compose.legalPrefixGeneral")}{" "}
          <span className="font-medium">{t(locale, "compose.legalBold")}</span>{" "}
          {t(locale, "compose.legalSuffix")}
        </span>
      </label>

      <SubmitButton disabled={convertingImage || !agreedToTerms}>
        {typeMeta.requiresImage || typeMeta.requiresVideo || typeMeta.isQuote
          ? t(locale, "compose.postButton")
          : t(locale, "compose.postCaseButton")}
      </SubmitButton>
    </form>
  );
}
