/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCaseSearchResults } from "./useCaseSearchResults";

vi.mock("../utils/caseQuery", () => ({
  chipsToCaseQueryParams: vi.fn((chips) => ({ tag: chips[0]?.value })),
  fetchAllCases: vi.fn(),
}));

import { chipsToCaseQueryParams, fetchAllCases } from "../utils/caseQuery";

let container = null;
let root = null;

function renderUseCaseSearchResults(repoSlug, chips, matchOpts) {
  let hookResult = null;

  function TestComponent() {
    hookResult = useCaseSearchResults(repoSlug, chips, matchOpts);
    return null;
  }

  act(() => {
    root.render(createElement(TestComponent));
  });

  return {
    get current() {
      return hookResult;
    },
    rerender(nextRepoSlug, nextChips, nextMatchOpts) {
      repoSlug = nextRepoSlug;
      chips = nextChips;
      if (nextMatchOpts !== undefined) matchOpts = nextMatchOpts;
      act(() => {
        root.render(createElement(TestComponent));
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
    },
  };
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe("useCaseSearchResults", () => {
  it("returns empty results when repoSlug is null or chips are empty", () => {
    const hook = renderUseCaseSearchResults(null, [{ key: "tag", value: "smoke" }]);
    expect(hook.current.results).toEqual([]);
    expect(hook.current.loading).toBe(false);
    expect(fetchAllCases).not.toHaveBeenCalled();
  });

  it("fetches cases with mapped params when chips are set", async () => {
    const rows = [{ file_path: "proj/case.yaml", title: "Case", tags: ["smoke"] }];
    fetchAllCases.mockResolvedValueOnce(rows);

    const chips = [{ key: "tag", value: "smoke" }];
    const hook = renderUseCaseSearchResults("my-repo", chips);

    await act(async () => {
      await Promise.resolve();
    });

    expect(chipsToCaseQueryParams).toHaveBeenCalledWith(chips);
    expect(fetchAllCases).toHaveBeenCalledWith("my-repo", { tag: "smoke" });
    expect(hook.current.results).toEqual(rows);
    expect(hook.current.loading).toBe(false);
  });

  it("filters fetched rows client-side by chips", async () => {
    fetchAllCases.mockResolvedValueOnce([
      { file_path: "a.yaml", tags: ["smoke"], params: { browser: "chrome" } },
      { file_path: "b.yaml", tags: ["other"], params: { browser: "firefox" } },
    ]);

    const chips = [{ key: "browser", value: "chrome" }];
    const hook = renderUseCaseSearchResults("my-repo", chips, {
      paramKeys: ["browser"],
      searchKeys: [{ key: "browser", type: "param-field" }],
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hook.current.results).toEqual([
      { file_path: "a.yaml", tags: ["smoke"], params: { browser: "chrome" } },
    ]);
  });

  it("clears results when chips become empty", async () => {
    fetchAllCases.mockResolvedValueOnce([{ file_path: "a.yaml", tags: ["smoke"] }]);

    const hook = renderUseCaseSearchResults("my-repo", [{ key: "tag", value: "smoke" }]);
    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.current.results).toHaveLength(1);

    hook.rerender("my-repo", []);
    expect(hook.current.results).toEqual([]);
    expect(hook.current.loading).toBe(false);
  });

  it("does not loop when empty chips use a new array reference each render", () => {
    const hook = renderUseCaseSearchResults("my-repo", []);
    hook.rerender("my-repo", []);
    hook.rerender("my-repo", []);
    expect(hook.current.results).toEqual([]);
    expect(hook.current.loading).toBe(false);
    expect(fetchAllCases).not.toHaveBeenCalled();
  });

  it("ignores stale fetch results after chips change", async () => {
    let resolveFirst;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    fetchAllCases.mockReturnValueOnce(firstPromise);
    fetchAllCases.mockResolvedValueOnce([{ file_path: "fresh.yaml", tags: ["new"] }]);

    const hook = renderUseCaseSearchResults("my-repo", [{ key: "tag", value: "old" }]);
    hook.rerender("my-repo", [{ key: "tag", value: "new" }]);

    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.current.results).toEqual([{ file_path: "fresh.yaml", tags: ["new"] }]);

    await act(async () => {
      resolveFirst([{ file_path: "stale.yaml", tags: ["old"] }]);
      await Promise.resolve();
    });
    expect(hook.current.results).toEqual([{ file_path: "fresh.yaml", tags: ["new"] }]);
  });
});
