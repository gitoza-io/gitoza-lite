/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDirectoryRowIndex } from "../utils/casePickerSelection";
import FolderTreeRow from "./FolderTreeRow.jsx";

let container = null;
let root = null;

const projectNode = {
  name: "auth.gitoza.test",
  display_name: "Auth",
  directory_path: ".gitoza/test/cases/auth",
  is_project: true,
  children: [{ name: "debug", directory_path: ".gitoza/test/cases/auth/debug", children: [] }],
  case_count: 3,
};

const baseRow = {
  kind: "folder",
  node: projectNode,
  pathKey: "auth.gitoza.test",
  level: 0,
  isExpanded: false,
};

function renderRow(props) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      createElement(FolderTreeRow, {
        row: baseRow,
        selectedFolderPath: null,
        onSelectFolder: vi.fn(),
        onFolderExpand: vi.fn(),
        onToggle: vi.fn(),
        ...props,
      }),
    );
  });
}

function clickRow() {
  const rowButton = container.querySelector('[role="button"][tabindex="0"]');
  act(() => {
    rowButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function clickExpandButton() {
  const expandButton = container.querySelector('button[aria-expanded]');
  act(() => {
    expandButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

describe("FolderTreeRow select vs expand", () => {
  it("row click selects and loads folder without toggling expand", () => {
    const onSelectFolder = vi.fn();
    const onFolderExpand = vi.fn();
    const onToggle = vi.fn();
    renderRow({ onSelectFolder, onFolderExpand, onToggle });

    clickRow();

    expect(onSelectFolder).toHaveBeenCalledWith(projectNode.directory_path);
    expect(onFolderExpand).toHaveBeenCalledWith(projectNode.directory_path);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("expand button toggles expand and loads folder when opening", () => {
    const onSelectFolder = vi.fn();
    const onFolderExpand = vi.fn();
    const onToggle = vi.fn();
    renderRow({ onSelectFolder, onFolderExpand, onToggle });

    clickExpandButton();

    expect(onToggle).toHaveBeenCalledWith(baseRow.pathKey);
    expect(onFolderExpand).toHaveBeenCalledWith(projectNode.directory_path);
    expect(onSelectFolder).not.toHaveBeenCalled();
  });

  it("expand button collapses without calling onFolderExpand when already expanded", () => {
    const onSelectFolder = vi.fn();
    const onFolderExpand = vi.fn();
    const onToggle = vi.fn();
    renderRow({
      row: { ...baseRow, isExpanded: true },
      onSelectFolder,
      onFolderExpand,
      onToggle,
    });

    clickExpandButton();

    expect(onToggle).toHaveBeenCalledWith(baseRow.pathKey);
    expect(onFolderExpand).not.toHaveBeenCalled();
    expect(onSelectFolder).not.toHaveBeenCalled();
  });

  it("row wrapper exposes aria-expanded when expand is available", () => {
    renderRow();
    const rowButton = container.querySelector('[role="button"][tabindex="0"]');
    expect(rowButton.getAttribute("aria-expanded")).toBe("false");
    const expandButton = container.querySelector('button[aria-expanded="false"]');
    expect(expandButton).not.toBeNull();
  });
});

describe("FolderTreeRow open-focus", () => {
  it("double-click opens the project", () => {
    const onOpenProject = vi.fn();
    renderRow({ onOpenProject });

    const rowButton = container.querySelector('[role="button"][tabindex="0"]');
    act(() => {
      rowButton.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    expect(onOpenProject).toHaveBeenCalledWith(projectNode.directory_path);
  });

  it("shows back control and closes opened project", () => {
    const onCloseOpenedProject = vi.fn();
    renderRow({
      openedProjectPath: projectNode.directory_path,
      onCloseOpenedProject,
    });

    const backButton = container.querySelector('button[aria-label="Back to all projects"]');
    expect(backButton).not.toBeNull();
    expect(container.querySelector('button[aria-expanded]')).toBeNull();

    act(() => {
      backButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onCloseOpenedProject).toHaveBeenCalled();
  });

  it("double-click opens a run", () => {
    const onOpenRun = vi.fn();
    const runNode = {
      name: "smoke",
      display_name: "smoke",
      directory_path: "__run__/smoke",
      is_run: true,
      is_project: true,
      run_id: "smoke",
      children: [],
      case_count: 0,
    };
    renderRow({
      row: {
        kind: "folder",
        node: runNode,
        pathKey: "smoke",
        level: 0,
        isExpanded: false,
      },
      onOpenRun,
    });

    const rowButton = container.querySelector('[role="button"][tabindex="0"]');
    act(() => {
      rowButton.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    expect(onOpenRun).toHaveBeenCalledWith(runNode.directory_path);
  });
});

describe("FolderTreeRow browse badge count", () => {
  it("falls back to node.case_count when lazy catalog has not loaded the project", () => {
    const otherProjectCases = [
      { file_path: ".gitoza/test/cases/other/suite/a.yaml" },
    ];
    const directoryIndex = buildDirectoryRowIndex(otherProjectCases);

    renderRow({ directoryIndex, loadedPrefixes: new Set([".gitoza/test/cases/other"]) });

    const badge = container.querySelector(".tabular-nums");
    expect(badge?.textContent).toBe("3");
  });

  it("shows node.case_count when prefix is loaded but browse has no badge rows", () => {
    renderRow({ loadedPrefixes: new Set([".gitoza/test/cases/p"]) });

    const badge = container.querySelector(".tabular-nums");
    expect(badge?.textContent).toBe("3");
  });
});
