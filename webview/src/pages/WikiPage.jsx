import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FolderPlus,
} from "lucide-react";
import CaseRowLabel from "../components/CaseRowLabel";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import ContextMenu from "../components/ContextMenu";
import InlineRenameInput from "../components/InlineRenameInput";
import SearchToggleButton from "../components/SearchToggleButton";
import SidebarRow from "../components/SidebarRow";
import Tooltip from "../components/Tooltip";
import WikiEditorPanel from "../components/WikiEditorPanel";
import { WikiPageIcon } from "../components/TestEntityIcons";
import TitleBarAddButton from "../components/TitleBarAddButton";
import TreeQuerySearchBar from "../components/TreeQuerySearchBar";
import TreeToolbar from "../components/TreeToolbar";
import SidebarSection, {
  TREE_ROW_CONTENT_GAP,
  TreeRowGuides,
  treeRowHoverFullWidthClass,
  treeRowSelectedFullWidthClass,
} from "../components/SidebarSection";
import { TreeAreaHoverProvider } from "../contexts/TreeAreaHoverContext";
import { wikiSearchKeys } from "../constants/searchKeys";
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
import {
  collectMatchingWikiDirs,
  filterGroupedMap,
  pruneWikiTree,
} from "../utils/entityTreeSearch";
import {
  buildOpenFocusPathLabel,
  filterTreeToOpenedNode,
} from "../utils/openFocusTreeFilter";
import {
  collectWikiFilterOptions,
  itemMatchesSearchChips,
} from "../utils/querySearch";

const WIKI_ROOT = ".gitoza-lite/wiki";
const WIKI_QUERY_FIELDS = ["page_id", "title", "tags"];
const WIKI_SEARCH_KEYS = wikiSearchKeys();

function wikiParentDir(dir) {
  if (!dir || !dir.startsWith(`${WIKI_ROOT}/`)) return null;
  const slash = dir.lastIndexOf("/");
  if (slash <= 0) return null;
  const parent = dir.slice(0, slash);
  return parent === WIKI_ROOT ? null : parent;
}

