import { describe, expect, it } from "vitest";
import { levenshtein, resolveGuess, suggestPartialNames } from "./match";

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

describe("suggestPartialNames (D38)", () => {
  const biggerPool = [
    ...pool,
    { id: "industrial-bending-machine", name: "Industrial Bending Machine" },
    { id: "bending-machine", name: "Bending Machine" },
    { id: "industrial-coking-factory", name: "Industrial Coking Factory" },
  ];

  it("suggests machines containing every typed word — name only", () => {
    const out = suggestPartialNames("bending machine", biggerPool);
    const ids = out.map((m) => m.id);
    expect(ids).toContain("bending-machine");
    expect(ids).toContain("industrial-bending-machine");
    expect(ids).not.toContain("industrial-coking-factory"); // no "bending"
    // closest full-string edit first
    expect(ids[0]).toBe("bending-machine");
  });

  it("single word works", () => {
    const ids = suggestPartialNames("industrial", biggerPool).map((m) => m.id);
    expect(ids).toContain("industrial-bending-machine");
    expect(ids).toContain("industrial-coking-factory");
    expect(ids).not.toContain("vacuum-freezer");
  });

  it("no match -> empty", () => {
    expect(suggestPartialNames("zzz", biggerPool)).toEqual([]);
  });

  it("respects the limit", () => {
    expect(suggestPartialNames("machine", biggerPool, 1)).toHaveLength(1);
  });
});
