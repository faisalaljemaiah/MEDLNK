/**
 * Validates a `next` redirect target carried through the sign-in/2FA flow
 * (the case-detail page's signed-out gate links to /login?next=/case/... so
 * following a shared case link and then signing in lands back on that case,
 * not the home feed). Only a same-app relative path is ever trusted — an
 * absolute or protocol-relative value (`//evil.com`) could otherwise turn
 * this into an open redirect off of a form nobody has to be signed in to
 * submit. A plain function, not exported from a "use server" file — both of
 * those only allow async exports.
 */
export function sanitizeNextPath(value: FormDataEntryValue | string | null): string | null {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : null;
}
