"use client";

import { forwardRef, useImperativeHandle, useState, useTransition } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { toggleReactionAction } from "@/app/actions/reactions";
import {
  BookmarkIcon,
  CommentIcon,
  RepostIcon,
  ShareIcon,
} from "@/components/icons";
import {
  CLINICAL_REACTIONS,
  DOUBLE_TAP_REACTION,
} from "@/lib/reaction-types";
import type { ReactionCounts } from "@/lib/cases";
import type { ReactionType } from "@/lib/database.types";

export type ReactionBarHandle = {
  /** Used by the reel's double-tap gesture. */
  reactIfNotAlready: () => void;
};

type ReactionBarProps = {
  caseId: string;
  counts: ReactionCounts;
  viewerReactions: ReactionType[];
  path: string;
  onOpenComments?: () => void;
  /**
   * Where the comment control goes when there is no onOpenComments handler.
   * The count used to be a dead button everywhere outside the reel — there was
   * no thread to open. Now there is one, and it lives on the case page.
   */
  commentsHref?: string;
  /** "light" for surfaces on top of bg-surface, "dark" for full-bleed reel backgrounds */
  tone?: "light" | "dark";
  /**
   * "full" spells the clinical reactions out on their own row — the case page,
   * where the reader has just finished the case and the question "what did this
   * change for you" is the point. "compact" keeps them to emoji and a count so
   * the whole bar still fits one line on a phone while scrolling.
   */
  variant?: "full" | "compact";
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
      commentsHref,
      tone = "light",
      variant = "compact",
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
    reactIfNotAlready: () => {
      if (!optimistic.active.has(DOUBLE_TAP_REACTION)) {
        toggle(DOUBLE_TAP_REACTION);
      }
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

  const dark = tone === "dark";
  const mutedClass = dark ? "text-white/70" : "text-muted";
  const idleChip = dark
    ? "border-white/25 text-white/80 hover:border-white/50"
    : "border-line text-muted hover:text-text";

  return (
    <div className="flex flex-col gap-2">
      <div
        className={clsx(
          "flex flex-wrap gap-2",
          // The reel centres its bar; everywhere else the row starts at the
          // text margin like the rest of the card.
          dark && "justify-center",
        )}
      >
        {CLINICAL_REACTIONS.map((r) => {
          const active = optimistic.active.has(r.value);
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => toggle(r.value)}
              aria-pressed={active}
              aria-label={r.hint}
              title={r.hint}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-label text-xs transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-95",
                active
                  ? dark
                    ? "border-white/70 bg-white/20 text-white"
                    : r.activeClass
                  : idleChip,
              )}
            >
              <span aria-hidden>{r.emoji}</span>
              {variant === "full" && <span>{r.label}</span>}
              <span className="tabular-nums">{optimistic.counts[r.value]}</span>
            </button>
          );
        })}
      </div>

      <div className={clsx("flex items-center gap-5", dark && "justify-center")}>
        {onOpenComments || !commentsHref ? (
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
        ) : (
          <Link
            href={commentsHref}
            className={clsx(
              "flex items-center gap-1.5 transition-[color,transform] duration-150 ease-out active:scale-90",
              `${mutedClass} hover:text-accent`,
            )}
            aria-label="Comments"
          >
            <CommentIcon />
            <span className="text-sm">{optimistic.counts.comments}</span>
          </Link>
        )}

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
