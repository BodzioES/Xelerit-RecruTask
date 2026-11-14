import { describe, expect, it } from "vitest";
import {
  addHours,
  combineLocal,
  formatDuration,
  localDateValue,
  localTimeValue,
  pad,
  toIsoFromLocal,
} from "./datetime";

describe("lib/datetime", () => {
  it("pads numbers", () => {
    expect(pad(1)).toBe("01");
    expect(pad(10)).toBe("10");
  });

  it("formats local date/time values", () => {
    const d = new Date(2027, 2, 10, 10, 30);
    expect(localDateValue(d)).toBe("2027-03-10");
    expect(localTimeValue(d)).toBe("10:30");
  });

  it("combines local date/time", () => {
    const d = combineLocal("2027-03-10", "10:30");
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(30);
  });

  it("converts to ISO from local", () => {
    // Note: ISO string is in UTC, so this test depends on the environment
    // For pure logic tests, we check the output format matches expected ISO
    const iso = toIsoFromLocal("2027-03-10", "10:00");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("adds hours", () => {
    const result = addHours("2027-03-10", "10:00", 4);
    expect(result).toEqual({ date: "2027-03-10", time: "14:00" });
  });

  it("formats duration", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
  });
});
