import { describe, expect, it } from "vitest";
import {
  filterProjectsToOpenedName,
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
