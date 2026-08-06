"use client";

import { useActionState, useRef } from "react";
import { createCaseAction } from "@/app/actions/case";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

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

  const warning = state && "warning" in state ? state.warning : null;
  const error = state && "error" in state ? state.error : null;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="acknowledge_warning" ref={acknowledgeRef} defaultValue="false" />

      <TextField label="Title" name="title" placeholder="Hydralazine, meet hydroxyzine" required />
      <Textarea
        label="Short caption"
        name="short_caption"
        placeholder="One or two sentences that hook a reader in the feed."
        required
      />

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
          <Textarea label="The lesson" name="lesson" required />
        </div>
      </div>

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
