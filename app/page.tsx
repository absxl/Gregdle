import Link from "next/link";
import Image from "next/image";
import { ALL_DATASET_KEYS, datasetLabel } from "@/lib/datasets";
import { getMachines } from "@/lib/game/dataset";
import { DailyStatus } from "@/components/game/DailyStatus";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { AdSlot } from "@/components/ads/AdSlot";

/**
 * Home — Loldle-style mode directory (PRD §8): hero + auth, one card per game
 * mode, a leaderboard preview (today's top solvers), future datasets dimmed.
 */

interface BoardRow {
  display_name: string;
  guess_count: number | null;
  hints_used: number;
  rank: number;
}

async function topToday(difficulty: "easy" | "hard"): Promise<BoardRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const qs = new URLSearchParams({
      select: "display_name,guess_count,hints_used,rank",
      dataset: "eq.gtnh:machines",
      difficulty: `eq.${difficulty}`,
      date: `eq.${new Date().toISOString().slice(0, 10)}`,
      order: "rank.asc",
      limit: "3",
    });
    const res = await fetch(`${url}/rest/v1/leaderboard_daily?${qs}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 60 },
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function Home() {
  const machines = getMachines();
  const [easyTop, hardTop] = await Promise.all([topToday("easy"), topToday("hard")]);

  const board = (rows: BoardRow[]) =>
    rows.length > 0 ? (
      <ul className="flex flex-col gap-1 text-sm">
        {rows.map((r, i) => (
          <li
            key={`${r.rank}-${r.display_name}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate font-bold">
              <span aria-hidden="true">{MEDALS[i] ?? `${r.rank}.`}</span> {r.display_name}
            </span>
            <span className="shrink-0 text-muted tabular-nums">
              {r.guess_count ?? "—"} guesses{r.hints_used > 0 ? ` · ${r.hints_used} hints` : ""}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted">No winners yet — first solve takes 🥇</p>
    );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 p-4 pb-12 sm:p-6">
      {/* Hero + auth */}
      <header className="mt-4 flex w-full flex-col items-center gap-3 text-center">
        <div className="flex w-full items-center justify-end">
          <AuthPanel compact />
        </div>
        <div className="flex items-center gap-4">
          {/* GTNH pack logo (GT New Horizons project) */}
          <Image
            src="/gtnh-logo.png"
            alt=""
            width={80}
            height={80}
            className="h-16 w-16 rounded-xl border border-edge bg-surface object-contain p-1.5 sm:h-20 sm:w-20"
          />
          <h1 className="font-pixel text-6xl leading-none tracking-wide sm:text-7xl">GREGDLE</h1>
          <Image
            src="/gtnh-logo.png"
            alt=""
            width={80}
            height={80}
            className="h-16 w-16 rounded-xl border border-edge bg-surface object-contain p-1.5 sm:h-20 sm:w-20"
          />
        </div>
        <p className="text-base font-semibold text-muted">
          The daily GregTech guessing game — a new machine every day at 00:00 UTC.
        </p>
      </header>

      {/* Mode cards */}
      <section aria-label="Game modes" className="grid w-full gap-4 sm:grid-cols-2">
        {(["easy", "hard"] as const).map((difficulty) => (
          <div key={difficulty} className="panel flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-black">
                  GTNH Machines · {difficulty === "easy" ? "Easy" : "Hard"}
                </h2>
                <p className="text-sm text-muted">
                  {difficulty === "easy"
                    ? "Everyday machines — friendlier pool."
                    : `Any of the ${machines.length} machines. Good luck.`}
                </p>
              </div>
              <DailyStatus datasetKey="gtnh:machines" difficulty={difficulty} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/play/gtnh-machines/${difficulty}`} className="btn btn-primary">
                Play daily
              </Link>
              <Link href={`/play/gtnh-machines/${difficulty}?mode=endless`} className="btn">
                Endless
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* Leaderboard — prominent preview */}
      <section aria-label="Leaderboard" className="panel w-full p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">🏆 Today&apos;s leaderboard</h2>
          <Link href="/leaderboard" className="btn btn-primary">
            Full leaderboard
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted">
          Solve the daily while signed in to compete — unhinted runs rank higher.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Easy</h3>
            {board(easyTop)}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Hard</h3>
            {board(hardTop)}
          </div>
        </div>
      </section>

      {/* Coming soon */}
      <section aria-label="Coming soon" className="grid w-full grid-cols-2 gap-3 sm:grid-cols-5">
        {ALL_DATASET_KEYS.filter((k) => k !== "gtnh:machines").map((key) => (
          <div
            key={key}
            className="panel flex items-center justify-center p-4 text-center text-xs font-bold text-muted/60"
          >
            {datasetLabel(key)}
            <br />
            coming soon
          </div>
        ))}
      </section>

      <AdSlot slot="home" className="w-full" />
    </main>
  );
}
