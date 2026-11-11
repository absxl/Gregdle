import Link from "next/link";
import { ItemIcon } from "@/components/ui/ItemIcon";

export interface BestPlayerRow {
  display_name: string;
  best_streak: number;
  win_count: number;
  rank: number;
}

export function BestPlayersTable({
  rows,
  error,
}: {
  rows: BestPlayerRow[];
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
        <p className="text-base font-bold">No one has 3+ wins yet</p>
        <p className="text-sm text-muted">
          Solve dailies while signed in to claim a spot.
        </p>
      </div>
    );
  }

  const medal = (rank: number): "rank1" | "rank2" | "rank3" | null =>
    rank === 1 ? "rank1" : rank === 2 ? "rank2" : rank === 3 ? "rank3" : null;

  return (
    <div className="panel w-full overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-xs font-bold uppercase tracking-wider text-muted">
            <th className="px-4 py-3 font-mono">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">Best streak</th>
            <th className="px-4 py-3 text-right">Wins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.rank}-${r.display_name}`}
              className="border-b border-edge/50 last:border-0"
            >
              <td className="px-4 py-3 font-mono font-bold tabular-nums">
                {medal(r.rank) ? (
                  <ItemIcon name={medal(r.rank)!} size={18} title={`Rank ${r.rank}`} />
                ) : (
                  r.rank
                )}
              </td>
              <td className="px-4 py-3 font-bold">
                <Link
                  href={`/u/${encodeURIComponent(r.display_name)}`}
                  className="hover:text-accent"
                  title="View profile"
                >
                  {r.display_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">{r.best_streak}</td>
              <td className="px-4 py-3 text-right text-muted tabular-nums">{r.win_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
