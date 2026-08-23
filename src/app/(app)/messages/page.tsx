import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getConversations } from "@/lib/messages";
import { ConversationsList } from "@/components/messages/conversations-list";

export default async function MessagesPage() {
  const supabase = await createClient();
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

  const conversations = await getConversations(supabase, user.id);

  return (
    <div>
      <h1 className="px-4 py-4 font-headline text-xl text-text">Messages</h1>
      <ConversationsList conversations={conversations} viewerId={user.id} />
    </div>
  );
}
