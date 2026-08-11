"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { createCaseAction } from "@/app/actions/case";
import { polishDraftAction, type PolishedField } from "@/app/actions/ai";
import { CASE_TYPES, NEAR_MISS_PROMPTS, caseTypeMeta } from "@/lib/case-types";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

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

export function ComposeForm() {
  const [state, action] = useActionState(createCaseAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const acknowledgeRef = useRef<HTMLInputElement>(null);

  const [suggestions, setSuggestions] = useState<PolishedField[]>([]);
  const [polishNote, setPolishNote] = useState<string | null>(null);
  const [isPolishing, startPolish] = useTransition();
  const [caseType, setCaseType] = useState<string>("clinical_case");

  const typeMeta = caseTypeMeta(caseType);
  const showFullBody = !typeMeta.shortForm && !typeMeta.usesNearMiss;

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

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="acknowledge_warning" ref={acknowledgeRef} defaultValue="false" />

      <input type="hidden" name="case_type" value={caseType} />

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

      <TextField label="Title" name="title" placeholder="Hydralazine, meet hydroxyzine" required />
      <Textarea
        label={typeMeta.shortForm ? "What happened?" : "Short caption"}
        name="short_caption"
        placeholder={
          typeMeta.shortForm
            ? "A sentence or two — what you saw and why it stuck with you."
            : "One or two sentences that hook a reader in the feed."
        }
        required
      />

      {showFullBody && (
        <div className="rounded-xl border border-line bg-surface-2/40 p-4">
          <p className="font-label mb-3 text-xs uppercase tracking-wide text-accent">
            Full case
          </p>
          <div className="flex flex-col gap-4">
            <Textarea label="Presentation" name="presentation" required />
            <Textarea label="What was tricky" name="tricky" required />
            <Textarea
              label="What we did (one action per line)"
              name="actions"
              placeholder={"Confirmed the order against the indication\nCalled the prescriber to verify intent"}
              required
            />
            <Textarea
              label={
                typeMeta.usesStagedReveal ? "The lesson (hidden until reveal)" : "The lesson"
              }
              name="lesson"
              required
            />
          </div>
        </div>
      )}

      {typeMeta.usesNearMiss && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <p className="font-label mb-3 text-xs uppercase tracking-wide text-warning">
            Patient safety
          </p>
          <div className="flex flex-col gap-4">
            {NEAR_MISS_PROMPTS.map((prompt) => (
              <Textarea
                key={prompt.name}
                label={prompt.label}
                name={`near_miss_${prompt.name}`}
                required
              />
            ))}
          </div>
        </div>
      )}

      {typeMeta.usesComparison && (
        <div className="rounded-xl border border-line bg-surface-2/50 p-4">
          <p className="font-label mb-1 text-xs uppercase tracking-wide text-muted">
            The two cases
          </p>
          <p className="mb-3 text-xs text-muted">
            Reference cases already on MEDLNK by their number, so readers can
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

      <TextField label="Specialty" name="specialty" placeholder="Internal Medicine" />
      <TextField label="Tags (comma separated)" name="tags" placeholder="LASA, medication-error" />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="image"
          className="font-label text-xs uppercase tracking-wide text-muted"
        >
          Image (optional)
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePolish}
            disabled={isPolishing}
            className="rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2 text-sm font-medium text-accent transition-opacity disabled:opacity-60"
          >
            {isPolishing ? "Checking…" : "✨ Check spelling & clarity"}
          </button>
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
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"
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

      <SubmitButton>Post case</SubmitButton>
    </form>
  );
}
