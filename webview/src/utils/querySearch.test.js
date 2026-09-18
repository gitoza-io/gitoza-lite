import { describe, expect, it } from "vitest";
import { TICKET_RELEASE_NONE, ticketSearchKeys } from "../constants/searchKeys";
import {
  collectTicketFilterOptions,
  itemMatchesSearchChips,
  parseQueryToken,
  suggestKeys,
  suggestValues,
  tabCompleteDraft,
} from "./querySearch";

const keys = ticketSearchKeys();

describe("parseQueryToken", () => {
  it("parses free text as q", () => {
    expect(parseQueryToken("login bug", keys)).toEqual({ key: "q", value: "login bug" });
  });

  it("parses key: value", () => {
    expect(parseQueryToken("status: open", keys)).toEqual({ key: "status", value: "open" });
  });

  it("rejects unknown keys", () => {
    expect(parseQueryToken("foo: bar", keys)).toEqual({ error: "Unknown key: foo" });
  });

  it("rejects missing value", () => {
    expect(parseQueryToken("status:", keys)).toEqual({ error: "Missing value for status" });
  });
});

describe("suggestKeys / suggestValues / tabCompleteDraft", () => {
  it("suggests status for stat prefix", () => {
    const s = suggestKeys("stat", keys);
    expect(s.some((x) => x.key === "status")).toBe(true);
  });

  it("suggests status values", () => {
    const s = suggestValues("status: op", keys, {});
    expect(s.some((x) => x.value === "open")).toBe(true);
  });

  it("Tab completes key prefix", () => {
    expect(tabCompleteDraft("stat", keys)).toBe("status: ");
  });
});

describe("itemMatchesSearchChips", () => {
  const ticket = {
    ticket_id: "GITO-1",
    title: "Fix login",
    type: "bug",
    status: "open",
    priority: "high",
    tags: ["smoke"],
    assigned_to: "Ada",
    release: "Gitoza-lite/0-3-1",
  };

  it("ANDs chips", () => {
    expect(
      itemMatchesSearchChips(ticket, [
        { key: "status", value: "open" },
        { key: "tag", value: "smoke" },
      ]),
    ).toBe(true);
    expect(
      itemMatchesSearchChips(ticket, [
        { key: "status", value: "open" },
        { key: "tag", value: "other" },
      ]),
    ).toBe(false);
  });

  it("matches free text q", () => {
    expect(itemMatchesSearchChips(ticket, [{ key: "q", value: "login" }], {
      queryFields: ["ticket_id", "title"],
    })).toBe(true);
  });

  it("matches no release sentinel", () => {
    expect(
      itemMatchesSearchChips(
        { ...ticket, release: "" },
        [{ key: "release", value: TICKET_RELEASE_NONE }],
      ),
    ).toBe(true);
  });
});

describe("collectTicketFilterOptions", () => {
  it("collects unique tags and assignees", () => {
    const opts = collectTicketFilterOptions([
      { tags: ["a", "b"], assigned_to: "Ada", release: "r1", priority: "high" },
      { tags: ["a"], assigned_to: "Bob", release: "r1", priority: "low" },
    ]);
    expect(opts.tags).toEqual(["a", "b"]);
    expect(opts.assigned_to).toEqual(["Ada", "Bob"]);
    expect(opts.releases).toEqual(["r1"]);
  });
});
