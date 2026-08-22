import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { getCountryBreakdown, getFeedCasesByCountry } from "@/lib/cases";
import { countryName } from "@/lib/countries";
import { CaseCard } from "@/components/case-card";

type ExchangeSearchParams = { country?: string };

/**
 * Global Case Exchange (spec §19): browse by where in the world a case
 * happened, without ever showing more than that. Same shape as /search — one
 * feed query, filtered/aggregated in JS, no dedicated table.
 */
export default async function ExchangePage({
  searchParams,
}: {
  searchParams: Promise<ExchangeSearchParams>;
}) {
  const { country } = await searchParams;
  const countryCode = country?.trim().toUpperCase() ?? "";

  const supabase = await createClient();
  const user = await getViewer();

  const [breakdown, results] = await Promise.all([
    getCountryBreakdown(supabase),
    countryCode
      ? getFeedCasesByCountry(supabase, user?.id ?? null, countryCode)
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="px-4 py-4">
        <h1 className="font-headline text-xl text-text">Global Case Exchange</h1>
        <p className="mt-1 text-sm text-muted">
          Cases clinicians chose to share beyond their own country. Country
          only — never a hospital, unit or region.
        </p>
      </div>

      {breakdown.length === 0 ? (
        <p className="px-4 pb-10 text-sm text-muted">
          No cases have a country attached yet. Add one next time you post to
          put it on the map here.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {breakdown.map(({ code, count }) => (
            <Link
              key={code}
              href={`/exchange?country=${code}`}
              className={
                code === countryCode
                  ? "rounded-full border border-accent bg-accent/10 px-3.5 py-1.5 font-label text-xs text-accent"
                  : "rounded-full border border-line px-3.5 py-1.5 font-label text-xs text-text hover:border-accent hover:text-accent"
              }
            >
              {countryName(code) ?? code} · {count}
            </Link>
          ))}
        </div>
      )}

      {countryCode && (
        <p className="px-4 pb-3 text-xs text-muted">
          {results.length} {results.length === 1 ? "case" : "cases"} from{" "}
          {countryName(countryCode) ?? countryCode}
        </p>
      )}

      {countryCode &&
        (results.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Nothing from here yet.
          </p>
        ) : (
          results.map((c) => (
            <CaseCard
              key={c.id}
              feedCase={c}
              path={`/exchange?country=${countryCode}`}
              viewerId={user?.id ?? null}
            />
          ))
        ))}
    </div>
  );
}
