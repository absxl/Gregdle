import { describe, expect, it } from "vitest";
import type { MachineEntry } from "@/pipeline/schema";
import { compareMachine } from "./compare";
import { machineColumns } from "./compare";

function machine(
  overrides: Partial<MachineEntry["attributes"]> & { id?: string; name?: string } = {},
): MachineEntry {
  return {
    id: overrides.id ?? "test-machine",
    name: overrides.name ?? "Test Machine",
    dataset: "gtnh:machines",
    image: null,
    source_url: "https://wiki.gtnewhorizons.com/wiki/Test_Machine",
    difficulty: "hard",
    aliases: [],
    attributes: {
      tier: "LV",
      structure: "multiblock",
      size: { l: 3, w: 3, h: 4 },
      functionCategory: "smelting-alloying",
      functionTypeRaw: "Alloy Smelter",
      energyHatches: "Regular",
      extras: ["overclocks: imperfect"],
      pollution: 200,
      ...overrides,
    },
    flagged: false,
  };
}

describe("compareMachine", () => {
  it("win is detected by id equality and marks every cell correct", () => {
    const a = machine({ id: "alloy-blast-smelter", name: "Alloy Blast Smelter" });
    const b = machine({ id: "alloy-blast-smelter", name: "Alloy Blast Smelter" });
    const r = compareMachine(a, b);
    expect(r.won).toBe(true);
    expect(r.cells.every((c) => c.state === "correct")).toBe(true);
  });

  it("same machine data but different id is NOT a win yet all cells correct", () => {
    const r = compareMachine(machine({ id: "a" }), machine({ id: "b" }));
    expect(r.won).toBe(false);
    expect(r.cells.every((c) => c.state === "correct")).toBe(true);
  });

  it("ordered tier compare: higher/lower arrows point at the answer", () => {
    const guess = machine({});
    const higherAnswer = machine({ id: "x", tier: "IV" }); // answer above LV
    const lowerAnswer = machine({ id: "x", tier: "ULV" }); // answer below LV
    expect(compareMachine(guess, higherAnswer).cells[0].state).toBe("higher");
    expect(compareMachine(guess, lowerAnswer).cells[0].state).toBe("lower");
  });

  it("tier equality is correct even with same-position enum", () => {
    const r = compareMachine(machine({ id: "a", tier: "ZPM" }), machine({ id: "b", tier: "ZPM" }));
    expect(r.cells[0].state).toBe("correct");
  });

  it("structure compare is correct/wrong", () => {
    const guess = machine({ id: "a" });
    expect(compareMachine(guess, machine({ id: "b", structure: "single" })).cells[1].state).toBe(
      "wrong",
    );
    expect(compareMachine(guess, machine({ id: "c" })).cells[1].state).toBe("correct");
  });

  it("size compare uses volume with higher/lower", () => {
    const guess = machine({ id: "a" }); // 3x3x4 = 36
    const bigger = machine({ id: "b", size: { l: 5, w: 5, h: 5 } }); // 125
    const smaller = machine({ id: "c", size: { l: 1, w: 1, h: 1 } });
    expect(compareMachine(guess, bigger).cells[2].state).toBe("higher");
    expect(compareMachine(guess, smaller).cells[2].state).toBe("lower");
    expect(
      compareMachine(guess, machine({ id: "d", size: { l: 4, w: 3, h: 3 } })).cells[2].state,
    ).toBe("correct"); // 36 = 36
  });

  it("function compare uses the generic category; label shown, raw type as detail", () => {
    const guess = machine({
      id: "a",
      functionCategory: "smelting-alloying",
      functionTypeRaw: "Alloy Blast Smelter",
    });
    const sameCategory = machine({
      id: "b",
      functionCategory: "smelting-alloying",
      functionTypeRaw: "Electric Furnace",
    });
    const other = machine({
      id: "c",
      functionCategory: "power-generation",
      functionTypeRaw: "Gas Turbine",
    });

    const hit = compareMachine(guess, sameCategory).cells[3];
    expect(hit.state).toBe("correct");
    expect(hit.value).toBe("SMELT/ALLOY");
    expect(hit.detail).toBe("Alloy Blast Smelter"); // tooltip keeps the raw type

    expect(compareMachine(guess, other).cells[3].state).toBe("wrong");
  });

  it("nullable energy: null answer accepts null guess, rejects text", () => {
    const nullAnswer = machine({ id: "b", energyHatches: null });
    expect(
      compareMachine(machine({ id: "a", energyHatches: null }), nullAnswer).cells[4].state,
    ).toBe("correct");
    expect(
      compareMachine(machine({ id: "a", energyHatches: "Regular" }), nullAnswer).cells[4].state,
    ).toBe("wrong");
  });

  it("extras set compare: exact / overlap-partial / none", () => {
    const guess = machine({ id: "a", extras: ["overclocks: imperfect", "cleanroom"] });
    const same = machine({ id: "b", extras: ["cleanroom", "overclocks: imperfect"] });
    const overlap = machine({ id: "c", extras: ["overclocks: perfect", "cleanroom"] });
    const none = machine({ id: "d", extras: ["muffler"] });
    expect(compareMachine(guess, same).cells[5].state).toBe("correct");
    expect(compareMachine(guess, overlap).cells[5].state).toBe("partial");
    expect(compareMachine(guess, none).cells[5].state).toBe("wrong");
  });

  it("empty extras sets compare as correct against empty", () => {
    const r = compareMachine(machine({ id: "a", extras: [] }), machine({ id: "b", extras: [] }));
    expect(r.cells[5].state).toBe("correct");
  });

  it("cells align with the column definitions", () => {
    const r = compareMachine(machine(), machine());
    expect(r.cells).toHaveLength(machineColumns.length);
    expect(machineColumns.map((c) => c.key)).toEqual([
      "tier",
      "structure",
      "size",
      "functionCategory",
      "energyHatches",
      "extras",
    ]);
  });
});
