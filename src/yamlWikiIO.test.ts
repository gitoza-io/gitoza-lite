import { describe, expect, it } from "vitest";
import {
  parseWikiYaml,
  randomWikiId,
  serializeWikiYaml,
} from "./yamlWikiIO";
import type { YamlWikiDetail } from "./messageTypes";

describe("yamlWikiIO", () => {
  it("parses wiki yaml", () => {
    const content = `---
title: Overview
tags: [handbook]
status: published
---
# Hello
`;
    const parsed = parseWikiYaml(
      content,
      ".gitoza-lite/wiki/docs/W-ABC123.yaml",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.page_id).toBe("W-ABC123");
    expect(parsed!.title).toBe("Overview");
    expect(parsed!.status).toBe("published");
    expect(parsed!.directory).toBe(".gitoza-lite/wiki/docs");
    expect(parsed!.body.trim()).toBe("# Hello");
  });

  it("defaults status to draft", () => {
    const content = `---
title: Draft page
---
`;
    const parsed = parseWikiYaml(content, ".gitoza-lite/wiki/W-XYZ.yaml");
    expect(parsed!.status).toBe("draft");
  });

  it("round-trips serialize", () => {
    const detail: YamlWikiDetail = {
      page_id: "W-TEST01",
      title: "Page",
      tags: ["a", "b"],
      status: "outdated",
      file_path: ".gitoza-lite/wiki/W-TEST01.yaml",
      body: "Body",
      directory: ".gitoza-lite/wiki",
    };
    const serialized = serializeWikiYaml(detail);
    const parsed = parseWikiYaml(serialized, detail.file_path);
    expect(parsed!.title).toBe("Page");
    expect(parsed!.tags).toEqual(["a", "b"]);
    expect(parsed!.status).toBe("outdated");
    expect(parsed!.body.trim()).toBe("Body");
  });

  it("allocates W- ids", () => {
    const id = randomWikiId();
    expect(id).toMatch(/^W-[A-Z0-9]{6}$/);
  });
});
