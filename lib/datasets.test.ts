import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  DATASET_KEYS,
  VERSIONS,
  datasetLabel,
  isDatasetInactive,
  parseDatasetKey,
} from "./datasets";

describe("datasets", () => {
  it("defines 2 versions and 3 categories", () => {
    expect(VERSIONS).toEqual(["gtnh", "gtceu"]);
    expect(CATEGORIES).toEqual(["materials", "machines", "items"]);
  });

  it("ships 5 active datasets — gtnh:materials dropped in v1 (M1 probe)", () => {
    expect(DATASET_KEYS).toHaveLength(5);
    expect(new Set(DATASET_KEYS).size).toBe(5);
    expect(DATASET_KEYS).not.toContain("gtnh:materials");
    expect(isDatasetInactive("gtnh:materials")).toBe(true);
    expect(isDatasetInactive("gtnh:machines")).toBe(false);
  });

  it("labels datasets in the GUI format", () => {
    expect(datasetLabel("gtnh:materials")).toBe("GTNH // MATERIALS");
    expect(datasetLabel("gtceu:items")).toBe("GTCEu // ITEMS");
  });

  it("rejects invalid and inactive keys", () => {
    expect(parseDatasetKey("gtnh:machines")).toBe("gtnh:machines");
    expect(parseDatasetKey("gtnh:materials")).toBeNull(); // inactive in v1
    expect(parseDatasetKey("gtceu:recipes")).toBeNull();
    expect(parseDatasetKey("nonsense")).toBeNull();
  });
});
