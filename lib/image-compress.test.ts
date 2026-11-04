import { describe, expect, it } from "vitest";
import { pickQuality } from "./image-compress";

describe("pickQuality", () => {
  it("picks the first step that fits the byte target", () => {
    expect(pickQuality([100_000, 90_000, 80_000, 70_000])).toBeCloseTo(0.85);
    expect(pickQuality([900_000, 400_000, 300_000, 200_000])).toBeCloseTo(0.78);
    expect(pickQuality([900_000, 900_000, 400_000, 200_000])).toBeCloseTo(0.7);
  });

  it("falls back to the lowest quality when nothing fits", () => {
    expect(pickQuality([900_000, 900_000, 900_000, 900_000])).toBeCloseTo(0.6);
    expect(pickQuality([9_000_000])).toBeCloseTo(0.6);
  });

  it("respects a custom target", () => {
    expect(pickQuality([50_000, 40_000], 55_000)).toBeCloseTo(0.85);
    expect(pickQuality([50_000, 40_000], 45_000)).toBeCloseTo(0.78);
    expect(pickQuality([50_000, 40_000], 35_000)).toBeCloseTo(0.6);
  });
});
