"use client";

import { useState, useTransition } from "react";
import {
  joinCommunityAction,
  leaveCommunityAction,
  saveCommunityAction,
} from "@/app/actions/communities";
import type { CommunityCard } from "@/lib/communities";
import { countryName } from "@/lib/countries";
import { GlobeIcon, UsersIcon } from "@/components/icons";

/**
 * The app's first *centered* dialog — the only other one (create-menu.tsx)
 * is a bottom sheet, which reads as "pick one of several things" rather than
 * "confirm this one thing", the shape a join/save decision actually is.
 * Same backdrop-button + local-state mechanics as that sheet, just centered.
 */
export function CommunityJoinModal({
  community,
  path,
  onClose,
}: {
  community: CommunityCard;
  path: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(community.viewerStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinCommunityAction(community.id, path);
      if ("error" in result) setError(result.error);
      else setStatus("joined");
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveCommunityAction(community.id, path);
      if ("error" in result) setError(result.error);
      else setStatus("saved");
    });
  }

  function leave() {
    setError(null);
    startTransition(async () => {
      const result = await leaveCommunityAction(community.id, path);
      if ("error" in result) setError(result.error);
      else setStatus(null);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={community.name}
      className="fixed inset-0 z-30 flex items-center justify-center px-6"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-enter absolute inset-0 bg-[rgb(var(--shadow-tint)/0.4)] backdrop-blur-sm"
      />
      <div className="animate-enter relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-[0_-4px_32px_rgb(var(--shadow-tint)/0.2)]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft font-headline text-lg text-accent">
            {community.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-headline text-lg text-text">
              {community.name}
            </h2>
            <p className="flex items-center gap-1 font-label text-xs text-muted">
              <GlobeIcon width={12} height={12} strokeWidth={2.25} />
              {community.scope === "global"
                ? "International community"
                : (countryName(community.country_code) ?? community.country_code)}
            </p>
          </div>
        </div>

        {community.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {community.description}
          </p>
        )}

        <p className="mt-3 flex items-center gap-1.5 font-label text-xs text-muted">
          <UsersIcon width={13} height={13} strokeWidth={2.25} />
          {community.memberCount}{" "}
          {community.memberCount === 1 ? "member" : "members"}
        </p>

        <p className="mt-4 text-sm text-text">
          {status === "joined"
            ? `You're a member of ${community.name}.`
            : `Would you like to join ${community.name}?`}
        </p>

        <div className="mt-4 flex flex-col items-center gap-2.5">
          {status === "joined" ? (
            <button
              type="button"
              onClick={leave}
              disabled={isPending}
              className="w-full rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium text-text transition-[border-color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
            >
              Leave community
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={join}
                disabled={isPending}
                className="w-full rounded-full bg-accent px-4 py-2.5 text-center text-sm font-medium text-white transition-[opacity,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
              >
                Join now
              </button>
              <button
                type="button"
                onClick={status === "saved" ? leave : save}
                disabled={isPending}
                className="text-sm font-medium text-muted hover:text-text disabled:opacity-60"
              >
                {status === "saved" ? "Remove from saved" : "Save for later"}
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-2 text-center text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
