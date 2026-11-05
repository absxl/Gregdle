"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dailyStats, endlessStats, utcDateToday, type DailyStats } from "@/lib/game/local-state";
import type { DatasetKey } from "@/lib/datasets";
import { datasetLabel } from "@/lib/datasets";
import { AdSlot } from "@/components/ads/AdSlot";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { StreakFire } from "@/components/game/StreakFire";
import { ItemIcon } from "@/components/ui/ItemIcon";

/**
 * Stats: local (localStorage) always; when signed in, the synced account
 * history from game_results is shown alongside (D23).
 */

interface ServerRow {
  date: string;
  difficulty: "easy" | "hard";
  won: boolean;
  guesses: string[];
  hints_used: number;
}

function serverStats(rows: ServerRow[]): DailyStats {
  const finished = rows.filter((r) => r.won).sort((a, b) => (a.date < b.date ? 1 : -1));
  const stats: DailyStats = {
    played: rows.length,
    wins: rows.length ? finished.length : 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: {},
  };
  let streak = 0;
  let expectDate: string | null = null;
  for (const r of finished) {
    const n = r.guesses.length;
    stats.distribution[n] = (stats.distribution[n] ?? 0) + 1;
    const d = new Date(`${r.date}T00:00:00Z`);
    if (expectDate === null || r.date === expectDate) {
      streak++;
    } else {
      streak = 1;
    }
    d.setUTCDate(d.getUTCDate() - 1);
    expectDate = d.toISOString().slice(0, 10);
    stats.maxStreak = Math.max(stats.maxStreak, streak);
  }
  stats.currentStreak = streak;
  return stats;
}

export default function StatsPage() {
  const [daily, setDaily] = useState<{
    easy: ReturnType<typeof dailyStats>;
    hard: ReturnType<typeof dailyStats>;
  } | null>(null);
  const [endless, setEndless] = useState<ReturnType<typeof endlessStats> | null>(null);
  const [account, setAccount] = useState<{
    easy: DailyStats | null;
    hard: DailyStats | null;
  } | null>(null);

  const datasetKey: DatasetKey = "gtnh:machines";

  useEffect(() => {
    // Hydration from localStorage: only valid after mount (no window on SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDaily({
      easy: dailyStats(datasetKey, "easy"),
      hard: dailyStats(datasetKey, "hard"),
    });

    setEndless(endlessStats());

    // Signed-in? Load the synced account history.
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: rows } = await supabase
        .from("game_results")
        .select("date,difficulty,won,guesses,hints_used")
        .eq("dataset", datasetKey)
        .eq("mode", "daily");
      if (!rows) return;
      const typed = rows as ServerRow[];

      setAccount({
        easy: typed.some((r) => r.difficulty === "easy")
          ? serverStats(typed.filter((r) => r.difficulty === "easy"))
          : null,
        hard: typed.some((r) => r.difficulty === "hard")
          ? serverStats(typed.filter((r) => r.difficulty === "hard"))
          : null,
      });
    });
  }, [datasetKey]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 p-4 pb-12">
      <header className="mt-2 flex w-full items-baseline justify-between">
        <h1 className="font-pixel text-5xl leading-none tracking-wide">YOUR STATS</h1>
        <Link href="/" className="btn">
          Home
        </Link>
      </header>

      {daily && endless ? (
        <>
          {(["easy", "hard"] as const).map((difficulty) => {
            const s = daily[difficulty];
            return (
              <section
                key={difficulty}
                aria-label={`${difficulty} daily stats`}
                className="panel w-full p-5"
              >
                <p className="label label-accent mb-1.5">
                  Daily · {difficulty === "easy" ? "Easy" : "Hard"}
                </p>
                <h2 className="text-base font-black">{datasetLabel(datasetKey)}</h2>
                <div className="mt-3 flex items-center gap-3">
                  <StreakFire n={s.currentStreak} size={56} />
                  <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-5">
                    <Stat label="Played" value={s.played} />
                    <Stat label="Won" value={s.wins} />
                    <Stat
                      label="Win %"
                      value={s.played ? `${Math.round((s.wins / s.played) * 100)}%` : "—"}
                    />
                    <Stat label="Streak" value={s.currentStreak} />
                    <Stat label="Best" value={s.maxStreak} />
                  </div>
                </div>
                {Object.keys(s.distribution).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Guess distribution
                    </h3>
                    {Object.entries(s.distribution)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([guesses, wins]) => (
                        <div key={guesses} className="mt-1 flex items-center gap-2 text-sm">
                          <span className="w-6 text-right font-bold tabular-nums">{guesses}</span>
                          <div
                            className="rounded bg-accent/80 text-[13px] font-bold text-[#221604]"
                            style={{
                              width: `${Math.max(10, (wins / Math.max(...Object.values(s.distribution))) * 100)}%`,
                              minWidth: "2rem",
                              padding: "0 0.4rem",
                            }}
                          >
                            {wins}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            );
          })}

          <section aria-label="Endless stats" className="panel w-full p-5">
            <p className="label label-accent mb-1.5">Endless</p>
            <h2 className="text-base font-black">Endless mode</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Played" value={endless.played} />
              <Stat label="Won" value={endless.wins} />
              <Stat label="Best (guesses)" value={endless.bestWinGuesses ?? "—"} />
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm font-semibold text-muted">Loading…</p>
      )}

      <p className="text-xs text-muted">
        Local stats are stored on this device ({utcDateToday()}) — sign in to sync them to the
        leaderboard.
      </p>

      {account && (account.easy || account.hard) && (
        <section aria-label="Account stats" className="panel w-full p-5">
          <h2 className="flex items-center gap-2 text-base font-black">
            <ItemIcon name="synced" size={18} /> Account stats (synced)
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {(["easy", "hard"] as const).map((difficulty) => {
              const s = account[difficulty];
              if (!s) return null;
              return (
                <div key={difficulty}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                    {difficulty.toUpperCase()}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Played" value={s.played} />
                    <Stat label="Won" value={s.wins} />
                    <Stat label="Best streak" value={s.maxStreak} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <AdSlot slot="stats" className="w-full" />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-edge bg-surface2 px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-2xl font-bold leading-tight tabular-nums">{value}</div>
    </div>
  );
}
