import Link from "next/link";
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

      {/* Quick links — 2x2 */}
      <section aria-label="Links" className="grid w-full grid-cols-2 gap-3">
        <a
          href="https://github.com/absxl/Gregdle"
          target="_blank"
          rel="noreferrer"
          className="btn justify-start gap-2.5 py-3"
          title="Source code and issue tracker"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
          </svg>
          THE REPO
        </a>
        <a
          href="https://carletti.work"
          target="_blank"
          rel="noreferrer"
          className="btn justify-start gap-2.5 py-3"
          title="The developer's site"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          MY SITE
        </a>
        <a
          href="https://www.gtnewhorizons.com"
          target="_blank"
          rel="noreferrer"
          className="btn justify-start gap-2.5 py-3"
          title="GregTech: New Horizons official site"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtnh-logo.png" alt="" width={16} height={16} style={{ imageRendering: "pixelated" }} />
          GREGTECH OFFICIAL
        </a>
        <a
          href="https://ko-fi.com/absxl"
          target="_blank"
          rel="noreferrer"
          className="btn justify-start gap-2.5 py-3"
          title="Support the project"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 11h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z" />
            <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
            <path d="M5 8V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5" />
          </svg>
          KO-FI
        </a>
      </section>
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
