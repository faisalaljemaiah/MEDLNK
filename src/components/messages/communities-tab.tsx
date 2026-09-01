"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { createCommunityAction, leaveCommunityAction } from "@/app/actions/communities";
import { COUNTRIES, countryName } from "@/lib/countries";
import type { CommunityCard, MyCommunities } from "@/lib/communities";
import { UsersIcon } from "@/components/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

function CommunityRow({ community }: { community: CommunityCard }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <Link
        href={`/communities/${community.slug}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-headline text-text">
          {community.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{community.name}</p>
          <p className="flex items-center gap-1 font-label text-xs text-muted">
            <UsersIcon width={11} height={11} strokeWidth={2.5} />
            {community.memberCount}{" "}
            {community.scope === "country"
              ? (countryName(community.country_code) ?? community.country_code)
              : "International"}
          </p>
        </div>
      </Link>
      <form
        action={async () => {
          await leaveCommunityAction(community.id, "/messages?tab=communities");
        }}
      >
        <button
          type="submit"
          className="shrink-0 text-xs font-medium text-muted hover:text-danger"
        >
          {community.viewerStatus === "joined" ? "Leave" : "Remove"}
        </button>
      </form>
    </div>
  );
}

function CreateCommunityForm() {
  const [state, action] = useActionState(createCommunityAction, undefined);
  const [scope, setScope] = useState<"global" | "country">("global");

  return (
    <form action={action} className="mt-3 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <TextField label="Name" name="name" required maxLength={60} />
      <div className="flex flex-col gap-1.5">
        <label className="font-label text-xs uppercase tracking-wide text-muted">
          Description
        </label>
        <textarea
          name="description"
          rows={2}
          maxLength={280}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-text transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex gap-2">
        {(["global", "country"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            aria-pressed={scope === value}
            className={clsx(
              "flex-1 rounded-full border px-3 py-1.5 font-label text-xs transition-colors duration-150 ease-out",
              scope === value
                ? "border-accent bg-accent text-white"
                : "border-line text-muted hover:text-text",
            )}
          >
            {value === "global" ? "International" : "One country"}
          </button>
        ))}
      </div>
      <input type="hidden" name="scope" value={scope} />

      {scope === "country" && (
        <select
          name="country_code"
          aria-label="Country"
          required
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
        >
          <option value="">Choose a country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {state && "error" in state && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton>Create community</SubmitButton>
    </form>
  );
}

export function CommunitiesTab({
  communities,
  eligible,
  followerCount,
}: {
  communities: MyCommunities;
  eligible: boolean;
  followerCount: number;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const hasAny = communities.joined.length > 0 || communities.saved.length > 0;

  return (
    <div className="px-4 py-4">
      {communities.joined.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 font-label text-xs uppercase tracking-wide text-muted">
            Joined
          </p>
          {communities.joined.map((c) => (
            <CommunityRow key={c.id} community={c} />
          ))}
        </div>
      )}

      {communities.saved.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 font-label text-xs uppercase tracking-wide text-muted">
            Saved
          </p>
          {communities.saved.map((c) => (
            <CommunityRow key={c.id} community={c} />
          ))}
        </div>
      )}

      {!hasAny && (
        <p className="py-6 text-center text-sm text-muted">
          Communities you join or save from Discover will show up here.
        </p>
      )}

      <div className="mt-2 border-t border-line pt-4">
        {eligible ? (
          showCreate ? (
            <CreateCommunityForm />
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full rounded-full border border-accent px-4 py-2.5 text-center text-sm font-medium text-accent transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              + Create a community
            </button>
          )
        ) : (
          <p className="text-center text-xs text-muted">
            Reach 100 followers to create a community — you have {followerCount}.
          </p>
        )}
      </div>
    </div>
  );
}
