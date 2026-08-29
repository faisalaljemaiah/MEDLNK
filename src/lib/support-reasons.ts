/**
 * Single source of truth for the Contact form's reason categories — the
 * form and the admin support inbox both read from here.
 */
export const SUPPORT_REASONS: { value: string; label: string }[] = [
  {
    value: "report_content",
    label: "Report objectionable or identifying content",
  },
  { value: "account", label: "Account or verification issue" },
  { value: "general", label: "General question" },
  { value: "other", label: "Something else" },
];

export const SUPPORT_REASON_LABELS: Record<string, string> = Object.fromEntries(
  SUPPORT_REASONS.map((r) => [r.value, r.label]),
);
