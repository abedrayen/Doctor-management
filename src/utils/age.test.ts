import { describe, expect, it } from "vitest";
import { computeAge, formatAge } from "./age";

const ref = new Date(2024, 5, 15); // 15/06/2024

describe("formatAge", () => {
  it("uses days under one month", () => {
    expect(formatAge("2024-06-14", ref)).toBe("1 jour");
    expect(formatAge("2024-06-05", ref)).toBe("10 jours");
  });

  it("uses months under two years", () => {
    expect(formatAge("2024-05-15", ref)).toBe("1 mois");
    expect(formatAge("2023-12-15", ref)).toBe("6 mois");
    expect(formatAge("2022-07-15", ref)).toBe("23 mois");
  });

  it("uses years and months from two years", () => {
    expect(formatAge("2022-06-15", ref)).toBe("2 ans");
    expect(formatAge("2020-03-15", ref)).toBe("4 ans 3 mois");
  });
});

describe("computeAge", () => {
  it("splits total months into years and months", () => {
    const age = computeAge("2020-03-15", ref);
    expect(age).toMatchObject({ years: 4, months: 3, totalMonths: 51 });
  });

  it("accepts Date objects", () => {
    expect(computeAge(new Date(2024, 0, 15), ref).totalMonths).toBe(5);
  });
});
