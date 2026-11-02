"use client";

import { useActionState, useState } from "react";
import { saveInterestsAction } from "@/app/actions/profile";
import {
  INTEREST_CASE_TYPES,
  INTEREST_TOPICS,
  MIN_INTERESTS,
} from "@/lib/interests";
import { CapsuleSubmit, FormError, GroupHeader, PictureTile } from "@/components/ui/ios";

export function InterestsPicker({
  initial,
  setup,
  specialty,
  specialtyArt,
}: {
  initial: string[];
  /** True during sign-up: needs MIN_INTERESTS to continue (or Skip). */
  setup: boolean;
  specialty: string | null;
  specialtyArt: string;
}) {
  const [state, action] = useActionState(saveInterestsAction, undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const count = selected.size;
  const enough = !setup || count >= MIN_INTERESTS;

  return (
    <form action={action} className="flex flex-1 flex-col">
      {setup && <input type="hidden" name="setup" value="1" />}
      {[...selected].map((slug) => (
        <input key={slug} type="hidden" name="interests" value={slug} />
      ))}

      {specialty && (
        <div className="flex items-center gap-3 rounded-[20px] bg-accent px-3 py-2.5 text-accent-foreground">
          <span aria-hidden className="flex size-[42px] items-center justify-center rounded-[13px] bg-accent-foreground/15 text-[23px]">
            {specialtyArt}
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] opacity-70">Your specialty</p>
            <p className="font-stamp stamp-ink truncate text-[23px] leading-tight">{specialty}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-accent-foreground/15 px-2.5 py-1 text-[11px]">
            From your profile
          </span>
        </div>
      )}

      <GroupHeader>Topics</GroupHeader>
      <div className="grid grid-cols-3 gap-2">
        {INTEREST_TOPICS.map((i) => (
          <PictureTile
            key={i.slug}
            label={i.label}
            art={i.art}
            tint={i.tint}
            selected={selected.has(i.slug)}
            onClick={() => toggle(i.slug)}
            className="h-[84px]!"
          />
        ))}
      </div>

      <GroupHeader>Case types</GroupHeader>
      <div className="grid grid-cols-4 gap-2">
        {INTEREST_CASE_TYPES.map((i) => (
          <PictureTile
            key={i.slug}
            label={i.label}
            art={i.art}
            tint={i.tint}
            selected={selected.has(i.slug)}
            onClick={() => toggle(i.slug)}
            compact
          />
        ))}
      </div>

      {state?.error && <FormError>{state.error}</FormError>}

      <div className="mt-auto flex flex-col gap-2.5 pt-8">
        <p aria-live="polite" className="text-center text-[13px] text-muted">
          <span className="font-semibold text-text">{count} selected</span>
          {setup && ` · pick at least ${MIN_INTERESTS}`}
        </p>
        <CapsuleSubmit disabled={!enough}>{setup ? "Continue" : "Save"}</CapsuleSubmit>
      </div>
    </form>
  );
}
