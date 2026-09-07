"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitSupportMessageAction } from "@/app/actions/support";
import { SUPPORT_REASONS } from "@/lib/support-reasons";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ContactForm() {
  const [state, action] = useActionState(submitSupportMessageAction, undefined);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <Link href="/" className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-headline text-2xl text-text">Contact Asyashare</h1>
        <p className="text-sm text-muted">
          Reporting identifying patient content, a problem with your
          account, or anything else — we read every message.
        </p>
      </Link>

      <form action={action} className="flex flex-col gap-4">
        <TextField label="Your name (optional)" name="name" autoComplete="name" />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reason" className="font-label text-xs text-muted">
            Reason
          </label>
          <select
            id="reason"
            name="reason"
            defaultValue={SUPPORT_REASONS[0].value}
            className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text focus:border-accent focus:outline-none"
          >
            {SUPPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="message" className="font-label text-xs text-muted">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            className="min-h-28 resize-y rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        {state && "error" in state && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
        {state && "message" in state && (
          <p className="text-sm text-accent" role="status">
            {state.message}
          </p>
        )}
        <SubmitButton>Send message</SubmitButton>
      </form>

      <p className="text-center text-xs text-muted">
        <Link href="/terms" className="hover:text-text">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:text-text">
          Privacy
        </Link>
      </p>
    </div>
  );
}
