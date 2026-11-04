/**
 * Core game types shared by the comparison engine, API and UI (PRD §6).
 */

/** Cell states. Ordered/numeric attributes use higher/lower instead of wrong. */
export type CellState = "correct" | "partial" | "wrong" | "higher" | "lower";

export interface Cell {
  state: CellState;
  /** Display value of the GUESSED entry's attribute (already short/labelled). */
  value: string;
  /** Optional longer detail shown as a tooltip (e.g. raw wiki Machine Type). */
  detail?: string;
}

/** One row of the guess grid. */
export interface GuessResult {
  guessId: string;
  guessName: string;
  guessImage: string | null;
  cells: Cell[];
  won: boolean;
}

/** Column descriptor: how an attribute is compared and displayed. */
export interface ColumnDef {
  key: string;
  label: string;
}

export const MACHINE_COLUMNS: ColumnDef[] = [
  { key: "tier", label: "TIER" },
  { key: "structure", label: "STRUCTURE" },
  { key: "size", label: "SIZE" },
  { key: "functionCategory", label: "FUNCTION" },
  { key: "energyHatches", label: "ENERGY" },
  { key: "extras", label: "EXTRAS" },
];
