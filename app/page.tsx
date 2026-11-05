import Link from "next/link";
import Image from "next/image";
import { ALL_DATASET_KEYS, datasetLabel } from "@/lib/datasets";
import { getMachines } from "@/lib/game/dataset";
import { DailyStatus } from "@/components/game/DailyStatus";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BackgroundsButton } from "@/components/backgrounds/BackgroundsButton";
import { AdSlot } from "@/components/ads/AdSlot";
import { LinkGrid } from "@/components/ui/LinkGrid";
import { ItemIcon } from "@/components/ui/ItemIcon";

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
      limit: "10",
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

const MEDALS = ["rank1", "rank2", "rank3"] as const;

async function giveUpTotal(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/global_totals?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { total_gave_ups: number }[];
    return rows[0]?.total_gave_ups ?? 0;
  } catch {
    return null;
  }
}

export default async function Home() {
  const machines = getMachines();
  const [easyTop, hardTop, gaveUps] = await Promise.all([
    topToday("easy"),
    topToday("hard"),
    giveUpTotal(),
  ]);

  const board = (rows: BoardRow[]) =>
    rows.length > 0 ? (
      <ul className="flex flex-col gap-1 text-sm">
        {rows.map((r, i) => (
          <li key={`${r.rank}-${r.display_name}`}>
            <Link
              href={`/u/${encodeURIComponent(r.display_name)}`}
              className="flex items-center justify-between gap-2 px-2 py-1.5 font-mono text-sm hover:bg-surface2"
              title={`View ${r.display_name}'s profile`}
            >
              <span className="truncate font-bold">
                <ItemIcon name={i < 3 ? MEDALS[i] : "gold"} size={18} title={`Rank ${r.rank}`} />{" "}
                {r.display_name}
              </span>
              <span className="shrink-0 text-muted tabular-nums">
                {r.guess_count ?? "—"} g{r.hints_used > 0 ? ` · ${r.hints_used} hints` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="flex items-center gap-1.5 text-sm text-muted">
        No winners yet — first solve takes <ItemIcon name="rank1" size={16} title="gold" />
      </p>
    );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 p-4 pb-12 sm:p-6">
      {/* Hero + auth */}
      <header className="mt-6 flex w-full flex-col gap-4">
        <div className="flex w-full items-center justify-between">
          <BackgroundsButton />
          <AuthPanel compact />
        </div>
        <div className="flex flex-col items-center gap-2">
          {/* Official Gregdle wordmark */}
          <Image
            src="/logo.png"
            alt="Gregdle"
            width={1031}
            height={340}
            priority
            className="h-20 w-auto sm:h-28"
          />
        </div>
        <p className="label -mt-2 text-center">
          GREGTECH INDUSTRIES // DAILY MACHINE GUESSING TERMINAL
        </p>
        <p className="text-center text-sm font-semibold text-muted">
          One hidden machine every day at 00:00 UTC. Type, guess, read the grid.
        </p>
      </header>

      {/* Mode cards */}
      <section aria-label="Game modes" className="grid w-full gap-4 sm:grid-cols-2">
        {(["easy", "hard"] as const).map((difficulty) => (
          <div key={difficulty} className="panel corners flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="label label-accent mb-1.5">
                  MODULE // {difficulty === "easy" ? "DAILY-EASY" : "DAILY-HARD"}
                </p>
                <p className="text-sm text-muted">
                  {difficulty === "easy"
                    ? "Everyday machines — friendlier pool."
                    : `Any of the ${machines.length} machines. No hints. Good luck.`}
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

      {/* Puzzle */}
      <section aria-label="Puzzle mode" className="panel corners flex w-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="label label-accent mb-1.5">MODULE // PUZZLE</p>
            <p className="text-sm text-muted">
              One machine shown as a tiny pixel fragment. Every wrong guess dezooms — name it before
              the full image gives it away. Two puzzles a day.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/play/gtnh-machines/puzzle-single" className="btn btn-primary">
            Single sprite
          </Link>
          <Link href="/play/gtnh-machines/puzzle-multi" className="btn">
            Multiblock render
          </Link>
        </div>
      </section>

      {gaveUps !== null && gaveUps > 0 && (
        <section
          aria-label="Give-up counter"
          className="panel corners flex w-full items-center justify-between gap-3 px-5 py-3"
        >
          <p className="font-mono text-sm font-bold text-muted">
            <span className="font-pixel text-2xl text-bad">{gaveUps}</span> player
            {gaveUps === 1 ? " has" : "s have"} given up entirely.
          </p>
          <p className="label">WILL YOU?</p>
        </section>
      )}

      {/* Leaderboard — prominent preview */}
      <section aria-label="Leaderboard" className="panel w-full p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <ItemIcon name="trophy" size={20} title="Today's leaderboard" /> Today&apos;s
            leaderboard
          </h2>
          <Link href="/leaderboard" className="btn btn-primary">
            Full leaderboard
          </Link>
        </div>
        <p className="label mt-1">SOLVE THE DAILY WHILE SIGNED IN · UNHINTED RANKS HIGHER</p>
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

      <LinkGrid />

      <AdSlot slot="home" className="w-full" />
    </main>
  );
}
