"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateConversation } from "@/lib/messages";
import { sendPushToUsers } from "@/lib/web-push";

export async function startConversationAction(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("verified")
    .eq("id", user.id)
    .single();

  if (!profile?.verified) redirect("/messages");

  const conversationId = await getOrCreateConversation(
    supabase,
    user.id,
    otherUserId,
  );
  if (!conversationId) redirect("/messages");

  redirect(`/messages/${conversationId}`);
}

export type SendMessageResult = { error: string } | { ok: true };

export async function sendMessageAction(
  conversationId: string,
  formData: FormData,
): Promise<SendMessageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to send messages." };
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    return { error: "Message can't be empty." };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  if (error) {
    if (error.code === "42501") {
      return {
        error: "Only verified members can send messages — finish verification first.",
      };
    }
    return { error: error.message };
  }

  try {
    const { data: recipientId } = await supabase.rpc("notify_new_message", {
      p_conversation_id: conversationId,
    });
    if (recipientId) {
      const { data: actor } = await supabase
        .from("profiles")
        .select("full_name,handle")
        .eq("id", user.id)
        .single();
      await sendPushToUsers(supabase, [recipientId], {
        title: actor?.full_name || `@${actor?.handle}` || "New message",
        body,
        url: `/messages/${conversationId}`,
      });
    }
  } catch {
    // Message is saved; notifying the recipient is not worth failing it for.
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}
