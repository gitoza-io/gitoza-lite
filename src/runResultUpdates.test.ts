import { describe, expect, it } from "vitest";
import { applyResultUpdates } from "./runResultUpdates";

describe("applyResultUpdates", () => {
  const cases = [
    { path: "cases/a.md", result: "pending" as const },
    { path: "cases/b.md", result: "passed" as const },
  ];

  it("applies batch updates by normalized path", () => {
    const updated = applyResultUpdates(cases, [
      { path: "cases/a.md", result: "failed" },
      { path: "cases/b.md", result: "skipped" },
    ]);
    expect(updated[0].result).toBe("failed");
    expect(updated[1].result).toBe("skipped");
  });

  it("ignores unknown paths", () => {
    const updated = applyResultUpdates(cases, [
      { path: "cases/missing.md", result: "passed" },
    ]);
    expect(updated).toEqual(cases);
  });

  it("returns cases unchanged when updates is empty", () => {
    expect(applyResultUpdates(cases, [])).toBe(cases);
  });

  it("normalizes backslashes in paths", () => {
    const updated = applyResultUpdates(cases, [
      { path: "cases\\a.md", result: "passed" },
    ]);
    expect(updated[0].result).toBe("passed");
  });
});