function CreateFolderInlineRow({ depth, onCommit }) {
  return (
    <div className="flex min-w-0 w-full items-center gap-0.5">
      <TreeRowGuides level={depth} />
      <div
        className="flex min-w-0 flex-1 items-center gap-0.5 font-medium"
        style={{ paddingLeft: `${TREE_ROW_CONTENT_GAP}px` }}
      >
        <span className="w-6 shrink-0" />
        <FolderPlus
          className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400"
          aria-hidden
        />
        <InlineRenameInput
          initialValue=""
          placeholder="Folder name…"
          onCommit={onCommit}
        />
      </div>
    </div>
  );
}

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
  openedFolderPath,
  openFocusLabel,
  onOpenFolder,
  onCloseOpenedFolder,
  creatingFolderParent,
  onCommitCreateFolder,
  depth = 0,
}) {
  if (!nodes?.length) return null;
  return (
    <ul>
      {nodes.map((node) => {
        const dir = node.directory_path;
        const folderFocusActive = openedFolderPath === dir;
        const isCreatingHere = creatingFolderParent === dir;
        const isOpen =
          folderFocusActive || isCreatingHere || expanded.has(dir);
        const pages = pagesByDir.get(dir) || [];
        const folderSelected = selectedDir === dir && !selectedPath;
        const backParent = wikiParentDir(dir);
        const backLabel = backParent
          ? "Back to parent folder"
          : "Back to all folders";
        const rowSurfaceClass = folderFocusActive
          ? folderSelected
            ? "sticky top-0 z-20 border-b border-slate-200/80 bg-list-selected dark:border-slate-700/80 dark:bg-slate-700"
            : "sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50 hover:bg-list-hover dark:border-slate-700/80 dark:bg-slate-950 dark:hover:bg-slate-800"
          : folderSelected
            ? treeRowSelectedFullWidthClass
            : treeRowHoverFullWidthClass;
        const rowLabel =
          folderFocusActive && openFocusLabel
            ? openFocusLabel
            : node.display_name;
        return (
          <li key={dir}>
            <div
              role="button"
              tabIndex={0}
              aria-expanded={folderFocusActive ? undefined : isOpen}
              className={`flex min-w-0 w-full cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/80 dark:focus-visible:ring-indigo-500/70 ${rowSurfaceClass}`}
              onClick={() => onSelectDir(dir)}
              onDoubleClick={() => onOpenFolder?.(node)}
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
                {folderFocusActive ? (
                  <Tooltip label={backLabel} placement="bottom">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCloseOpenedFolder?.();
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/80 dark:hover:text-slate-200"
                      aria-label={backLabel}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </Tooltip>
                ) : (
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
                )}
                <div
                  className={`group flex min-w-0 flex-1 select-none items-center gap-1 rounded py-1.5 pr-1 text-left text-sm ${
                    folderSelected
                      ? "font-semibold text-ink dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{rowLabel}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {pages.length}
                  </span>
                </div>
              </div>
            </div>
            {isOpen ? (
              <>
                {isCreatingHere ? (
                  <ul>
                    <li>
                      <CreateFolderInlineRow
                        depth={depth + 1}
                        onCommit={onCommitCreateFolder}
                      />
                    </li>
                  </ul>
                ) : null}
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
                  openedFolderPath={openedFolderPath}
                  openFocusLabel={openFocusLabel}
                  onOpenFolder={onOpenFolder}
                  onCloseOpenedFolder={onCloseOpenedFolder}
                  creatingFolderParent={creatingFolderParent}
                  onCommitCreateFolder={onCommitCreateFolder}
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
  const [expanded, setExpanded] = useState(() => new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingFolderParent, setCreatingFolderParent] = useState(null);
  const [selectedDir, setSelectedDir] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const selectedPathRef = useRef(null);
  selectedPathRef.current = selectedPath;
  const [contextMenu, setContextMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchChips, setSearchChips] = useState([]);
  const [openedFolderPath, setOpenedFolderPath] = useState(null);

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
      const path = selectedPathRef.current;
      if (path) {
        void getWikiDetail(path)
          .then((d) => {
            if (selectedPathRef.current === path) setDetail(d);
          })
          .catch(() => {});
      }
    });
  }, [reload]);

  useEffect(() => {
    if (!selectedPath) {
      setDetail(null);
      return;
    }
    const path = selectedPath;
    let cancelled = false;
    void getWikiDetail(path)
      .then((d) => {
        if (!cancelled && selectedPathRef.current === path) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled && selectedPathRef.current === path) {
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

  const searchActive = searchOpen && searchChips.length > 0;

  const wikiFilterOptions = useMemo(
    () => collectWikiFilterOptions(allPages),
    [allPages],
  );

  const filteredPagesByDir = useMemo(() => {
    if (!searchActive) return pagesByDir;
    return filterGroupedMap(pagesByDir, (p) =>
      itemMatchesSearchChips(p, searchChips, { queryFields: WIKI_QUERY_FIELDS }),
    );
  }, [pagesByDir, searchActive, searchChips]);

  const visibleTree = useMemo(() => {
    const base = searchActive
      ? pruneWikiTree(
          tree,
          collectMatchingWikiDirs(filteredPagesByDir, WIKI_ROOT),
        )
      : tree;
    return filterTreeToOpenedNode(base, openedFolderPath);
  }, [tree, searchActive, filteredPagesByDir, openedFolderPath]);

  const openFocusLabel = useMemo(
    () =>
      openedFolderPath
        ? buildOpenFocusPathLabel(tree, openedFolderPath)
        : "",
    [tree, openedFolderPath],
  );

  useEffect(() => {
    if (!openedFolderPath) return;
    if (filterTreeToOpenedNode(tree, openedFolderPath).length === 0) {
      setOpenedFolderPath(null);
    }
  }, [tree, openedFolderPath]);

  useEffect(() => {
    if (!searchActive) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const dir of filteredPagesByDir.keys()) {
        if (!next.has(dir)) {
          next.add(dir);
          changed = true;
        }
        // Expand ancestors so nested matches are reachable
        let current = dir;
        while (current.startsWith(`${WIKI_ROOT}/`)) {
          const slash = current.lastIndexOf("/");
          if (slash <= 0) break;
          current = current.slice(0, slash);
          if (current === WIKI_ROOT) break;
          if (!next.has(current)) {
            next.add(current);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [searchActive, filteredPagesByDir]);

  const handleSearchClick = useCallback(() => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchChips([]);
    } else {
      setSearchOpen(true);
    }
  }, [searchOpen]);

  const ensureRoot = async () => {
    await initializeWikiRoot();
    onWikiRootInitialized?.();
  };

  const startCreatingFolder = useCallback((parentDir) => {
    const parent =
      parentDir && parentDir !== WIKI_ROOT ? parentDir : WIKI_ROOT;
    setCreatingFolderParent(parent);
    setCreatingFolder(true);
    if (parent !== WIKI_ROOT) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(parent);
        let current = parent;
        while (current.startsWith(`${WIKI_ROOT}/`)) {
          const slash = current.lastIndexOf("/");
          if (slash <= 0) break;
          current = current.slice(0, slash);
          if (current === WIKI_ROOT) break;
          next.add(current);
        }
        return next;
      });
    }
  }, []);

  const handleCommitInlineFolder = useCallback(
    async (name) => {
      if (!name?.trim()) {
        setCreatingFolder(false);
        setCreatingFolderParent(null);
        return;
      }
      try {
        await ensureRoot();
        const parent =
          creatingFolderParent && creatingFolderParent !== WIKI_ROOT
            ? creatingFolderParent
            : WIKI_ROOT;
        const created = await createWikiFolder(parent, name.trim());
        setCreatingFolder(false);
        setCreatingFolderParent(null);
        setSelectedDir(created.directory_path);
        setSelectedPath(null);
        setEditing(false);
        setDetail(null);
        setExpanded((prev) => {
          const next = new Set(prev);
          if (parent !== WIKI_ROOT) next.add(parent);
          next.add(created.directory_path);
          return next;
        });
        await reload();
      } catch (e) {
        setCreatingFolder(false);
        setCreatingFolderParent(null);
        setError(e instanceof Error ? e.message : "Failed to create folder");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureRoot uses stable props
    [reload, onWikiRootInitialized, creatingFolderParent],
  );

  const handleCreatePage = useCallback(
    async (directory) => {
      const dir = directory || selectedDir;
      if (!dir || dir === WIKI_ROOT) {
        setError("Select a folder to create a page");
        return;
      }
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

  const handleSave = useCallback(
    async (filePath, payload) => {
      if (!filePath) return;
      await updateWikiPage(filePath, payload);
      if (selectedPathRef.current === filePath) {
        setDetail(await getWikiDetail(filePath));
      }
      await reload();
    },
    [reload],
  );

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
  };

  const handleOpenFolder = useCallback((node) => {
    const dir = node?.directory_path;
    if (!dir) return;
    if (openedFolderPath === dir) return;
    setOpenedFolderPath(dir);
    setSelectedDir(dir);
    setSelectedPath(null);
    setEditing(false);
    setDetail(null);
    setExpanded((prev) => new Set(prev).add(dir));
  }, [openedFolderPath]);

  const handleCloseOpenedFolder = useCallback(() => {
    const path = openedFolderPath;
    if (!path) return;
    const parent = wikiParentDir(path);
    const parentExists =
      parent != null && filterTreeToOpenedNode(tree, parent).length > 0;
    setOpenedFolderPath(parentExists ? parent : null);
    setExpanded((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, [openedFolderPath, tree]);

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
                  onClick={() => startCreatingFolder(selectedDir)}
                  ariaLabel="Create folder"
                />
              }
              searchNode={
                <SearchToggleButton
                  isOpen={searchOpen}
                  hasActiveChips={searchActive}
                  onClick={handleSearchClick}
                  ariaLabelWhenClosed="Search wiki"
                />
              }
            />
          }
        />
      </div>
      {searchOpen ? (
        <TreeQuerySearchBar
          searchKeys={WIKI_SEARCH_KEYS}
          filterOptions={wikiFilterOptions}
          chips={searchChips}
          onChipsChange={setSearchChips}
          placeholder="status: draft · tag: guide · free text"
        />
      ) : null}
      {error ? (
        <div className="shrink-0 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}
      <TreeAreaHoverProvider>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {creatingFolder && creatingFolderParent === WIKI_ROOT ? (
            <CreateFolderInlineRow
              depth={0}
              onCommit={handleCommitInlineFolder}
            />
          ) : null}

          <WikiTreeNodes
            nodes={visibleTree}
            pagesByDir={filteredPagesByDir}
            expanded={expanded}
            onToggle={toggleDir}
            selectedDir={selectedDir}
            selectedPath={selectedPath}
            onSelectDir={selectDir}
            onSelectPage={(filePath, dir) => {
              setSelectedDir(dir);
              setSelectedPath(filePath);
            }}
            onFolderContextMenu={openFolderContextMenu}
            openedFolderPath={openedFolderPath}
            openFocusLabel={openFocusLabel}
            onOpenFolder={handleOpenFolder}
            onCloseOpenedFolder={handleCloseOpenedFolder}
            creatingFolderParent={
              creatingFolder ? creatingFolderParent : null
            }
            onCommitCreateFolder={handleCommitInlineFolder}
            depth={0}
          />

          {tree.length === 0 && !creatingFolder ? (
            <div className="px-2 py-4 text-center text-sm text-slate-400">
              No wiki folders or pages yet
            </div>
          ) : searchActive && visibleTree.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-slate-400">
              No matching wiki pages
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
            icon: FolderPlus,
            label: "Create folder",
            onClick: () => {
              const directory = contextMenu?.directory;
              if (directory) {
                setSelectedDir(directory);
                startCreatingFolder(directory);
              }
            },
          },
          {
            icon: FilePlus2,
            label: "Create page",
            onClick: () => {
              const directory = contextMenu?.directory;
              if (directory && directory !== WIKI_ROOT) {
                void handleCreatePage(directory);
              }
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
            tree.length === 0
              ? "Create a folder to get started"
              : "Select a page"
          }
          emptyDescription={
            tree.length === 0
              ? "Use + to create a folder"
              : "or right-click a folder to create one"
          }
        />
      }
    />
  );
}
