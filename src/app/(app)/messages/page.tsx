import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/messages";
import { Avatar } from "@/components/avatar";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("verified, verification_status")
    .eq("id", user.id)
    .single();

  if (!profile?.verified) {
    return (
      <div className="px-4 py-10 text-center">
        <h1 className="font-headline text-xl text-text">Verification required</h1>
        <p className="mt-2 text-sm text-muted">
          {profile?.verification_status === "rejected"
            ? "Your license verification was not approved. Contact support if you think this is a mistake."
            : "We manually review every license before you can message other clinicians. You'll be able to message as soon as you're approved."}
        </p>
      </div>
    );
  }

  const conversations = await getConversations(supabase, user.id);

  return (
    <div>
      <h1 className="px-4 py-4 font-headline text-xl text-text">Messages</h1>
      {conversations.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          No conversations yet. Message a clinician from their profile to start
          one.
        </p>
      ) : (
        conversations.map((c) => (
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
                  ? `${c.lastMessage.sender_id === user.id ? "You: " : ""}${c.lastMessage.body}`
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
