import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type MessageParticipant = {
  id: string;
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type ConversationPreview = {
  id: string;
  otherUser: MessageParticipant | null;
  lastMessage: { body: string; created_at: string; sender_id: string } | null;
};

export type ThreadMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
};

export type ThreadData = {
  conversationId: string;
  otherUser: MessageParticipant | null;
  messages: ThreadMessage[];
};

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Finds the conversation between two users, creating it if it doesn't exist yet. */
export async function getOrCreateConversation(
  supabase: Client,
  userId: string,
  otherUserId: string,
): Promise<string | null> {
  if (userId === otherUserId) return null;
  const [user_a, user_b] = orderPair(userId, otherUserId);

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", user_a)
    .eq("user_b", user_b)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user_a, user_b })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

export async function getConversations(
  supabase: Client,
  userId: string,
): Promise<ConversationPreview[]> {
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (!conversations || conversations.length === 0) return [];

  const otherIds = conversations.map((c) =>
    c.user_a === userId ? c.user_b : c.user_a,
  );
  const conversationIds = conversations.map((c) => c.id);

  const [{ data: profiles }, { data: messages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url")
      .in("id", otherIds),
    supabase
      .from("messages")
      .select("conversation_id, body, created_at, sender_id")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);

  const profileById = new Map<string, MessageParticipant>(
    (profiles ?? []).map((p) => [p.id, p]),
  );
  const lastMessageByConversation = new Map<
    string,
    { body: string; created_at: string; sender_id: string }
  >();
  for (const m of messages ?? []) {
    if (!lastMessageByConversation.has(m.conversation_id)) {
      lastMessageByConversation.set(m.conversation_id, m);
    }
  }

  return conversations
    .map((c) => {
      const otherId = c.user_a === userId ? c.user_b : c.user_a;
      return {
        id: c.id,
        otherUser: profileById.get(otherId) ?? null,
        lastMessage: lastMessageByConversation.get(c.id) ?? null,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.created_at ?? "";
      const bTime = b.lastMessage?.created_at ?? "";
      return bTime.localeCompare(aTime);
    });
}

export async function getConversationThread(
  supabase: Client,
  conversationId: string,
  viewerId: string,
): Promise<ThreadData | null> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return null;
  if (conversation.user_a !== viewerId && conversation.user_b !== viewerId) {
    return null;
  }

  const otherId =
    conversation.user_a === viewerId ? conversation.user_b : conversation.user_a;

  const [{ data: otherUser }, { data: messages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url")
      .eq("id", otherId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, body, created_at, sender_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    conversationId,
    otherUser: otherUser ?? null,
    messages: messages ?? [],
  };
}
