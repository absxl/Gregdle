/**
 * Puzzle mode constants (D45), shared by the pipeline, API and UI.
 *
 * SINGLE: centered crops of the 16×16 sprite, in sprite pixels.
 * MULTI: centered crops as a fraction of the render's min dimension.
 * Each wrong guess advances one level; the last level is the full image.
 */

export type PuzzleKind = "single" | "multi";

export const SINGLE_LEVELS = [3, 4, 5, 6, 7, 8, 10, 12, 14, 16] as const;

export const MULTI_FRACTIONS = [0.06, 0.09, 0.12, 0.16, 0.2, 0.25, 0.35, 0.5, 1] as const;

export function levelCount(kind: PuzzleKind): number {
  return kind === "single" ? SINGLE_LEVELS.length : MULTI_FRACTIONS.length;
}

/** Crop spec for a level: sprite-pixel size (single) or fraction (multi). */
export function levelCrop(kind: PuzzleKind, level: number): number {
  const n = Math.max(0, Math.min(level, levelCount(kind) - 1));
  return kind === "single" ? SINGLE_LEVELS[n]! : MULTI_FRACTIONS[n]!;
}

/** Max level index the client may request. */
export function maxLevel(kind: PuzzleKind): number {
  return levelCount(kind) - 1;
}
