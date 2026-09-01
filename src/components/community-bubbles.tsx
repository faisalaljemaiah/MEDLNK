"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { CommunityCard } from "@/lib/communities";
import { CommunityJoinModal } from "@/components/community-join-modal";
import { UsersIcon } from "@/components/icons";

const STAGGERS = [
  "stagger-1",
  "stagger-2",
  "stagger-3",
  "stagger-4",
  "stagger-5",
  "stagger-6",
];

/** Loosely scales a bubble's size to its member count — a purely visual cue,
 *  not a precise chart, so the tiers are coarse. */
function sizeClass(memberCount: number): string {
  if (memberCount >= 50) return "size-24";
  if (memberCount >= 10) return "size-20";
  return "size-16";
}

export function CommunityBubbles({
  communities,
  path,
}: {
  communities: CommunityCard[];
  path: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (communities.length === 0) return null;

  const open = communities.find((c) => c.id === openId) ?? null;

  return (
    <section className="px-4 pb-4">
      <p className="mb-2.5 font-label text-xs uppercase tracking-wide text-muted">
        Communities
      </p>
      <div className="flex flex-wrap gap-3">
        {communities.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className={clsx(
              "animate-enter flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border p-2 text-center transition-transform duration-150 ease-out active:scale-95",
              sizeClass(c.memberCount),
              STAGGERS[i % STAGGERS.length],
              c.viewerStatus === "joined"
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface",
            )}
          >
            <span className="line-clamp-2 px-1 text-[11px] font-medium leading-tight text-text">
              {c.name}
            </span>
            <span className="flex items-center gap-0.5 font-label text-[10px] text-muted">
              <UsersIcon width={10} height={10} strokeWidth={2.5} />
              {c.memberCount}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <CommunityJoinModal
          community={open}
          path={path}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
