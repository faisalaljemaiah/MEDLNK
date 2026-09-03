"use client";

import { useState } from "react";
import { MutedIcon } from "@/components/icons";

/**
 * Tapping the video watches it in place — unmutes and hands over native
 * controls — instead of leaving the feed for the full case page. The case
 * page's own <video> (case/[caseNumber]/page.tsx) still exists for anyone
 * who reaches the post another way (the title, "Let's dive deep", or
 * comments, all still links); this is just no longer one of those ways.
 */
export function CaseVideoPreview({ mediaUrl }: { mediaUrl: string }) {
  const [active, setActive] = useState(false);

  return (
    <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
      <video
        src={mediaUrl}
        autoPlay
        muted={!active}
        controls={active}
        loop
        playsInline
        onClick={() => setActive(true)}
        className="h-full w-full object-cover"
      />
      {!active && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-white"
        >
          <MutedIcon width={13} height={13} strokeWidth={2.25} />
        </span>
      )}
    </div>
  );
}
