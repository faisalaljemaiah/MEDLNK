import type { ReportReason, ReportStatus } from "@/lib/database.types";

/**
 * Single source of truth for report categories — the report dialog and the
 * admin queue both read from here, so a new reason means one entry plus its
 * value in the check constraint.
 *
 * Patient privacy is first deliberately: it is the report this platform most
 * needs to receive quickly, and putting it at the top of the list is the
 * cheapest way to make it the one people reach for.
 */
export const REPORT_REASONS: {
  value: ReportReason;
  label: string;
  hint: string;
  urgent?: boolean;
}[] = [
  {
    value: "patient_privacy",
    label: "Patient privacy concern",
    hint: "Names, record numbers, dates, images — anything that could identify a real patient.",
    urgent: true,
  },
  {
    value: "incorrect_clinical_information",
    label: "Incorrect clinical information",
    hint: "A dose, interaction or claim that looks wrong.",
    urgent: true,
  },
  {
    value: "misleading_information",
    label: "Misleading information",
    hint: "Technically accurate but presented in a way that misleads.",
  },
  {
    value: "harassment",
    label: "Harassment",
    hint: "Targeted or abusive behaviour toward another member.",
  },
  {
    value: "inappropriate_content",
    label: "Inappropriate content",
    hint: "Not suitable for a professional clinical community.",
  },
  { value: "spam", label: "Spam", hint: "Promotional or repetitive posting." },
  { value: "other", label: "Something else", hint: "Tell us what you saw." },
];

export const REPORT_REASON_LABELS: Record<ReportReason, string> =
  Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label])) as Record<
    ReportReason,
    string
  >;

/** Moderation states a report moves through, and what each one means. */
export const REPORT_STATUSES: {
  value: ReportStatus;
  label: string;
  hint: string;
  className: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    hint: "Not yet looked at.",
    className: "border-warning/40 bg-warning/10 text-warning",
  },
  {
    value: "reviewed",
    label: "Reviewed",
    hint: "Looked at, no action needed yet.",
    className: "border-line bg-surface-2 text-muted",
  },
  {
    value: "approved",
    label: "Content kept",
    hint: "Reviewed and the content stays up.",
    className: "border-positive/40 bg-positive/10 text-positive",
  },
  {
    value: "removed",
    label: "Content removed",
    hint: "The reported content has been taken down.",
    className: "border-danger/40 bg-danger/10 text-danger",
  },
  {
    value: "escalated",
    label: "Escalated",
    hint: "Needs a second opinion or action outside the platform.",
    className: "border-accent-2/40 bg-accent-2/10 text-accent-2",
  },
];

export const REPORT_STATUS_META = Object.fromEntries(
  REPORT_STATUSES.map((s) => [s.value, s]),
) as Record<ReportStatus, (typeof REPORT_STATUSES)[number]>;
