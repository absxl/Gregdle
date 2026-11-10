import { VOLTAGE_TIERS } from "@/pipeline/schema";
import type { MachineEntry } from "@/pipeline/schema";
import { FUNCTION_CATEGORY_LABELS } from "@/pipeline/function-categories";
import { MACHINE_COLUMNS, type Cell, type GuessResult } from "./types";

/**
 * Comparison engine (PRD §6.1). Pure functions — fully unit-tested.
 *
 * Cell states: correct (green) / partial (yellow, sets with overlap) /
 * wrong (red) — ordered & numeric attributes use higher/lower instead.
 * Color is never the only signal (PRD §8): the UI also renders an icon.
 */

function enumCell(
  guessValue: string,
  answerValue: string,
  value: string,
  extra?: { detail?: string },
): Cell {
  return {
    state: guessValue === answerValue ? "correct" : "wrong",
    value,
    ...(extra?.detail ? { detail: extra.detail } : {}),
  };
}

function orderedEnumCell<T extends string>(
  order: readonly T[],
  guess: T,
  answer: T,
  value: string,
): Cell {
  if (guess === answer) return { state: "correct", value };
  const gi = order.indexOf(guess);
  const ai = order.indexOf(answer);
  if (gi < 0 || ai < 0) return { state: "wrong", value };
  // Higher tier index = later progression; arrow points where the answer is.
  return { state: gi < ai ? "higher" : "lower", value };
}

function numericCell(guess: number, answer: number, value: string, tolerance = 0): Cell {
  if (Math.abs(guess - answer) <= tolerance) return { state: "correct", value };
  return { state: guess < answer ? "higher" : "lower", value };
}

function setCell(guess: readonly string[], answer: readonly string[], value: string): Cell {
  const g = new Set(guess.map((s) => s.toLowerCase().trim()));
  const a = new Set(answer.map((s) => s.toLowerCase().trim()));
  if (g.size === a.size && [...g].every((x) => a.has(x))) return { state: "correct", value };
  const overlap = [...g].some((x) => a.has(x));
  return { state: overlap ? "partial" : "wrong", value };
}

function sizeVolume(size: { l: number; w: number; h: number }): number {
  return size.l * size.w * size.h;
}

function formatSize(size: { l: number; w: number; h: number }): string {
  return `${size.l}x${size.w}x${size.h}`;
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Text compare with nullability: "n/a" style values never match. */
function nullableTextCell(guess: string | null, answer: string | null, value: string): Cell {
  if (answer === null) return { state: guess === null ? "correct" : "wrong", value };
  if (guess === null) return { state: "wrong", value };
  return enumCell(normalizeText(guess), normalizeText(answer), value);
}

export function compareMachine(guess: MachineEntry, answer: MachineEntry): GuessResult {
  const a = guess.attributes;
  const b = answer.attributes;

  const cells: Cell[] = [
    orderedEnumCell(VOLTAGE_TIERS, a.tier, b.tier, a.tier),
    enumCell(a.structure, b.structure, a.structure === "single" ? "1x1x1" : "MULTI"),
    numericCell(sizeVolume(a.size), sizeVolume(b.size), formatSize(a.size)),
    enumCell(a.functionCategory, b.functionCategory, FUNCTION_CATEGORY_LABELS[a.functionCategory], {
      detail: a.functionTypeRaw,
    }),
    nullableTextCell(a.energyHatches, b.energyHatches, a.energyHatches ?? "N/A"),
    setCell(a.extras, b.extras, a.extras.length ? a.extras.join(", ") : "none"),
  ];

  return {
    guessId: guess.id,
    guessName: guess.name,
    guessImage: guess.image,
    cells,
    won: guess.id === answer.id,
  };
}

/** Column labels aligned with compareMachine's cell order. */
export const machineColumns = MACHINE_COLUMNS;

// Re-exported for tests of individual primitives.
export const __internals = {
  enumCell,
  orderedEnumCell,
  numericCell,
  setCell,
  sizeVolume,
  normalizeText,
  nullableTextCell,
};
