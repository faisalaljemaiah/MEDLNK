/**
 * Shown when a feature's tables aren't reachable — in practice, when a
 * migration hasn't been applied to the hosted project yet.
 *
 * Deliberately worded differently from every empty state: a reader seeing
 * "nothing here" and a reader seeing "not switched on yet" are looking at very
 * different situations, and collapsing them is how a half-deployed feature goes
 * unnoticed. See supabase/APPLY_TO_HOSTED.sql for the fix.
 */
export function UnavailableNotice({ feature }: { feature: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm text-muted">
        {feature} isn&apos;t switched on yet.
      </p>
      <p className="mt-1 text-sm text-muted">
        This part of Asyashare is still being set up — check back shortly.
      </p>
    </div>
  );
}
