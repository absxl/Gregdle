/**
 * Profile statistics (D24): shared computation for public profile pages and
 * the signed-in stats page. Mirrors the local-stats streak logic but over
 * server rows.
 */

export interface ProfileResultRow {
  date: string; // YYYY-MM-DD
  difficulty: "easy" | "hard";
  won: boolean;
  guesses: number | null;
  hints: number;
}

export interface ProfileStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  bestWin: number | null; // fewest guesses in a win
  distribution: Record<number, number>; // guesses -> wins
  lastPlayed: string | null;
}

export function emptyProfileStats(): ProfileStats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    bestWin: null,
    distribution: {},
    lastPlayed: null,
  };
}

export function computeProfileStats(rows: ProfileResultRow[]): ProfileStats {
  const stats = emptyProfileStats();
  if (rows.length === 0) return stats;
  stats.played = rows.length;
  stats.lastPlayed = rows[0]!.date;

  // Rows are expected newest-first (profile_page orders date desc).
  const wins = rows.filter((r) => r.won).sort((a, b) => (a.date < b.date ? 1 : -1));
  stats.wins = wins.length;

  let streak = 0;
  let expectDate: string | null = null;
  for (const r of wins) {
    stats.bestWin =
      stats.bestWin === null ? r.guesses : Math.min(stats.bestWin, r.guesses ?? Infinity);
    if (r.guesses) stats.distribution[r.guesses] = (stats.distribution[r.guesses] ?? 0) + 1;
    if (expectDate === null || r.date === expectDate) streak += 1;
    else streak = 1;
    const d = new Date(`${r.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    expectDate = d.toISOString().slice(0, 10);
    stats.maxStreak = Math.max(stats.maxStreak, streak);
  }
  stats.currentStreak = streak;
  return stats;
}
