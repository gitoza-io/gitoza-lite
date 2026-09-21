import { describe, expect, it } from "vitest";
import {
  UI_SCALE_DEFAULT,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  clampUiScale,
  parseUiScale,
  roundUiScale,
  stepUiScale,
} from "./webviewZoom";

describe("clampUiScale", () => {
  it("clamps into the allowed range", () => {
    expect(clampUiScale(0.1)).toBe(UI_SCALE_MIN);
    expect(clampUiScale(9)).toBe(UI_SCALE_MAX);
    expect(clampUiScale(1.2)).toBe(1.2);
  });

  it("falls back to default for non-finite values", () => {
    expect(clampUiScale(NaN)).toBe(UI_SCALE_DEFAULT);
    expect(clampUiScale("nope")).toBe(UI_SCALE_DEFAULT);
    expect(clampUiScale(undefined)).toBe(UI_SCALE_DEFAULT);
  });
});

describe("roundUiScale / stepUiScale", () => {
  it("rounds to two decimals", () => {
    expect(roundUiScale(1.0500001)).toBe(1.05);
  });

  it("steps up and down within bounds", () => {
    expect(stepUiScale(1, 1)).toBe(1.05);
    expect(stepUiScale(1, -1)).toBe(0.95);
    expect(stepUiScale(UI_SCALE_MIN, -1)).toBe(UI_SCALE_MIN);
    expect(stepUiScale(UI_SCALE_MAX, 1)).toBe(UI_SCALE_MAX);
  });
});

describe("parseUiScale", () => {
  it("parses stored strings and defaults empty/null", () => {
    expect(parseUiScale("1.1")).toBe(1.1);
    expect(parseUiScale(null)).toBe(UI_SCALE_DEFAULT);
    expect(parseUiScale("")).toBe(UI_SCALE_DEFAULT);
    expect(parseUiScale("0.2")).toBe(UI_SCALE_MIN);
  });
});
