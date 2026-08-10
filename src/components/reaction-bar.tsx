"use client";

import { forwardRef, useImperativeHandle, useState, useTransition } from "react";
import { clsx } from "clsx";
import { toggleReactionAction } from "@/app/actions/reactions";
import {
  BookmarkIcon,
  CommentIcon,
  HeartIcon,
  RepostIcon,
  ShareIcon,
} from "@/components/icons";
import type { ReactionCounts } from "@/lib/cases";
import type { ReactionType } from "@/lib/database.types";

export type ReactionBarHandle = {
  /** Used by the reel's double-tap-to-like gesture. */
  likeIfNotAlready: () => void;
};

type ReactionBarProps = {
  caseId: string;
  counts: ReactionCounts;
  viewerReactions: ReactionType[];
  path: string;
  onOpenComments?: () => void;
  /** "light" for surfaces on top of bg-surface, "dark" for full-bleed reel backgrounds */
  tone?: "light" | "dark";
  /** Fires immediately (optimistically) whenever a reaction is toggled on/off. */
  onToggle?: (type: ReactionType, active: boolean) => void;
};

export const ReactionBar = forwardRef<ReactionBarHandle, ReactionBarProps>(
  function ReactionBar(
    {
      caseId,
      counts,
      viewerReactions,
      path,
      onOpenComments,
      tone = "light",
      onToggle,
    },
    ref,
  ) {
  const [optimistic, setOptimistic] = useState({
    counts,
    active: new Set(viewerReactions),
  });
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    likeIfNotAlready: () => {
      if (!optimistic.active.has("like")) toggle("like");
    },
  }));

  function toggle(type: ReactionType) {
    const wasActive = optimistic.active.has(type);
    onToggle?.(type, !wasActive);
    setOptimistic((prev) => {
      const active = new Set(prev.active);
      if (wasActive) active.delete(type);
      else active.add(type);
      return {
        active,
        counts: {
          ...prev.counts,
          [type]: prev.counts[type] + (wasActive ? -1 : 1),
        },
      };
    });
    setError(null);

    startTransition(async () => {
      const result = await toggleReactionAction(caseId, type, path);
      if ("error" in result) {
        setError(result.error);
        setOptimistic((prev) => {
          const active = new Set(prev.active);
          if (wasActive) active.add(type);
          else active.delete(type);
          return {
            active,
            counts: {
              ...prev.counts,
              [type]: prev.counts[type] + (wasActive ? 1 : -1),
            },
          };
        });
      }
    });
  }

  async function share() {
    const url = `${window.location.origin}${path}#case-${caseId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
  }

  const mutedClass = tone === "dark" ? "text-white/70" : "text-muted";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => toggle("like")}
          className={clsx(
            "flex items-center gap-1.5 transition-[color,transform] duration-150 ease-out active:scale-90",
            optimistic.active.has("like")
              ? "text-danger"
              : `${mutedClass} hover:text-danger`,
          )}
          aria-pressed={optimistic.active.has("like")}
          aria-label="Like"
        >
          <HeartIcon filled={optimistic.active.has("like")} />
          <span className="text-sm">{optimistic.counts.like}</span>
        </button>

        <button
          type="button"
          onClick={onOpenComments}
          className={clsx(
            "flex items-center gap-1.5 transition-[color,transform] duration-150 ease-out active:scale-90",
            `${mutedClass} hover:text-accent`,
          )}
          aria-label="Comments"
        >
          <CommentIcon />
          <span className="text-sm">{optimistic.counts.comments}</span>
        </button>

        <button
          type="button"
          onClick={() => toggle("repost")}
          className={clsx(
            "flex items-center gap-1.5 transition-[color,transform] duration-150 ease-out active:scale-90",
            optimistic.active.has("repost")
              ? "text-positive"
              : `${mutedClass} hover:text-positive`,
          )}
          aria-pressed={optimistic.active.has("repost")}
          aria-label="Repost"
        >
          <RepostIcon />
          <span className="text-sm">{optimistic.counts.repost}</span>
        </button>

        <button
          type="button"
          onClick={() => toggle("save")}
          className={clsx(
            "flex items-center gap-1.5 transition-[color,transform] duration-150 ease-out active:scale-90",
            optimistic.active.has("save")
              ? "text-accent"
              : `${mutedClass} hover:text-accent`,
          )}
          aria-pressed={optimistic.active.has("save")}
          aria-label="Save"
        >
          <BookmarkIcon filled={optimistic.active.has("save")} />
          <span className="text-sm">{optimistic.counts.save}</span>
        </button>

        <button
          type="button"
          onClick={share}
          className={clsx(
            "transition-[color,transform] duration-150 ease-out active:scale-90",
            `${mutedClass} hover:text-text`,
          )}
          aria-label="Share"
        >
          <ShareIcon />
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
  },
);
