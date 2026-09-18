import { describe, expect, it } from "vitest";
import {
  countReleaseTicketQuickFilters,
  releaseTicketMatchesQuickFilter,
  toggleReleaseTicketQuickFilter,
} from "./releaseTicketQuickFilter";

describe("releaseTicketMatchesQuickFilter", () => {
  it("passes all when filter is null", () => {
    expect(releaseTicketMatchesQuickFilter({ status: "done" }, null)).toBe(true);
  });

  it("matches each status strictly", () => {
    expect(releaseTicketMatchesQuickFilter({ status: "open" }, "open")).toBe(true);
    expect(
      releaseTicketMatchesQuickFilter({ status: "in_progress" }, "in_progress"),
    ).toBe(true);
    expect(
      releaseTicketMatchesQuickFilter({ status: "in_testing" }, "in_testing"),
    ).toBe(true);
    expect(releaseTicketMatchesQuickFilter({ status: "blocked" }, "blocked")).toBe(
      true,
    );
    expect(releaseTicketMatchesQuickFilter({ status: "done" }, "done")).toBe(true);
    expect(releaseTicketMatchesQuickFilter({ status: "open" }, "done")).toBe(false);
    expect(
      releaseTicketMatchesQuickFilter({ status: "cancelled" }, "open"),
    ).toBe(false);
  });
});

describe("toggleReleaseTicketQuickFilter", () => {
  it("sets, clears, and replaces", () => {
    expect(toggleReleaseTicketQuickFilter(null, "open")).toBe("open");
    expect(toggleReleaseTicketQuickFilter("open", "open")).toBe(null);
    expect(toggleReleaseTicketQuickFilter("open", "blocked")).toBe("blocked");
  });
});

describe("countReleaseTicketQuickFilters", () => {
  it("counts the five statuses", () => {
    expect(
      countReleaseTicketQuickFilters([
        { status: "open" },
        { status: "open" },
        { status: "in_progress" },
        { status: "in_testing" },
        { status: "blocked" },
        { status: "done" },
        { status: "cancelled" },
      ]),
    ).toEqual({
      open: 2,
      in_progress: 1,
      in_testing: 1,
      blocked: 1,
      done: 1,
    });
  });
});
