/**
 * Guest state in localStorage (PRD §3): resumable daily progress, endless
 * runs and derived stats. Structure is merge-friendly for M4 account
 * migration (records carry everything the server needs to replay them).
 */

import { originOrFallback } from "@/lib/site";

const PREFIX = "gregdle:v1";

export interface GuessRow {
  guessId: string;
  guessName: string;
  guessImage: string | null;
  /** Serialized cell states for re-render after reload. */
  cells: { state: string; value: string; detail?: string }[];
  won: boolean;
}

/** Hint payload: text (hint 1) or machine image (hint 2, D18). */
export interface HintData {
  text?: string;
  image?: string;
}

export interface DailyGame {
  datasetKey: string;
  difficulty: "easy" | "hard";
  date: string; // YYYY-MM-DD (UTC)
  rows: GuessRow[];
  hintsUsed: number;
  /** New format is HintData[]; plain strings from older saves still render. */
  hints: (string | HintData)[];
  status: "playing" | "won" | "gave_up";
  answer?: { id: string; name: string; image: string | null };
}

export interface EndlessGame extends Omit<DailyGame, "date"> {
  seed: string;
}

export interface DailyStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<number, number>; // guesses -> win count
}

export interface EndlessStats {
  played: number;
  wins: number;
  bestWinGuesses: number | null;
}

// ------------------------------------------------------------------ helpers --

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    // Storage full / private mode: game still works, persistence degrades.
  }
}

export function utcDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function msUntilUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return next - now.getTime();
}

// ------------------------------------------------------------------- daily --

export function dailyKey(datasetKey: string, difficulty: string, date: string): string {
  return `daily:${datasetKey}:${difficulty}:${date}`;
}

export function loadDaily(
  datasetKey: string,
  difficulty: "easy" | "hard",
  date: string,
): DailyGame | null {
  const g = readJson<DailyGame | null>(dailyKey(datasetKey, difficulty, date), null);
  return g && g.datasetKey === datasetKey ? g : null;
}

export function saveDaily(game: DailyGame): void {
  writeJson(dailyKey(game.datasetKey, game.difficulty, game.date), game);
}

/** Streaks walk backwards through finished dailies by UTC date. */
export function dailyStats(datasetKey: string, difficulty: "easy" | "hard"): DailyStats {
  const games = readJson<Record<string, DailyGame>>("index:daily", {});
  const finished = Object.values(games)
    .filter(
      (g) => g.datasetKey === datasetKey && g.difficulty === difficulty && g.status !== "playing",
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const stats: DailyStats = {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: {},
  };
  let streak = 0;
  let expectDate: string | null = null;

  for (const g of finished) {
    stats.played++;
    if (g.status === "won") {
      stats.wins++;
      const n = g.rows.length;
      stats.distribution[n] = (stats.distribution[n] ?? 0) + 1;
    }
    // Consecutive-day chain (any result keeps the streak only if won).
    if (g.status === "won" && (expectDate === null || g.date === expectDate)) {
      streak++;
      const d = new Date(`${g.date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      expectDate = d.toISOString().slice(0, 10);
    } else {
      streak = g.status === "won" ? 1 : 0;
      if (g.status === "won") {
        const d = new Date(`${g.date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 1);
        expectDate = d.toISOString().slice(0, 10);
      } else {
        expectDate = null;
      }
    }
    stats.maxStreak = Math.max(stats.maxStreak, streak);
  }
  stats.currentStreak = streak;
  return stats;
}

/** Called by saveDaily to maintain the index used by stats. */
export function indexDaily(game: DailyGame): void {
  const index = readJson<Record<string, DailyGame>>("index:daily", {});
  index[dailyKey(game.datasetKey, game.difficulty, game.date)] = game;
  // Keep the last 400 days to bound storage.
  const keys = Object.keys(index).sort();
  while (keys.length > 400) {
    delete index[keys.shift()!];
  }
  writeJson("index:daily", index);
}

// ------------------------------------------------------------------ endless --

export function loadEndless(seed: string): EndlessGame | null {
  return readJson<EndlessGame | null>(`endless:${seed}`, null);
}

export function saveEndless(game: EndlessGame): void {
  writeJson(`endless:${seedKey(game)}`, game);
  const stats = endlessStats();
  stats.played++;
  if (game.status === "won") {
    stats.wins++;
    const n = game.rows.length;
    if (stats.bestWinGuesses === null || n < stats.bestWinGuesses) stats.bestWinGuesses = n;
  }
  writeJson("stats:endless", stats);
}

function seedKey(game: EndlessGame): string {
  return game.seed;
}

export function endlessStats(): EndlessStats {
  return readJson<EndlessStats>("stats:endless", { played: 0, wins: 0, bestWinGuesses: null });
}

// -------------------------------------------------------------------- share --

const CELL_EMOJI: Record<string, string> = {
  correct: "🟩",
  partial: "🟨",
  wrong: "🟥",
  higher: "⬆️",
  lower: "⬇️",
};

/** Spoiler-free share text (PRD §6.4). */
export function shareText(game: DailyGame): string {
  const head = `Gregdle ${game.datasetKey.replace(":", " ").toUpperCase()} [${game.difficulty.toUpperCase()}] — ${game.date}`;
  const grid = game.rows
    .map((r) => r.cells.map((c) => CELL_EMOJI[c.state] ?? "⬛").join(""))
    .join("\n");
  const tail =
    game.status === "won"
      ? `${game.rows.length} guess${game.rows.length === 1 ? "" : "es"}${game.hintsUsed > 0 ? ` (+${game.hintsUsed} hint${game.hintsUsed === 1 ? "" : "s"})` : ""}`
      : "X";
  return `${head}\n${grid}\n${tail}\nhttps://gregdle.stranger3012.workers.dev`;
}
