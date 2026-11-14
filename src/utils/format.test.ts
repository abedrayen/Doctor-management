import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, frDateToIso, isIsoDate, maskDate, maskTime } from "./dates";
import { formatBytes, isValidPhone, normalizePhone, numOrNull, numToStr } from "./format";

describe("phone helpers", () => {
  it.each([
    ["20123456", "+216 20 123 456"],
    ["20 123 456", "+216 20 123 456"],
    ["+21620123456", "+216 20 123 456"],
    ["0021620123456", "+216 20 123 456"],
    ["21620123456", "+216 20 123 456"],
    ["+33612345678", "+33612345678"],
    ["", ""],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("validates phones", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone("20123456")).toBe(true);
    expect(isValidPhone("+33612345678")).toBe(true);
    expect(isValidPhone("1234")).toBe(false);
  });
});

describe("number helpers", () => {
  it("parses decimal comma and empty values", () => {
    expect(numOrNull("3,5")).toBe(3.5);
    expect(numOrNull("  ")).toBeNull();
    expect(numToStr(3.5)).toBe("3,5");
    expect(numToStr(null)).toBe("");
  });

  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(formatBytes(2048)).toBe("2.0 Ko");
  });
});

describe("date helpers", () => {
  it("formats as DD/MM/YYYY and 24h", () => {
    expect(formatDate("2026-11-14")).toBe("14/11/2026");
    expect(formatDateTime("2026-11-14T15:05")).toBe("14/11/2026 15:05");
    expect(formatDate(null)).toBe("—");
  });

  it("masks and converts typed dates", () => {
    expect(maskDate("14112026")).toBe("14/11/2026");
    expect(maskDate("1411")).toBe("14/11");
    expect(frDateToIso("14/11/2026")).toBe("2026-11-14");
    expect(frDateToIso("31/02/2026")).toBeNull();
    expect(isIsoDate("2026-02-30")).toBe(false);
  });

  it("masks times", () => {
    expect(maskTime("1530")).toBe("15:30");
    expect(maskTime("15")).toBe("15");
  });
});
