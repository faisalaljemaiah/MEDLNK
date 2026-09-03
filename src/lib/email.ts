import { Resend } from "resend";

/**
 * Transactional email — currently just the two verification-decision
 * emails (src/app/actions/admin.ts's approveUserAction/rejectUserAction).
 * Lazily constructed and soft-fails when RESEND_API_KEY isn't set yet
 * (logs and returns) rather than throwing: a missing or failing email
 * provider must never block the admin action that triggered it, since the
 * profiles.verification_status write is the part that actually matters.
 */
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// resend.dev's shared sandbox sender — works with zero setup but (per
// Resend's own restriction on unverified domains) can only deliver to the
// email address the Resend account was created with. Swap for a verified
// "no-reply@yourdomain.com" once a domain is added in the Resend dashboard.
const FROM = "Asyashare <onboarding@resend.dev>";

function emailShell(bodyHtml: string): string {
  return `
    <div style="background:#f6f8fc;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #d9e3f2;padding:32px;">
        <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#10203a;">Asyashare</p>
        ${bodyHtml}
        <p style="margin:32px 0 0;font-size:12px;color:#56657f;">
          Asyashare — a clinical knowledge network for verified healthcare professionals.
        </p>
      </div>
    </div>
  `;
}

async function send(to: string, subject: string, bodyHtml: string) {
  const resend = getClient();
  if (!resend) {
    console.warn(`RESEND_API_KEY not set — skipped email "${subject}" to ${to}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: emailShell(bodyHtml),
  });
  if (error) {
    console.error(`Failed to send email "${subject}" to ${to}:`, error);
  }
}

export async function sendVerificationApprovedEmail(to: string, name: string) {
  await send(
    to,
    "You're verified on Asyashare",
    `
      <p style="margin:0 0 16px;font-size:16px;color:#10203a;">Hi ${name},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#10203a;">
        Your license verification has been approved. You can now message
        other clinicians and post cases on Asyashare.
      </p>
      <a href="${siteUrl()}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#0f766e;color:#ffffff;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;">
        Open Asyashare
      </a>
    `,
  );
}

export async function sendVerificationRejectedEmail(to: string, name: string) {
  await send(
    to,
    "Update on your Asyashare verification",
    `
      <p style="margin:0 0 16px;font-size:16px;color:#10203a;">Hi ${name},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#10203a;">
        We weren't able to approve your license verification. If you think
        this is a mistake, reply to this email or reach out through our
        contact page and we'll take another look.
      </p>
      <a href="${siteUrl()}/contact" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#ffffff;color:#0f766e;border:1px solid #0f766e;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;">
        Contact support
      </a>
    `,
  );
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
