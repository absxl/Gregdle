export interface LeaderboardRow {
  display_name: string;
  guess_count: number | null;
  hints_used: number;
  rank: number;
}

export function LeaderboardTable({
  rows,
  error,
}: {
  rows: LeaderboardRow[];
  error: string | null;
}) {
  if (error) {
    return (
      <div className="panel w-full p-6 text-center text-sm font-semibold text-muted">{error}</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="panel flex w-full flex-col items-center gap-2 p-8 text-center">
        <p className="text-base font-bold">No winners yet today</p>
        <p className="text-sm text-muted">
          Be the first — solve the daily while signed in and you take rank #1.
        </p>
      </div>
    );
  }

  const medal = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div className="panel w-full overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-xs font-bold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">Guesses</th>
            <th className="px-4 py-3 text-right">Hints</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.rank}-${r.display_name}`}
              className="border-b border-edge/50 last:border-0"
            >
              <td className="px-4 py-3 font-black tabular-nums">{medal(r.rank) ?? r.rank}</td>
              <td className="px-4 py-3 font-bold">{r.display_name}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">
                {r.guess_count ?? "—"}
              </td>
              <td className="px-4 py-3 text-right text-muted tabular-nums">
                {r.hints_used > 0 ? r.hints_used : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
