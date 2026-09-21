import { describe, expect, it } from "vitest";
import {
  buildOpenFocusPathLabel,
  filterProjectsToOpenedName,
  filterTreeToOpenedFocusPath,
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

describe("filterTreeToOpenedFocusPath", () => {
  const leaf = {
    directory_path: ".gitoza-lite/wiki/guides/setup/install",
    name: "install",
    children: [
      {
        directory_path: ".gitoza-lite/wiki/guides/setup/install/extra",
        name: "extra",
      },
    ],
  };
  const setup = {
    directory_path: ".gitoza-lite/wiki/guides/setup",
    name: "setup",
    children: [
      leaf,
      { directory_path: ".gitoza-lite/wiki/guides/setup/other", name: "other" },
    ],
  };
  const guides = {
    directory_path: ".gitoza-lite/wiki/guides",
    name: "guides",
    children: [
      setup,
      { directory_path: ".gitoza-lite/wiki/guides/faq", name: "faq" },
    ],
  };
  const tree = [
    guides,
    { directory_path: ".gitoza-lite/wiki/other", name: "other" },
  ];

  it("returns full tree when no opened path", () => {
    expect(filterTreeToOpenedFocusPath(tree, null)).toEqual(tree);
  });

  it("keeps root ancestor and prunes siblings when nested path is opened", () => {
    expect(
      filterTreeToOpenedFocusPath(
        tree,
        ".gitoza-lite/wiki/guides/setup/install",
      ),
    ).toEqual([
      {
        ...guides,
        children: [
          {
            ...setup,
            children: [leaf],
          },
        ],
      },
    ]);
  });

  it("keeps full subtree when top-level path is opened", () => {
    expect(
      filterTreeToOpenedFocusPath(tree, ".gitoza-lite/wiki/guides"),
    ).toEqual([guides]);
  });

  it("returns empty array for missing path", () => {
    expect(filterTreeToOpenedFocusPath(tree, "missing")).toEqual([]);
  });
});

describe("buildOpenFocusPathLabel", () => {
  const tree = [
    {
      directory_path: ".gitoza-lite/wiki/guides",
      name: "guides",
      display_name: "Guides",
      children: [
        {
          directory_path: ".gitoza-lite/wiki/guides/setup",
          name: "setup",
          display_name: "Setup",
          children: [
            {
              directory_path: ".gitoza-lite/wiki/guides/setup/install",
              name: "install",
              display_name: "Install",
            },
          ],
        },
      ],
    },
  ];

  it("returns empty string when no opened path", () => {
    expect(buildOpenFocusPathLabel(tree, null)).toBe("");
  });

  it("returns a single segment for a top-level path", () => {
    expect(
      buildOpenFocusPathLabel(tree, ".gitoza-lite/wiki/guides"),
    ).toBe("Guides");
  });

  it("joins display names with slashes for nested paths", () => {
    expect(
      buildOpenFocusPathLabel(
        tree,
        ".gitoza-lite/wiki/guides/setup/install",
      ),
    ).toBe("Guides/Setup/Install");
  });

  it("returns empty string for a missing path", () => {
    expect(buildOpenFocusPathLabel(tree, "missing")).toBe("");
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
