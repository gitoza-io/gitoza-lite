import { describe, expect, it } from "vitest";
import { assertUnderRoot } from "./pathAsserts";
import { TICKETS_ROOT, WIKI_ROOT } from "./messageTypes";

describe("pathAsserts", () => {
  it("allows paths under tickets and wiki roots", () => {
    expect(() =>
      assertUnderRoot(`${TICKETS_ROOT}/demo/DEMO-1.yaml`, TICKETS_ROOT),
    ).not.toThrow();
    expect(() => assertUnderRoot(`${WIKI_ROOT}/W-1.yaml`, WIKI_ROOT)).not.toThrow();
  });

  it("rejects paths outside roots or with ..", () => {
    expect(() =>
      assertUnderRoot(".gitoza/tasks/tickets/x", TICKETS_ROOT),
    ).toThrow();
    expect(() => assertUnderRoot(".gitoza/wiki/x", WIKI_ROOT)).toThrow();
    expect(() =>
      assertUnderRoot(`${TICKETS_ROOT}/../escape`, TICKETS_ROOT),
    ).toThrow();
  });
});
