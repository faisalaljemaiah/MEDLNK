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

const COLORS = {
  bg: "#f6f8fc",
  surface: "#ffffff",
  line: "#d9e3f2",
  text: "#10203a",
  muted: "#56657f",
  accent: "#0f766e",
  accentSoft: "#e4f3f1",
};

/**
 * Table-based, not flex/grid — Outlook desktop renders email HTML with
 * Word's engine, which ignores most modern CSS. Tables plus inline styles
 * is the one layout approach that behaves the same across Gmail, Apple
 * Mail, and Outlook alike.
 */
function emailShell(opts: {
  badgeGlyph: string;
  badgeColor: string;
  badgeBg: string;
  headline: string;
  bodyHtml: string;
}): string {
  const { badgeGlyph, badgeColor, badgeBg, headline, bodyHtml } = opts;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:${COLORS.surface};border-radius:16px;border:1px solid ${COLORS.line};overflow:hidden;">
        <tr>
          <td style="background:${COLORS.accent};padding:20px 32px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Asyashare</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
              <tr>
                <td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;border-radius:20px;background:${badgeBg};font-size:18px;color:${badgeColor};">
                  ${badgeGlyph}
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${COLORS.text};">${headline}</p>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid ${COLORS.line};">
            <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${COLORS.muted};">
              Asyashare — a clinical knowledge network for verified healthcare professionals.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;
}

function ctaButton(href: string, label: string, variant: "solid" | "outline"): string {
  const style =
    variant === "solid"
      ? `background:${COLORS.accent};color:#ffffff;`
      : `background:${COLORS.surface};color:${COLORS.accent};border:1px solid ${COLORS.accent};`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:999px;${style}">
          <a href="${href}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;text-decoration:none;color:inherit;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

async function send(to: string, subject: string, html: string, text: string) {
  const resend = getClient();
  if (!resend) {
    console.warn(`RESEND_API_KEY not set — skipped email "${subject}" to ${to}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) {
    console.error(`Failed to send email "${subject}" to ${to}:`, error);
  }
}

export async function sendVerificationApprovedEmail(to: string, name: string) {
  const subject = "You're verified on Asyashare";
  const html = emailShell({
    badgeGlyph: "&#10003;",
    badgeColor: COLORS.accent,
    badgeBg: COLORS.accentSoft,
    headline: "Verification approved",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${COLORS.text};">Hi ${name},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:${COLORS.text};">
        Your license verification has been approved. You can now message
        other clinicians and post cases on Asyashare.
      </p>
      ${ctaButton(siteUrl(), "Open Asyashare", "solid")}
    `,
  });
  const text = `Hi ${name},\n\nYour license verification has been approved. You can now message other clinicians and post cases on Asyashare.\n\nOpen Asyashare: ${siteUrl()}`;
  await send(to, subject, html, text);
}

export async function sendVerificationRejectedEmail(to: string, name: string) {
  const subject = "Update on your Asyashare verification";
  const html = emailShell({
    badgeGlyph: "&#8213;",
    badgeColor: COLORS.muted,
    badgeBg: COLORS.bg,
    headline: "Verification not approved",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${COLORS.text};">Hi ${name},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:${COLORS.text};">
        We weren't able to approve your license verification. If you think
        this is a mistake, reach out through our contact page and we'll
        take another look.
      </p>
      ${ctaButton(`${siteUrl()}/contact`, "Contact support", "outline")}
    `,
  });
  const text = `Hi ${name},\n\nWe weren't able to approve your license verification. If you think this is a mistake, reach out through our contact page and we'll take another look.\n\nContact support: ${siteUrl()}/contact`;
  await send(to, subject, html, text);
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
