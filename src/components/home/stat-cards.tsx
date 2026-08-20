import type { HomeStats } from "@/lib/home";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/database.types";
import { ClipboardIcon, GlobeIcon, StarIcon, UsersIcon } from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

const CARD =
  "rounded-2xl border border-line bg-surface p-3.5 shadow-sm shadow-slate-900/[0.03] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/[0.06]";

function Delta({ value, suffix, locale }: { value: number; suffix: string; locale: Locale }) {
  if (value <= 0) {
    return <span className="text-xs text-muted">{t(locale, "stats.noChange")}</span>;
  }
  return (
    <span className="text-xs font-medium text-accent">
      +{value.toLocaleString()} {suffix}
    </span>
  );
}

function CardIcon({ icon: Icon }: { icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return (
    <span
      aria-hidden
      className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent"
    >
      <Icon width={13} height={13} strokeWidth={2.25} />
    </span>
  );
}

/**
 * Every number here is real — see getHomeStats. Reputation shows its raw
 * score only on this, the viewer's own dashboard; everywhere someone else
 * might see it (profiles), only the tier label from ReputationBadge shows.
 * The tier label itself (computeReputationTier) stays English regardless of
 * locale for now — translating it means touching reputation.ts's business
 * logic, out of scope for the chrome-level pass this covers.
 */
export function HomeStatCards({ stats, locale }: { stats: HomeStats; locale: Locale }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-4">
      <div className={CARD}>
        <CardIcon icon={StarIcon} />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          {t(locale, "stats.reputation")}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.reputationScore.toLocaleString()}
        </p>
        <span className="text-xs font-medium text-accent">
          {stats.reputationTier.label}
        </span>
      </div>

      <div className={CARD}>
        <CardIcon icon={UsersIcon} />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          {t(locale, "stats.connections")}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.connections.toLocaleString()}
        </p>
        <div className="mt-0.5">
          <Delta
            value={stats.connectionsThisWeek}
            suffix={t(locale, "stats.newThisWeek")}
            locale={locale}
          />
        </div>
      </div>

      <div className={CARD}>
        <CardIcon icon={ClipboardIcon} />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          {t(locale, "stats.casesShared")}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.casesShared.toLocaleString()}
        </p>
        <div className="mt-0.5">
          <Delta
            value={stats.casesThisWeek}
            suffix={t(locale, "stats.thisWeek")}
            locale={locale}
          />
        </div>
      </div>

      <div className={CARD}>
        <CardIcon icon={GlobeIcon} />
        <p className="mt-2 font-label text-[11px] uppercase tracking-wide text-muted">
          {t(locale, "stats.communities")}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-text">
          {stats.communities.toLocaleString()}
        </p>
        <span className="text-xs text-muted">{t(locale, "stats.specialtiesActive")}</span>
      </div>
    </div>
  );
}
