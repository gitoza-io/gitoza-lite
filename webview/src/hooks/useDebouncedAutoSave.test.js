/**
 * @vitest-environment jsdom
 */
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedAutoSave } from "./useDebouncedAutoSave";

let latest = null;

function TestHost({ entityKey, ...rest }) {
  latest = useDebouncedAutoSave({ key: entityKey, ...rest });
  return null;
}

let container = null;
let root = null;

beforeEach(() => {
  latest = null;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.useRealTimers();
});

async function renderHost(props) {
  await act(async () => {
    root.render(createElement(TestHost, props));
  });
}

describe("useDebouncedAutoSave", () => {
  it("saves dirty draft after delayMs of inactivity", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const draft = { title: "edited" };
    const persisted = { title: "original" };

    await renderHost({
      enabled: true,
      entityKey: "a.yaml",
      draft,
      persisted,
      save,
      delayMs: 2000,
      silent: true,
    });

    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(draft);
  });

  it("flush immediately persists dirty draft", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const draft = { title: "edited" };
    const persisted = { title: "original" };

    await renderHost({
      enabled: true,
      entityKey: "a.yaml",
      draft,
      persisted,
      save,
      delayMs: 2000,
      silent: true,
    });

    await act(async () => {
      await latest.flush();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(draft);
  });

  it("on key change flushes previous key with old save and draft", async () => {
    const saveA = vi.fn().mockResolvedValue(undefined);
    const saveB = vi.fn().mockResolvedValue(undefined);
    const draftA = { title: "A-dirty" };
    const persistedA = { title: "A" };
    const draftB = { title: "B" };
    const persistedB = { title: "B" };

    await renderHost({
      enabled: true,
      entityKey: "a.yaml",
      draft: draftA,
      persisted: persistedA,
      save: saveA,
      delayMs: 2000,
      silent: true,
    });

    await renderHost({
      enabled: true,
      entityKey: "b.yaml",
      draft: draftB,
      persisted: persistedB,
      save: saveB,
      delayMs: 2000,
      silent: true,
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveA).toHaveBeenCalledTimes(1);
    expect(saveA).toHaveBeenCalledWith(draftA);
    expect(saveB).not.toHaveBeenCalled();
  });

  it("does not save when enabled is false", async () => {
    const save = vi.fn().mockResolvedValue(undefined);

    await renderHost({
      enabled: false,
      entityKey: "a.yaml",
      draft: { title: "edited" },
      persisted: { title: "original" },
      save,
      delayMs: 2000,
      silent: true,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(save).not.toHaveBeenCalled();
  });

  it("does not save when draft matches persisted after normalize", async () => {
    const save = vi.fn().mockResolvedValue(undefined);

    await renderHost({
      enabled: true,
      entityKey: "a.yaml",
      draft: { title: "  same  " },
      persisted: { title: "same" },
      normalize: (d) => ({ title: (d.title || "").trim() }),
      save,
      delayMs: 2000,
      silent: true,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await latest.flush();
    });
    expect(save).not.toHaveBeenCalled();
  });
});
