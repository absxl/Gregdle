import Link from "next/link";
import { LinkGrid } from "@/components/ui/LinkGrid";
import { LeaderboardTable } from "@/components/game/LeaderboardTable";

export const metadata = {
  title: "Leaderboard — Gregdle",
  description: "Today's fastest Gregdle solvers, per difficulty.",
};

/**
 * Daily leaderboard (PRD §7.1, D6): winning runs ranked unhinted first, then
 * fewer guesses, then earlier finish. Reads the anon-readable
 * leaderboard_daily view; sign in on the home page to compete.
 */

export const dynamic = "force-dynamic";

interface GlobalStatRow {
  plays: number;
  wins: number;
  gave_ups: number;
  hinted: number;
  avg_guesses: number;
}

export default async function LeaderboardPage(props: {
  searchParams: Promise<{ difficulty?: string }>;
}) {
  const { difficulty } = await props.searchParams;
  const active = difficulty === "hard" ? "hard" : "easy";
  const today = new Date().toISOString().slice(0, 10);

  let globalStats: { easy: GlobalStatRow | null; hard: GlobalStatRow | null } = {
    easy: null,
    hard: null,
  };
  let rows: {
    display_name: string;
    guess_count: number | null;
    hints_used: number;
    rank: number;
  }[] = [];
  let error: string | null = null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const qs = new URLSearchParams({
        select: "display_name,guess_count,hints_used,rank",
        dataset: "eq.gtnh:machines",
        difficulty: `eq.${active}`,
        date: `eq.${today}`,
        order: "rank.asc",
        limit: "50",
      });
      const res = await fetch(`${url}/rest/v1/leaderboard_daily?${qs}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 60 },
      });
      if (res.ok) rows = await res.json();
      else error = `Leaderboard unavailable (HTTP ${res.status}).`;

      const gqs = new URLSearchParams({
        select: "difficulty,plays,wins,gave_ups,hinted,avg_guesses",
        dataset: "eq.gtnh:machines",
        date: `eq.${today}`,
      });
      const gres = await fetch(`${url}/rest/v1/global_daily_stats?${gqs}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 60 },
      });
      if (gres.ok) {
        const g = (await gres.json()) as (GlobalStatRow & { difficulty: string })[];
        globalStats = {
          easy: g.find((x) => x.difficulty === "easy") ?? null,
          hard: g.find((x) => x.difficulty === "hard") ?? null,
        };
      }
    } else {
      error = "Leaderboard not configured.";
    }
  } catch {
    error = "Leaderboard unavailable right now.";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-12">
      <header className="mt-2 flex w-full flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-pixel text-5xl leading-none tracking-wide">LEADERBOARD</h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            Today&apos;s fastest solvers ({today} UTC) · unhinted runs rank higher
          </p>
        </div>
        <Link href="/" className="btn">
          Home
        </Link>
      </header>

      {(globalStats.easy || globalStats.hard) && (
        <section aria-label="Global stats" className="panel corners w-full p-5">
          <p className="label label-accent mb-3">
            GLOBAL STATS // TODAY · ALL PLAYERS (GUESTS INCLUDED)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["easy", "hard"] as const).map((difficulty) => {
              const g = globalStats[difficulty];
              if (!g || g.plays === 0) {
                return (
                  <div key={difficulty}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                      {difficulty.toUpperCase()}
                    </h3>
                    <p className="text-sm text-muted">No games recorded yet today.</p>
                  </div>
                );
              }
              return (
                <div key={difficulty}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                    {difficulty.toUpperCase()}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <GlobalStat label="Games played" value={String(g.plays)} />
                    <GlobalStat
                      label="Win rate"
                      value={g.wins > 0 ? `${Math.round((g.wins / g.plays) * 100)}%` : "—"}
                    />
                    <GlobalStat
                      label="Gave up"
                      value={`${Math.round((g.gave_ups / g.plays) * 100)}%`}
                    />
                    <GlobalStat
                      label="Used hints"
                      value={`${Math.round((g.hinted / g.plays) * 100)}%`}
                    />
                    <GlobalStat label="Avg guesses" value={g.avg_guesses.toFixed(1)} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex w-full gap-2" role="tablist" aria-label="Difficulty">
        {(["easy", "hard"] as const).map((d) => (
          <Link
            key={d}
            href={`/leaderboard?difficulty=${d}`}
            className={`btn ${d === active ? "btn-primary" : ""}`}
            role="tab"
            aria-selected={d === active}
          >
            {d.toUpperCase()}
          </Link>
        ))}
      </div>

      <LeaderboardTable rows={rows} error={error} />

      <LinkGrid />
    </main>
  );
}

function GlobalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2px] border border-edge bg-surface2 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-2xl font-bold leading-tight tabular-nums">{value}</div>
    </div>
  );
}
