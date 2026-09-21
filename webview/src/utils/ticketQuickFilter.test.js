import { describe, expect, it } from "vitest";
import {
  countTicketQuickFilters,
  ticketMatchesQuickFilter,
  toggleTicketQuickFilter,
} from "./ticketQuickFilter";

describe("ticketMatchesQuickFilter", () => {
  it("passes all when filter is null", () => {
    expect(ticketMatchesQuickFilter({ status: "done" }, null)).toBe(true);
  });

  it("matches open status only", () => {
    expect(ticketMatchesQuickFilter({ status: "open" }, "open")).toBe(true);
    expect(ticketMatchesQuickFilter({ status: "in_progress" }, "open")).toBe(false);
    expect(ticketMatchesQuickFilter({ status: "blocked" }, "open")).toBe(false);
  });

  it("matches blocked status only", () => {
    expect(ticketMatchesQuickFilter({ status: "blocked" }, "blocked")).toBe(true);
    expect(ticketMatchesQuickFilter({ status: "open" }, "blocked")).toBe(false);
  });

  it("matches backlog as empty or missing release", () => {
    expect(ticketMatchesQuickFilter({ release: "" }, "backlog")).toBe(true);
    expect(ticketMatchesQuickFilter({ release: "   " }, "backlog")).toBe(true);
    expect(ticketMatchesQuickFilter({}, "backlog")).toBe(true);
    expect(ticketMatchesQuickFilter({ release: "Gitoza-lite/0-3-1" }, "backlog")).toBe(
      false,
    );
  });
});

describe("toggleTicketQuickFilter", () => {
  it("sets filter when none active", () => {
    expect(toggleTicketQuickFilter(null, "open")).toBe("open");
  });

  it("clears when clicking the same filter", () => {
    expect(toggleTicketQuickFilter("open", "open")).toBe(null);
  });

  it("replaces when clicking a different filter", () => {
    expect(toggleTicketQuickFilter("open", "blocked")).toBe("blocked");
  });
});

describe("countTicketQuickFilters", () => {
  it("counts open, blocked, and backlog independently", () => {
    const tickets = [
      { status: "open", release: "r1" },
      { status: "open" },
      { status: "blocked", release: "" },
      { status: "done", release: "r1" },
    ];
    expect(countTicketQuickFilters(tickets)).toEqual({
      open: 2,
      blocked: 1,
      backlog: 2,
    });
  });
});
