"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { SearchIcon } from "@/components/icons";
import type { ConversationPreview } from "@/lib/messages";

/**
 * Filters the already-fetched conversation list client-side — there's no
 * server round trip to wire up, the whole list is already on the page and
 * small enough (one clinician's own inbox) that a text match in the browser
 * is simpler than a new query.
 */
export function ConversationsList({
  conversations,
  viewerId,
}: {
  conversations: ConversationPreview[];
  viewerId: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = c.otherUser?.full_name?.toLowerCase() ?? "";
      const handle = c.otherUser?.handle?.toLowerCase() ?? "";
      const lastBody = c.lastMessage?.body.toLowerCase() ?? "";
      return name.includes(q) || handle.includes(q) || lastBody.includes(q);
    });
  }, [conversations, query]);

  return (
    <div>
      <div className="px-4 pb-2">
        <div className="relative">
          <SearchIcon
            width={15}
            height={15}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          {query ? "No conversations match that search." : "No conversations yet. Message a clinician from their profile to start one."}
        </p>
      ) : (
        filtered.map((c) => (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0"
          >
            <Avatar
              avatarUrl={c.otherUser?.avatar_url}
              name={c.otherUser?.full_name}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {c.otherUser?.full_name ?? "Unknown clinician"}
              </p>
              <p className="truncate text-sm text-muted">
                {c.lastMessage
                  ? `${c.lastMessage.sender_id === viewerId ? "You: " : ""}${c.lastMessage.body}`
                  : "No messages yet"}
              </p>
            </div>
            {c.lastMessage && (
              <p className="shrink-0 font-label text-xs text-muted">
                {new Date(c.lastMessage.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </Link>
        ))
      )}
    </div>
  );
}
