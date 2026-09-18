import { describe, expect, it } from "vitest";
import {
  filterProjectsToOpenedName,
  filterTreeToOpenedNode,
  filterTreeToOpenedRoot,
} from "./openFocusTreeFilter";

describe("filterTreeToOpenedRoot", () => {
  const tree = [
    { directory_path: ".gitoza-lite/test/cases/a", name: "a" },
    { directory_path: ".gitoza-lite/test/cases/b", name: "b" },
  ];

  it("returns full tree when no opened path", () => {
    expect(filterTreeToOpenedRoot(tree, null)).toEqual(tree);
    expect(filterTreeToOpenedRoot(tree, undefined)).toEqual(tree);
  });

  it("filters to the opened root", () => {
    expect(filterTreeToOpenedRoot(tree, ".gitoza-lite/test/cases/b")).toEqual([
      tree[1],
    ]);
  });

  it("returns empty array for missing path", () => {
    expect(filterTreeToOpenedRoot(tree, "missing")).toEqual([]);
  });
});

describe("filterTreeToOpenedNode", () => {
  const nested = {
    directory_path: ".gitoza-lite/wiki/guides/setup",
    name: "setup",
    children: [],
  };
  const tree = [
    {
      directory_path: ".gitoza-lite/wiki/guides",
      name: "guides",
      children: [nested],
    },
    { directory_path: ".gitoza-lite/wiki/other", name: "other" },
  ];

  it("returns full tree when no opened path", () => {
    expect(filterTreeToOpenedNode(tree, null)).toEqual(tree);
  });

  it("filters to a nested opened node", () => {
    expect(
      filterTreeToOpenedNode(tree, ".gitoza-lite/wiki/guides/setup"),
    ).toEqual([nested]);
  });

  it("filters to a top-level opened node", () => {
    expect(filterTreeToOpenedNode(tree, ".gitoza-lite/wiki/guides")).toEqual([
      tree[0],
    ]);
  });

  it("returns empty array for missing path", () => {
    expect(filterTreeToOpenedNode(tree, "missing")).toEqual([]);
  });
});

describe("filterProjectsToOpenedName", () => {
  const projects = [
    { name: "Alpha", display_name: "Alpha" },
    { name: "Beta", display_name: "Beta" },
  ];

  it("returns full list when no opened name", () => {
    expect(filterProjectsToOpenedName(projects, null)).toEqual(projects);
  });

  it("filters to the opened project name", () => {
    expect(filterProjectsToOpenedName(projects, "Beta")).toEqual([projects[1]]);
  });
});
