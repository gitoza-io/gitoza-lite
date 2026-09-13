import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ChevronDown, ChevronRight, FilePlus2 } from "lucide-react";
import CaseRowLabel from "../components/CaseRowLabel";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import ContextMenu from "../components/ContextMenu";
import InlineRenameInput from "../components/InlineRenameInput";
import SidebarRow from "../components/SidebarRow";
import WikiEditorPanel from "../components/WikiEditorPanel";
import { WikiPageIcon } from "../components/TestEntityIcons";
import TitleBarAddButton from "../components/TitleBarAddButton";
import TreeToolbar from "../components/TreeToolbar";
import SidebarSection, {
  TREE_ROW_CONTENT_GAP,
  TreeRowGuides,
  treeRowHoverFullWidthClass,
  treeRowSelectedFullWidthClass,
} from "../components/SidebarSection";
import { TreeAreaHoverProvider } from "../contexts/TreeAreaHoverContext";
import {
  createWikiFolder,
  createWikiPage,
  getWikiDetail,
  getWikiTree,
  initializeWikiRoot,
  listWikiPages,
  onWikiUpdated,
  updateWikiPage,
} from "../services/api";

const WIKI_ROOT = ".gitoza-lite/wiki";

function WikiTreeNodes({
  nodes,
  pagesByDir,
  expanded,
  onToggle,
  selectedDir,
  selectedPath,
  onSelectDir,
  onSelectPage,
  onFolderContextMenu,
  depth = 0,
}) {
  if (!nodes?.length) return null;
  return (
    <ul>
      {nodes.map((node) => {
        const dir = node.directory_path;
        const isOpen = expanded.has(dir);
        const pages = pagesByDir.get(dir) || [];
        const folderSelected = selectedDir === dir && !selectedPath;
        return (
          <li key={dir}>
            <div
              role="button"
              tabIndex={0}
              className={`flex min-w-0 w-full cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/80 dark:focus-visible:ring-indigo-500/70 ${
                folderSelected
                  ? treeRowSelectedFullWidthClass
                  : treeRowHoverFullWidthClass
              }`}
              onClick={() => onSelectDir(dir)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDir(dir);
                }
              }}
              onContextMenu={(e) => onFolderContextMenu?.(e, dir)}
            >
              <TreeRowGuides level={depth} />
              <div
                className="flex min-w-0 flex-1 items-center gap-0.5 font-medium"
                style={{ paddingLeft: `${TREE_ROW_CONTENT_GAP}px` }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(dir);
                  }}
                  aria-expanded={isOpen}
                  aria-label={
                    isOpen
                      ? `Collapse ${node.display_name}`
                      : `Expand ${node.display_name}`
                  }
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
                <div
                  className={`group flex min-w-0 flex-1 select-none items-center gap-1 rounded py-1.5 pr-1 text-left text-sm ${
                    folderSelected
                      ? "font-semibold text-ink dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Box
                    className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {node.display_name}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {pages.length}
                  </span>
                </div>
              </div>
            </div>
            {isOpen ? (
              <>
                <WikiTreeNodes
                  nodes={node.children}
                  pagesByDir={pagesByDir}
                  expanded={expanded}
                  onToggle={onToggle}
                  selectedDir={selectedDir}
                  selectedPath={selectedPath}
                  onSelectDir={onSelectDir}
                  onSelectPage={onSelectPage}
                  onFolderContextMenu={onFolderContextMenu}
                  depth={depth + 1}
                />
                <ul>
                  {pages.map((p) => {
                    const isSelected = selectedPath === p.file_path;
                    return (
                      <li key={p.file_path}>
                        <div
                          className={`flex min-w-0 w-full ${
                            isSelected
                              ? treeRowSelectedFullWidthClass
                              : treeRowHoverFullWidthClass
                          }`}
                        >
                          <TreeRowGuides level={depth + 1} />
                          <div
                            className="flex min-w-0 flex-1 items-center gap-1"
                            style={{
                              paddingLeft: `${TREE_ROW_CONTENT_GAP}px`,
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <SidebarRow
                                selected={isSelected}
                                selectionOnParent
                                icon={<WikiPageIcon />}
                                label={
                                  <CaseRowLabel
                                    title={p.title}
                                    caseId={p.page_id}
                                  />
                                }
                                onClick={() =>
                                  onSelectPage(p.file_path, dir)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function WikiPage({ hasWikiRoot, onWikiRootInitialized }) {
  const [tree, setTree] = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set([WIKI_ROOT]));
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [selectedDir, setSelectedDir] = useState(WIKI_ROOT);
  const [selectedPath, setSelectedPath] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const t = await getWikiTree();
      setTree(t || []);
      const list = await listWikiPages({ directory: WIKI_ROOT });
      setAllPages(list?.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wiki");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, hasWikiRoot]);

  useEffect(() => {
    return onWikiUpdated(() => {
      void reload();
      if (selectedPath) {
        void getWikiDetail(selectedPath).then(setDetail).catch(() => {});
      }
    });
  }, [reload, selectedPath]);

  useEffect(() => {
    if (!selectedPath) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void getWikiDetail(selectedPath)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load page");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const pagesByDir = useMemo(() => {
    const map = new Map();
    for (const p of allPages) {
      const dir = p.directory || WIKI_ROOT;
      if (!map.has(dir)) map.set(dir, []);
      map.get(dir).push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        (a.title || a.page_id).localeCompare(b.title || b.page_id),
      );
    }
    return map;
  }, [allPages]);

  const rootPages = pagesByDir.get(WIKI_ROOT) || [];

  const ensureRoot = async () => {
    await initializeWikiRoot();
    onWikiRootInitialized?.();
  };

  const handleCommitInlineFolder = useCallback(
    async (name) => {
      if (!name?.trim()) {
        setCreatingFolder(false);
        return;
      }
      try {
        await ensureRoot();
        const parent = selectedDir || WIKI_ROOT;
        const created = await createWikiFolder(parent, name.trim());
        setCreatingFolder(false);
        setSelectedDir(created.directory_path);
        setSelectedPath(null);
        setEditing(false);
        setDetail(null);
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(parent);
          next.add(created.directory_path);
          return next;
        });
        await reload();
      } catch (e) {
        setCreatingFolder(false);
        setError(e instanceof Error ? e.message : "Failed to create folder");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureRoot uses stable props
    [reload, onWikiRootInitialized, selectedDir],
  );

  const handleCreatePage = useCallback(
    async (directory) => {
      const dir = directory || selectedDir || WIKI_ROOT;
      try {
        await ensureRoot();
        const created = await createWikiPage({
          directory: dir,
          title: "Untitled",
          status: "draft",
        });
        setSelectedDir(dir);
        setExpanded((prev) => new Set(prev).add(dir));
        await reload();
        setSelectedPath(created.file_path);
        setEditing(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create page");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reload, onWikiRootInitialized, selectedDir],
  );

  const handleSave = async (payload) => {
    if (!selectedPath) return;
    await updateWikiPage(selectedPath, payload);
    setEditing(false);
    setDetail(await getWikiDetail(selectedPath));
    await reload();
  };

  const toggleDir = (dir) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  const selectDir = (dir) => {
    setSelectedDir(dir);
    setSelectedPath(null);
    setEditing(false);
    setDetail(null);
    setExpanded((prev) => new Set(prev).add(dir));
  };

  const openFolderContextMenu = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDir(dir);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      directory: dir,
    });
  };

  const rootSelected = selectedDir === WIKI_ROOT && !selectedPath;

  const listColumn = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
        <SidebarSection
          title="Wiki"
          toolbar={
            <TreeToolbar
              addButton={
                <TitleBarAddButton
                  tooltip="Create folder"
                  onClick={() => setCreatingFolder(true)}
                  ariaLabel="Create folder"
                />
              }
              searchNode={null}
            />
          }
        />
      </div>
      {error ? (
        <div className="shrink-0 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}
      <TreeAreaHoverProvider>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {creatingFolder ? (
            <div className="flex min-w-0 w-full items-center gap-0.5">
              <TreeRowGuides level={0} />
              <div
                className="flex min-w-0 flex-1 items-center gap-0.5 font-medium"
                style={{ paddingLeft: `${TREE_ROW_CONTENT_GAP}px` }}
              >
                <span className="w-6 shrink-0" />
                <Box
                  className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400"
                  aria-hidden
                />
                <InlineRenameInput
                  initialValue=""
                  placeholder="Folder name…"
                  onCommit={handleCommitInlineFolder}
                />
              </div>
            </div>
          ) : null}

          <div
            role="button"
            tabIndex={0}
            className={`flex min-w-0 w-full cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/80 dark:focus-visible:ring-indigo-500/70 ${
              rootSelected
                ? treeRowSelectedFullWidthClass
                : treeRowHoverFullWidthClass
            }`}
            onClick={() => selectDir(WIKI_ROOT)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectDir(WIKI_ROOT);
              }
            }}
            onContextMenu={(e) => openFolderContextMenu(e, WIKI_ROOT)}
          >
            <TreeRowGuides level={0} />
            <div
              className="flex min-w-0 flex-1 items-center gap-0.5 font-medium"
              style={{ paddingLeft: `${TREE_ROW_CONTENT_GAP}px` }}
            >
              <span className="w-6 shrink-0" />
              <div
                className={`group flex min-w-0 flex-1 select-none items-center gap-1 rounded py-1.5 pr-1 text-left text-sm ${
                  rootSelected
                    ? "font-semibold text-ink dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <Box
                  className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">Wiki root</span>
                <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {rootPages.length}
                </span>
              </div>
            </div>
          </div>

          <ul>
            {rootPages.map((p) => {
              const isSelected = selectedPath === p.file_path;
              return (
                <li key={p.file_path}>
                  <div
                    className={`flex min-w-0 w-full ${
                      isSelected
                        ? treeRowSelectedFullWidthClass
                        : treeRowHoverFullWidthClass
                    }`}
                  >
                    <TreeRowGuides level={1} />
                    <div
                      className="flex min-w-0 flex-1 items-center gap-1"
                      style={{ paddingLeft: `${TREE_ROW_CONTENT_GAP}px` }}
                    >
                      <div className="min-w-0 flex-1">
                        <SidebarRow
                          selected={isSelected}
                          selectionOnParent
                          icon={<WikiPageIcon />}
                          label={
                            <CaseRowLabel
                              title={p.title}
                              caseId={p.page_id}
                            />
                          }
                          onClick={() => {
                            setSelectedDir(WIKI_ROOT);
                            setEditing(false);
                            setSelectedPath(p.file_path);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <WikiTreeNodes
            nodes={tree}
            pagesByDir={pagesByDir}
            expanded={expanded}
            onToggle={toggleDir}
            selectedDir={selectedDir}
            selectedPath={selectedPath}
            onSelectDir={selectDir}
            onSelectPage={(filePath, dir) => {
              setSelectedDir(dir);
              setEditing(false);
              setSelectedPath(filePath);
            }}
            onFolderContextMenu={openFolderContextMenu}
            depth={0}
          />

          {tree.length === 0 && rootPages.length === 0 && !creatingFolder ? (
            <div className="px-2 py-4 text-center text-sm text-slate-400">
              No wiki folders or pages yet
            </div>
          ) : null}
        </div>
      </TreeAreaHoverProvider>
      <ContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onClose={() => setContextMenu(null)}
        items={[
          {
            icon: FilePlus2,
            label: "Create page",
            onClick: () => {
              const directory = contextMenu?.directory;
              if (directory) void handleCreatePage(directory);
            },
          },
        ]}
      />
    </div>
  );

  return (
    <ConfirmChangesTwoColumnLayout
      storageKeys={{ sidebarWidth: "wiki.col.sidebarWidth" }}
      sidebarColumn={listColumn}
      detailColumn={
        <WikiEditorPanel
          wikiDetail={detail}
          selectedWikiFilePath={selectedPath}
          isEditing={editing}
          onToggleEdit={(next) => setEditing(Boolean(next))}
          onSave={handleSave}
          onClearSelection={() => {
            setSelectedPath(null);
            setDetail(null);
            setEditing(false);
          }}
          emptyTitle={
            tree.length === 0 && rootPages.length === 0
              ? "Create a folder to get started"
              : "Select a page"
          }
          emptyDescription={
            tree.length === 0 && rootPages.length === 0
              ? "Use + to create a folder"
              : "or right-click a folder to create one"
          }
        />
      }
    />
  );
}
