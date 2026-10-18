import { describe, expect, it } from "vitest";
import {
  deriveTicketPrefix,
  detailToTicketFrontMatter,
  parseProjectYaml,
  parseTicketYaml,
  serializeProjectYaml,
  serializeTicketYaml,
} from "./yamlTicketIO";
import type { YamlTicketDetail } from "./messageTypes";

describe("yamlTicketIO", () => {
  it("parses front matter and body", () => {
    const content = `---
title: Fix login
type: bug
status: in_progress
priority: high
tags:
  - auth
assigned_to: alice
---
Body here
`;
    const parsed = parseTicketYaml(
      content,
      ".gitoza-lite/tasks/tickets/demo/DEMO-A1B2C3.md",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.ticket_id).toBe("DEMO-A1B2C3");
    expect(parsed!.title).toBe("Fix login");
    expect(parsed!.type).toBe("bug");
    expect(parsed!.status).toBe("in_progress");
    expect(parsed!.tags).toEqual(["auth"]);
    expect(parsed!.project).toBe("demo");
    expect(parsed!.body.trim()).toBe("Body here");
  });

  it("defaults type and status", () => {
    const content = `---
title: Only title
---

`;
    const parsed = parseTicketYaml(content, "X-1.md");
    expect(parsed!.type).toBe("task");
    expect(parsed!.status).toBe("open");
  });

  it("round-trips serialize", () => {
    const detail: YamlTicketDetail = {
      ticket_id: "DEMO-1",
      title: "Demo",
      tags: ["a"],
      type: "story",
      status: "blocked",
      priority: "medium",
      assigned_to: "bob",
      reporter: "carol",
      release: "demo/1.0",
      params: { area: "api" },
      file_path: ".gitoza-lite/tasks/tickets/demo/DEMO-1.md",
      body: "Hello",
      project: "demo",
    };
    const serialized = serializeTicketYaml(detail);
    const parsed = parseTicketYaml(serialized, detail.file_path);
    expect(parsed!.title).toBe("Demo");
    expect(parsed!.type).toBe("story");
    expect(parsed!.status).toBe("blocked");
    expect(parsed!.release).toBe("demo/1.0");
    expect(parsed!.params).toEqual({ area: "api" });
    expect(parsed!.body.trim()).toBe("Hello");
    expect(detailToTicketFrontMatter(detail).type).toBe("story");
  });

  it("derives and serializes project prefix as front-matter Markdown", () => {
    expect(deriveTicketPrefix("demo")).toBe("DEMO");
    expect(deriveTicketPrefix("my-app")).toBe("MYAP");
    const md = serializeProjectYaml("demo");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("ticket_prefix: DEMO");
    expect(parseProjectYaml(md).ticket_prefix).toBe("DEMO");
  });

  it("defaults project prefix when front matter is missing", () => {
    expect(parseProjectYaml("ticket_prefix: DEMO\n").ticket_prefix).toBe("TICK");
    expect(parseProjectYaml("").ticket_prefix).toBe("TICK");
  });
});
