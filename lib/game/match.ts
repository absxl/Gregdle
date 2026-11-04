/**
 * Vague guess resolution for Hard mode (D36, amended): no attribute chips,
 * no visible machine list — typed text is auto-corrected to the closest
 * machine name (or alias). "Vague" = small typos forgiven, wildly different
 * strings rejected so guesses stay honest.
 *
 * D38: partial-name SUGGESTIONS are allowed again (name-only, no tags) —
 * typing "bending machine" suggests "Industrial Bending Machine" when at
 * least one word of the query appears in the name. The strict full-string
 * resolution still gates what actually gets submitted.
 */

export interface Matchable {
  // Structurally compatible with the game's PoolEntry.
  id: string;
  name: string;
  aliases?: string[];
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Classic DP Levenshtein distance, fine for ~200 candidates. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j]! + 1, // deletion
        row[j - 1]! + 1, // insertion
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1), // substitution
      );
    }
    prev = row;
  }
  return prev[b.length]!;
}

/**
 * Resolve typed text to the closest machine. Returns null when nothing is
 * close enough: the tolerance scales with the query length (25%, min 2) so
 * short strings stay strict and long typos are still forgiven.
 */

export function resolveGuess(query: string, pool: readonly Matchable[]): Matchable | null {
  const q = normalize(query);
  if (!q) return null;

  let best: Matchable | null = null;
  let bestDistance = Infinity;

  for (const entry of pool) {
    const names = [entry.name, ...(entry.aliases ?? [])];
    for (const name of names) {
      const n = normalize(name);
      const distance = levenshtein(q, n);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = entry;
      }
    }
  }

  if (!best) return null;
  const tolerance = Math.max(2, Math.floor(q.length * 0.25));
  return bestDistance <= tolerance ? best : null;
}

/**
 * Name-only suggestions for Hard mode (D38): machines whose name (or alias)
 * contains every word of the query, ordered by full-string similarity. No
 * attributes, no chips — just the names. Capped by the caller.
 */
export function suggestPartialNames(
  query: string,
  pool: readonly Matchable[],
  limit = 5,
): Matchable[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const q = normalize(query);

  return pool
    .filter((entry) => {
      const names = [entry.name, ...(entry.aliases ?? [])].map(normalize);
      // Every typed word must appear in some form of the name.
      return names.some((n) => words.every((w) => n.includes(w)));
    })
    .sort(
      (a, b) =>
        levenshtein(q, normalize(a.name)) - levenshtein(q, normalize(b.name)) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}
