import { describe, expect, it } from "vitest";
import { formatAge, formatScore } from "./GrowthCharts";

describe("growth format helpers", () => {
  it("formats age in months under 5 years", () => {
    expect(formatAge(18.25)).toBe("18.3 mois");
  });

  it("formats age in years from 60 months", () => {
    expect(formatAge(72)).toBe("6.0 ans");
  });

  it("formats z-score and percentile", () => {
    expect(formatScore({ z: 0.207, percentile: 58.2 })).toBe("z = 0.21 · P58");
    expect(formatScore(undefined)).toBe("—");
  });
});
