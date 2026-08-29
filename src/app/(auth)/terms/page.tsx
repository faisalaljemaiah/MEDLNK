import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Terms of Service — MEDLNK" };

/**
 * Baseline terms for launch — written to match how MEDLNK actually works
 * (verified-professional membership, de-identification requirement, the
 * permanent-block consequence already stated on the compose form) rather
 * than generic boilerplate. Legal counsel should review before this is
 * relied on for anything beyond an initial public launch.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <Link href="/welcome" className="flex flex-col items-center gap-3 text-center">
        <Logo size={40} />
      </Link>

      <div className="flex flex-col gap-6 rounded-2xl border border-line bg-bg p-6 text-sm leading-relaxed text-text sm:p-8">
        <div>
          <h1 className="font-headline text-2xl text-text">Terms of Service</h1>
          <p className="mt-1 text-xs text-muted">Last updated August 29, 2026</p>
        </div>

        <Section title="1. What MEDLNK is">
          <p>
            MEDLNK is a clinical knowledge network for verified medical
            professionals and students to share de-identified clinical
            cases, near misses, and questions for discussion and learning.
            It is not a medical device, and nothing on MEDLNK is medical
            advice for the treatment of any specific patient.
          </p>
        </Section>

        <Section title="2. Eligibility and verification">
          <p>
            Accounts are for medical professionals, medical/nursing/allied
            health students, and related clinical roles. We may ask for
            proof of license or enrollment to verify an account, and we may
            suspend or decline verification at our discretion. You must
            provide accurate information and keep your account credentials
            secure.
          </p>
        </Section>

        <Section title="3. De-identification is mandatory">
          <p>
            You may never post real patient names, medical record or
            accession numbers, dates that could identify a specific
            patient, identifying photographs or video, or any other
            personally identifying information about a patient, in the text
            of a post, in a comment, or in any uploaded photo or video —
            even if the patient or a guardian consented. You are solely
            responsible for de-identifying everything you post.
          </p>
          <p className="mt-2 font-medium">
            If patient-identifiable information is found in anything you
            posted, your account will be permanently blocked from MEDLNK and
            you will not be able to sign up again. We may also be required
            to remove the content and, where applicable, report the
            exposure.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>
            Don&apos;t use MEDLNK to harass another user, misrepresent your
            credentials or role, upload malicious files, scrape or bulk-copy
            content, or use the platform for any unlawful purpose. We may
            remove content or suspend accounts that violate these terms or
            put patients, users, or the platform at risk.
          </p>
        </Section>

        <Section title="5. Your content">
          <p>
            You keep ownership of what you post. By posting, you grant
            MEDLNK a non-exclusive, worldwide, royalty-free license to host,
            display, and distribute that content within the platform so
            other users can view and discuss it. You&apos;re responsible for
            having the right to post whatever you share.
          </p>
        </Section>

        <Section title="6. No medical advice, no liability for clinical decisions">
          <p>
            Content on MEDLNK reflects individual clinicians&apos; accounts
            and opinions, not verified clinical guidance. Nothing on MEDLNK
            should be used as the basis for a treatment decision for an
            actual patient. MEDLNK is provided &quot;as is&quot; without
            warranties of any kind, and to the fullest extent permitted by
            law we are not liable for decisions made based on content found
            here.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            You may delete your account at any time from Settings. We may
            suspend or terminate an account that violates these terms,
            most seriously and immediately for any patient-identifiable
            content, as described above.
          </p>
        </Section>

        <Section title="8. Changes to these terms">
          <p>
            We may update these terms as MEDLNK evolves. Material changes
            will be noted on this page with an updated date above.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about these terms, or a report of patient-identifying
            content, can be sent through our{" "}
            <Link href="/contact" className="text-accent hover:underline">
              contact form
            </Link>
            .
          </p>
        </Section>
      </div>

      <p className="text-center text-xs text-muted">
        See also our{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy Policy
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
