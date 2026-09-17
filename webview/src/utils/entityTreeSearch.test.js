import { describe, expect, it } from "vitest";
import {
  collectMatchingWikiDirs,
  filterGroupedMap,
  itemMatchesEnum,
  itemMatchesQuery,
  itemMatchesTreeSearch,
  pruneWikiTree,
} from "./entityTreeSearch";

describe("itemMatchesQuery", () => {
  it("matches empty query", () => {
    expect(itemMatchesQuery({ title: "Login" }, "", ["title"])).toBe(true);
  });

  it("matches case-insensitive substring on string fields", () => {
    const item = { ticket_id: "PROJ-1", title: "Fix Login Bug" };
    expect(itemMatchesQuery(item, "login", ["ticket_id", "title"])).toBe(true);
    expect(itemMatchesQuery(item, "PROJ-1", ["ticket_id", "title"])).toBe(true);
    expect(itemMatchesQuery(item, "missing", ["ticket_id", "title"])).toBe(false);
  });

  it("matches tags arrays", () => {
    const item = { title: "Docs", tags: ["api", "Onboarding"] };
    expect(itemMatchesQuery(item, "onboard", ["title", "tags"])).toBe(true);
    expect(itemMatchesQuery(item, "xyz", ["title", "tags"])).toBe(false);
  });
});

describe("itemMatchesEnum", () => {
  it("matches empty filter", () => {
    expect(itemMatchesEnum({ priority: "high" }, "priority", "")).toBe(true);
  });

  it("matches case-insensitive exact value", () => {
    expect(itemMatchesEnum({ priority: "High" }, "priority", "high")).toBe(true);
    expect(itemMatchesEnum({ priority: "low" }, "priority", "high")).toBe(false);
  });
});

describe("itemMatchesTreeSearch", () => {
  it("requires both text and enum when set", () => {
    const item = { ticket_id: "A-1", title: "Crash", priority: "high" };
    expect(
      itemMatchesTreeSearch(item, {
        query: "crash",
        queryFields: ["ticket_id", "title"],
        enumKey: "priority",
        enumValue: "high",
      }),
    ).toBe(true);
    expect(
      itemMatchesTreeSearch(item, {
        query: "crash",
        queryFields: ["ticket_id", "title"],
        enumKey: "priority",
        enumValue: "low",
      }),
    ).toBe(false);
  });
});

describe("filterGroupedMap", () => {
  it("drops empty groups after filtering", () => {
    const map = new Map([
      [
        "alpha",
        [
          { title: "A", priority: "high" },
          { title: "B", priority: "low" },
        ],
      ],
      ["beta", [{ title: "C", priority: "low" }]],
    ]);
    const filtered = filterGroupedMap(map, (t) => t.priority === "high");
    expect([...filtered.keys()]).toEqual(["alpha"]);
    expect(filtered.get("alpha")).toHaveLength(1);
    expect(filtered.get("alpha")[0].title).toBe("A");
  });
});

describe("wiki tree pruning", () => {
  const root = ".gitoza-lite/wiki";

  it("collectMatchingWikiDirs keeps ancestors of matching dirs", () => {
    const pagesByDir = new Map([
      [`${root}/guides/api`, [{ title: "Auth", directory: `${root}/guides/api` }]],
    ]);
    const keep = collectMatchingWikiDirs(pagesByDir, root);
    expect(keep.has(`${root}/guides/api`)).toBe(true);
    expect(keep.has(`${root}/guides`)).toBe(true);
    expect(keep.has(root)).toBe(true);
  });

  it("pruneWikiTree removes folders without matches", () => {
    const tree = [
      {
        directory_path: `${root}/guides`,
        display_name: "guides",
        children: [
          {
            directory_path: `${root}/guides/api`,
            display_name: "api",
            children: [],
          },
          {
            directory_path: `${root}/guides/misc`,
            display_name: "misc",
            children: [],
          },
        ],
      },
      {
        directory_path: `${root}/empty`,
        display_name: "empty",
        children: [],
      },
    ];
    const keep = new Set([root, `${root}/guides`, `${root}/guides/api`]);
    const pruned = pruneWikiTree(tree, keep);
    expect(pruned).toHaveLength(1);
    expect(pruned[0].directory_path).toBe(`${root}/guides`);
    expect(pruned[0].children).toHaveLength(1);
    expect(pruned[0].children[0].directory_path).toBe(`${root}/guides/api`);
  });
});
