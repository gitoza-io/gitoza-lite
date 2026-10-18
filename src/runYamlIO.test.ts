import { describe, expect, it } from "vitest";
import { parseRunYaml, serializeRunYaml } from "./runYamlIO";

describe("runYamlIO", () => {
  it("parses front matter title and cases in body", () => {
    const content = `---
title: Sprint 42 smoke
---
cases:
  - path: .gitoza-lite/test/cases/demo/case.md
    result: pending
`;
    const parsed = parseRunYaml(content);
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe("Sprint 42 smoke");
    expect(parsed!.cases).toEqual([
      {
        path: ".gitoza-lite/test/cases/demo/case.md",
        result: "pending",
      },
    ]);
  });

  it("coerces invalid result to pending", () => {
    const content = `---
title: Run
---
cases:
  - path: .gitoza-lite/test/cases/a.md
    result: unknown
`;
    const parsed = parseRunYaml(content);
    expect(parsed!.cases[0].result).toBe("pending");
  });

  it("round-trips serialize and parse", () => {
    const detail = {
      title: "My run",
      cases: [
        {
          path: ".gitoza-lite/test/cases/p/s.md",
          result: "passed" as const,
        },
        {
          path: ".gitoza-lite/test/cases/p/f.md",
          result: "failed" as const,
        },
      ],
    };
    const serialized = serializeRunYaml(detail);
    const parsed = parseRunYaml(serialized);
    expect(parsed!.title).toBe("My run");
    expect(parsed!.cases).toEqual(detail.cases);
  });

  it("handles empty cases", () => {
    const serialized = serializeRunYaml({ title: "Empty", cases: [] });
    const parsed = parseRunYaml(serialized);
    expect(parsed!.cases).toEqual([]);
  });
});
