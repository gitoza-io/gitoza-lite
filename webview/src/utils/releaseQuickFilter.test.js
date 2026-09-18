import { describe, expect, it } from "vitest";
import {
  countReleaseQuickFilters,
  releaseMatchesQuickFilter,
  toggleReleaseQuickFilter,
} from "./releaseQuickFilter";

describe("releaseMatchesQuickFilter", () => {
  it("passes all when filter is null", () => {
    expect(releaseMatchesQuickFilter({ status: "shipped" }, null)).toBe(true);
  });

  it("matches open, shipped, cancelled by status", () => {
    expect(releaseMatchesQuickFilter({ status: "open" }, "open")).toBe(true);
    expect(releaseMatchesQuickFilter({ status: "shipped" }, "open")).toBe(false);
    expect(releaseMatchesQuickFilter({ status: "shipped" }, "shipped")).toBe(true);
    expect(releaseMatchesQuickFilter({ status: "cancelled" }, "cancelled")).toBe(
      true,
    );
  });
});

describe("toggleReleaseQuickFilter", () => {
  it("sets, clears, and replaces", () => {
    expect(toggleReleaseQuickFilter(null, "open")).toBe("open");
    expect(toggleReleaseQuickFilter("open", "open")).toBe(null);
    expect(toggleReleaseQuickFilter("open", "shipped")).toBe("shipped");
  });
});

describe("countReleaseQuickFilters", () => {
  it("counts each status independently", () => {
    expect(
      countReleaseQuickFilters([
        { status: "open" },
        { status: "open" },
        { status: "shipped" },
        { status: "cancelled" },
      ]),
    ).toEqual({ open: 2, shipped: 1, cancelled: 1 });
  });
});
