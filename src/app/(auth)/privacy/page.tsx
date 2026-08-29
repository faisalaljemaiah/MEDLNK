import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Privacy Policy — MEDLNK" };

/**
 * Describes what this codebase actually collects and stores (see
 * database.types.ts / storage buckets), not generic boilerplate — kept in
 * sync with the real schema so it stays accurate as fields are added.
 * Legal counsel should review before this is relied on for anything beyond
 * an initial public launch.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <Link href="/welcome" className="flex flex-col items-center gap-3 text-center">
        <Logo size={40} />
      </Link>

      <div className="flex flex-col gap-6 rounded-2xl border border-line bg-bg p-6 text-sm leading-relaxed text-text sm:p-8">
        <div>
          <h1 className="font-headline text-2xl text-text">Privacy Policy</h1>
          <p className="mt-1 text-xs text-muted">Last updated August 29, 2026</p>
        </div>

        <Section title="1. What we collect">
          <p>
            Account details you provide: email, name, handle, role,
            specialty, city, and country. If you request verification, we
            also collect a license number and a document you upload as proof
            (student ID, license, or similar). Content you create: cases,
            comments, reactions, messages, and any photos or videos you
            attach — which must already be de-identified before you post
            them, as described in the Terms of Service. We also keep basic
            activity data (timestamps, follows, reading streaks) needed to
            make the feed and your profile stats work.
          </p>
        </Section>

        <Section title="2. Verification documents">
          <p>
            Documents uploaded for verification are stored in a private
            file store, not publicly accessible. Only you and platform
            administrators reviewing your verification request can view
            them, via short-lived signed links generated on demand — the
            file is never made public or shared with other users.
          </p>
        </Section>

        <Section title="3. How we use it">
          <p>
            To run the platform: authenticate you, show your profile and
            posts to other members, power search and recommendations, send
            you a password-reset email if you request one, and review
            verification requests. We don&apos;t sell your data, and we
            don&apos;t use your content to train third-party models.
          </p>
        </Section>

        <Section title="4. Who can see what">
          <p>
            Your profile and posts are visible to other members (and, for
            the public feed, to signed-out visitors) unless you delete them.
            Direct messages are visible only to the participants. Admin
            accounts are never shown as public profiles and never appear in
            recommendations. Verification documents are visible only to you
            and reviewing admins, as above.
          </p>
        </Section>

        <Section title="5. Storage and security">
          <p>
            Data is stored with Supabase (Postgres + file storage), access
            controlled by row-level security policies scoped to your
            account and role. Passwords are never stored in plain text.
          </p>
        </Section>

        <Section title="6. Cookies and local storage">
          <p>
            We use a session cookie to keep you signed in and a small amount
            of browser local storage for interface preferences (like a
            collapsed section or last-used tab). We don&apos;t use
            third-party advertising trackers.
          </p>
        </Section>

        <Section title="7. Your choices">
          <p>
            You can edit your profile and delete your own posts at any time.
            &quot;Delete account&quot; in Settings permanently deletes your
            account and everything tied to it — profile, posts, comments,
            messages, and reactions — immediately, with no undo. You can
            request a copy of your data by contacting us before deleting.
          </p>
        </Section>

        <Section title="8. Children's privacy">
          <p>
            MEDLNK is for medical professionals and students and is not
            directed at children. We don&apos;t knowingly collect data from
            anyone under 16.
          </p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>
            We may update this policy as MEDLNK evolves. Material changes
            will be noted on this page with an updated date above.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about this policy, or a request for a copy or deletion
            of your data, can be sent through our{" "}
            <Link href="/contact" className="text-accent hover:underline">
              contact form
            </Link>
            .
          </p>
        </Section>
      </div>

      <p className="text-center text-xs text-muted">
        See also our{" "}
        <Link href="/terms" className="text-accent hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-medium text-text">{title}</h2>
      <div className="mt-1.5 text-muted">{children}</div>
    </div>
  );
}
