import { describe, expect, it } from "vitest";
import {
  FUNCTION_CATEGORY_LABELS,
  FUNCTION_CATEGORIES,
  mapFunctionType,
} from "./function-categories";

describe("function category mapping (D19)", () => {
  it("covers every category with a label", () => {
    for (const c of FUNCTION_CATEGORIES) {
      expect(FUNCTION_CATEGORY_LABELS[c].length).toBeGreaterThan(0);
      expect(FUNCTION_CATEGORY_LABELS[c].length).toBeLessThanOrEqual(11); // fits grid cells
    }
  });

  it("maps representative wiki Machine Types", () => {
    const cases: [string, string][] = [
      ["Gas Turbine", "power-generation"],
      ["Combustion Generator", "power-generation"],
      ["Nuclear Reactor", "power-generation"],
      ["Breeder Reactor", "power-generation"],
      ["Boiler", "power-generation"],
      ["Active Transformer", "power-infrastructure"],
      ["Battery Buffer", "power-infrastructure"],
      ["Macerator", "ore-processing"],
      ["Ore Washer, Simple Washer", "ore-processing"],
      ["Compressor", "solid-processing"],
      ["Extractor", "solid-processing"],
      ["Chemical Reactor", "fluid-chemical"],
      ["Distillery", "fluid-chemical"],
      ["Fluid Alloy Cooker", "smelting-alloying"], // alloy beats fluid (rule order)
      ["Alloy Blast Smelter", "smelting-alloying"],
      ["Vacuum Freezer", "smelting-alloying"],
      ["Assembly Line", "assembly-crafting"],
      ["Circuit Assembler", "assembly-crafting"],
      ["Miner", "extraction"],
      ["Crop Farm", "farming-breeding"],
      ["Bee Housing", "farming-breeding"],
      ["Fluid Tank", "storage-logistics"],
      ["Input Bus, Output Bus", "storage-logistics"],
    ];
    for (const [raw, expected] of cases) {
      expect(mapFunctionType(raw).category, raw).toBe(expected);
    }
  });

  it("unmatched types fall to utility-special and are reported unmapped", () => {
    const r = mapFunctionType("Completely Unknown Doohickey");
    expect(r.category).toBe("utility-special");
    expect(r.matched).toBe(false);
  });
});
