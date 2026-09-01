/**
 * The fixed allow-list of product-analytics events (0032_analytics_events.sql
 * deliberately stores event_type as free text, not a DB enum, so this list
 * can grow without a migration). Two shapes: the onboarding funnel (page
 * views + the two completion events, all fired in the order a new visitor
 * hits them) and feature usage (fired from inside the server action a
 * feature already has, not from a page view).
 */
export const ONBOARDING_FUNNEL_STEPS = [
  "welcome_viewed",
  "signup_viewed",
  "signup_completed",
  "onboarding_viewed",
  "onboarding_completed",
] as const;

export const FEATURE_USAGE_EVENTS = [
  "create_menu_opened",
  "case_created",
  "reaction_toggled",
  "community_joined",
] as const;

export const ANALYTICS_EVENT_TYPES = [
  ...ONBOARDING_FUNNEL_STEPS,
  ...FEATURE_USAGE_EVENTS,
  "login_viewed",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const FEATURE_USAGE_LABELS: Record<(typeof FEATURE_USAGE_EVENTS)[number], string> = {
  create_menu_opened: "Opened the create menu",
  case_created: "Posted a case",
  reaction_toggled: "Reacted to a case",
  community_joined: "Joined a community",
};

export const FUNNEL_STEP_LABELS: Record<(typeof ONBOARDING_FUNNEL_STEPS)[number], string> = {
  welcome_viewed: "Viewed welcome screen",
  signup_viewed: "Viewed sign-up form",
  signup_completed: "Created an account",
  onboarding_viewed: "Viewed profile setup",
  onboarding_completed: "Completed profile setup",
};
