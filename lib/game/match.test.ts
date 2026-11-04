import { describe, expect, it } from "vitest";
import { levenshtein, resolveGuess } from "./match";

const pool = [
  { id: "electric-furnace", name: "Electric Furnace" },
  { id: "alloy-blast-smelter", name: "Alloy Blast Smelter", aliases: ["ABS"] },
  { id: "vacuum-freezer", name: "Vacuum Freezer" },
];

describe("resolveGuess (hard mode vague correction)", () => {
  it("exact match (case/spacing-insensitive) resolves", () => {
    expect(resolveGuess("electric furnace", pool)?.id).toBe("electric-furnace");
    expect(resolveGuess("  ELECTRIC   FURNACE ", pool)?.id).toBe("electric-furnace");
  });

  it("small typos are auto-corrected", () => {
    expect(resolveGuess("electric furnce", pool)?.id).toBe("electric-furnace");
    expect(resolveGuess("alloy blast smeter", pool)?.id).toBe("alloy-blast-smelter");
  });

  it("aliases match too", () => {
    expect(resolveGuess("abs", pool)?.id).toBe("alloy-blast-smelter");
  });

  it("wildly different strings are rejected (null)", () => {
    expect(resolveGuess("quantum hyperspace toaster", pool)).toBeNull();
    expect(resolveGuess("", pool)).toBeNull();
  });
});

describe("levenshtein", () => {
  it("basic distances", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });
});
