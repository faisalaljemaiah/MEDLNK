import { redirect } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getConversations } from "@/lib/messages";
import { getCommunityCreationEligibility, getMyCommunities } from "@/lib/communities";
import { Avatar } from "@/components/avatar";
import { CommunitiesTab } from "@/components/messages/communities-tab";

type MessagesTab = "communities" | "direct";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: MessagesTab = rawTab === "communities" ? "communities" : "direct";

  const user = await getViewer();

  if (!user) redirect("/login");

  const profile = await getViewerProfile();

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

  return (
    <div>
      <h1 className="px-4 py-4 font-headline text-xl text-text">Messages</h1>
      <div className="flex gap-1 border-b border-line px-4">
        <MessagesTabLink tab="communities" active={tab === "communities"}>
          Communities
        </MessagesTabLink>
        <MessagesTabLink tab="direct" active={tab === "direct"}>
          Direct Messages
        </MessagesTabLink>
      </div>

      {tab === "communities" ? (
        <MessagesCommunitiesTab userId={user.id} />
      ) : (
        <MessagesDirectTab userId={user.id} />
      )}
    </div>
  );
}

function MessagesTabLink({
  tab,
  active,
  children,
}: {
  tab: MessagesTab;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={tab === "direct" ? "/messages" : `/messages?tab=${tab}`}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "relative px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
        active ? "text-text" : "text-muted hover:text-text",
      )}
    >
      {children}
      {active && (
        <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}

async function MessagesCommunitiesTab({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [communities, eligibility] = await Promise.all([
    getMyCommunities(supabase, userId),
    getCommunityCreationEligibility(supabase, userId),
  ]);

  return (
    <CommunitiesTab
      communities={communities}
      eligible={eligibility.eligible}
      followerCount={eligibility.followerCount}
    />
  );
}

async function MessagesDirectTab({ userId }: { userId: string }) {
  const supabase = await createClient();
  const conversations = await getConversations(supabase, userId);

  return (
    <div>
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
                  ? `${c.lastMessage.sender_id === userId ? "You: " : ""}${c.lastMessage.body}`
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
