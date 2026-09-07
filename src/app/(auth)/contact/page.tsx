import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { ContactForm } from "@/components/contact-form";

/**
 * Now requires an account, same as the rest of the app — this used to be
 * reachable with no sign-in at all (Asyashare's published contact channel
 * for reporting objectionable or identifying content), but that also made
 * it the one open, unauthenticated "message us" surface in the app, and it
 * was being scraped by spam/SEO-pitch bots with no account to trace them
 * to. RLS still lets an anonymous insert through at the database level
 * (support_messages.reporter_id can be null) — this page-level gate is
 * what actually stops it, by requiring a real account before anyone
 * reaches the form at all.
 */
export default async function ContactPage() {
  const user = await getViewer();
  if (!user) redirect("/welcome");

  return <ContactForm />;
}
