import { describe, expect, it } from "vitest";
import {
  parseReleaseYaml,
  serializeReleaseYaml,
  slugifyReleaseStem,
} from "./yamlReleaseIO";
import type { YamlReleaseDetail } from "./messageTypes";

describe("yamlReleaseIO", () => {
  it("parses release yaml", () => {
    const content = `---
release_id: demo/1.1.0
name: 1.1.0
status: open
---
Notes
`;
    const parsed = parseReleaseYaml(
      content,
      ".gitoza-lite/tasks/tickets/demo/releases/1.1.0.yaml",
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.release_id).toBe("demo/1.1.0");
    expect(parsed!.name).toBe("1.1.0");
    expect(parsed!.status).toBe("open");
    expect(parsed!.project).toBe("demo");
    expect(parsed!.stem).toBe("1.1.0");
    expect(parsed!.body.trim()).toBe("Notes");
  });

  it("defaults status and builds release_id from path", () => {
    const content = `---
name: Beta
---
`;
    const parsed = parseReleaseYaml(
      content,
      ".gitoza-lite/tasks/tickets/acme/releases/beta.yaml",
    );
    expect(parsed!.status).toBe("open");
    expect(parsed!.release_id).toBe("acme/beta");
  });

  it("round-trips serialize", () => {
    const detail: YamlReleaseDetail = {
      release_id: "demo/2.0",
      name: "2.0",
      status: "shipped",
      file_path: ".gitoza-lite/tasks/tickets/demo/releases/2.0.yaml",
      body: "Shipped",
      project: "demo",
      stem: "2.0",
    };
    const serialized = serializeReleaseYaml(detail);
    const parsed = parseReleaseYaml(serialized, detail.file_path);
    expect(parsed!.release_id).toBe("demo/2.0");
    expect(parsed!.status).toBe("shipped");
    expect(parsed!.body.trim()).toBe("Shipped");
  });

  it("slugifies release stems", () => {
    expect(slugifyReleaseStem("Release 1.2")).toBe("release-1-2");
    expect(slugifyReleaseStem("")).toBe("release");
  });
});
