import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getConversationThread } from "@/lib/messages";
import { Avatar } from "@/components/avatar";
import { MessageComposer } from "@/components/message-composer";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getViewer();

  if (!user) redirect("/login");

  const thread = await getConversationThread(supabase, id, user.id);
  if (!thread) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link
          href={
            thread.otherUser?.handle ? `/u/${thread.otherUser.handle}` : "#"
          }
          className="flex items-center gap-3"
        >
          <Avatar
            avatarUrl={thread.otherUser?.avatar_url}
            name={thread.otherUser?.full_name}
          />
          <p className="text-sm font-medium text-text">
            {thread.otherUser?.full_name ?? "Unknown clinician"}
          </p>
        </Link>
      </div>

      <div className="flex-1 space-y-2 px-4 py-4">
        {thread.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            No messages yet — say hello.
          </p>
        ) : (
          thread.messages.map((m) => {
            const isOwn = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={clsx("flex", isOwn ? "justify-end" : "justify-start")}
              >
                <div
                  className={clsx(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    isOwn
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-2 text-text",
                  )}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageComposer conversationId={thread.conversationId} />
    </div>
  );
}
