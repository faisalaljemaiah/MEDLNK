import type { HomeStats } from "@/lib/home";

const CARD =
  "rounded-2xl border border-line bg-surface p-3.5 shadow-sm shadow-slate-900/[0.03] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/[0.06]";

function Delta({ value, suffix }: { value: number; suffix: string }) {
  if (value <= 0) return <span className="text-xs text-muted">No change this week</span>;
  return (
    <span className="text-xs font-medium text-accent">
      +{value.toLocaleString()} {suffix}
    </span>
  );
}

function CardIcon({ emoji }: { emoji: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs"
    >
      {emoji}
    </span>
  );
}

/**
 * Every number here is real — see getHomeStats. Reputation shows its raw
 * score only on this, the viewer's own dashboard; everywhere someone else
 * might see it (profiles), only the tier label from ReputationBadge shows.
 */
export function HomeStatCards({ stats }: { stats: HomeStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-4">
      <div className={CARD}>
        <CardIcon emoji="⭐" />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          Your reputation
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.reputationScore.toLocaleString()}
        </p>
        <span className="text-xs font-medium text-accent">
          {stats.reputationTier.label}
        </span>
      </div>

      <div className={CARD}>
        <CardIcon emoji="🤝" />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          Connections
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.connections.toLocaleString()}
        </p>
        <div className="mt-0.5">
          <Delta value={stats.connectionsThisWeek} suffix="new" />
        </div>
      </div>

      <div className={CARD}>
        <CardIcon emoji="📋" />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          Cases shared
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.casesShared.toLocaleString()}
        </p>
        <div className="mt-0.5">
          <Delta value={stats.casesThisWeek} suffix="this week" />
        </div>
      </div>

      <div className={CARD}>
        <CardIcon emoji="🌍" />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          Communities
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.communities.toLocaleString()}
        </p>
        <span className="text-xs text-muted">Specialties active</span>
      </div>
    </div>
  );
}
