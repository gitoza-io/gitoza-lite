import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FilePlus2, FolderPlus } from "lucide-react";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import SimpleEntityEditor from "../components/SimpleEntityEditor";
import {
  createWikiFolder,
  createWikiPage,
  deleteWikiFolder,
  deleteWikiPage,
  getWikiDetail,
  getWikiTree,
  initializeWikiRoot,
  listWikiPages,
  onWikiUpdated,
  updateWikiPage,
} from "../services/api";

const WIKI_ROOT = ".gitoza-lite/wiki";

const WIKI_FIELDS = [
  { key: "title", label: "Title", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["draft", "published", "outdated"],
  },
  { key: "tags", label: "Tags (comma-separated)", type: "text" },
];

function parseTags(str) {
  return String(str || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function rowClass(selected) {
  return `w-full rounded px-2 py-1 text-left text-xs ${
    selected
      ? "bg-list-selected dark:bg-slate-700"
      : "hover:bg-list-hover dark:hover:bg-slate-800"
  }`;
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
  depth = 0,
}) {
  if (!nodes?.length) return null;
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const dir = node.directory_path;
        const isOpen = expanded.has(dir);
        const pages = pagesByDir.get(dir) || [];
        const pad = 8 + depth * 12;
        return (
          <li key={dir}>
            <div className="flex items-center gap-0.5" style={{ paddingLeft: `${pad}px` }}>
              <button
                type="button"
                className="rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => onToggle(dir)}
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                className={`${rowClass(selectedDir === dir && !selectedPath)} flex-1`}
                onClick={() => onSelectDir(dir)}
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {node.display_name}
                </span>
                <span className="ml-1 text-[10px] text-slate-400">
                  {pages.length}
                </span>
              </button>
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
                  depth={depth + 1}
                />
                <ul className="space-y-0.5">
                  {pages.map((p) => (
                    <li key={p.file_path}>
                      <button
                        type="button"
                        className={rowClass(selectedPath === p.file_path)}
                        style={{ paddingLeft: `${pad + 20}px` }}
                        onClick={() => onSelectPage(p.file_path, dir)}
                      >
                        <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                          {p.title || p.page_id}
                        </div>
                        <div className="truncate text-[10px] text-slate-500">
                          {p.page_id}
                          {p.status ? ` · ${p.status}` : ""}
                        </div>
                      </button>
                    </li>
                  ))}
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
  const [selectedDir, setSelectedDir] = useState(WIKI_ROOT);
  const [selectedPath, setSelectedPath] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

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
      setEditing(false);
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

  const handleCreateFolder = async () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    try {
      await ensureRoot();
      const created = await createWikiFolder(selectedDir || WIKI_ROOT, name.trim());
      setExpanded((prev) => new Set(prev).add(created.directory_path));
      setSelectedDir(created.directory_path);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create folder");
    }
  };

  const handleCreatePage = async () => {
    setCreating(true);
    setEditing(true);
    setSelectedPath(null);
    setDetail({
      page_id: "(new)",
      title: "",
      status: "draft",
      tags: [],
      body: "",
      file_path: "",
      directory: selectedDir || WIKI_ROOT,
    });
  };

  const handleSave = async ({ values, body }) => {
    const payload = {
      title: values.title,
      status: values.status,
      tags: parseTags(values.tags),
      body,
    };
    try {
      if (creating || !selectedPath) {
        await ensureRoot();
        const created = await createWikiPage({
          directory: selectedDir || WIKI_ROOT,
          ...payload,
        });
        setCreating(false);
        setSelectedPath(created.file_path);
        setEditing(false);
      } else {
        await updateWikiPage(selectedPath, payload);
        setEditing(false);
        setDetail(await getWikiDetail(selectedPath));
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedPath || creating) return;
    if (!window.confirm("Delete this wiki page?")) return;
    try {
      await deleteWikiPage(selectedPath);
      setSelectedPath(null);
      setDetail(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedDir || selectedDir === WIKI_ROOT) return;
    if (!window.confirm(`Delete folder ${selectedDir}?`)) return;
    try {
      await deleteWikiFolder(selectedDir);
      setSelectedDir(WIKI_ROOT);
      setSelectedPath(null);
      setDetail(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete folder failed");
    }
  };

  const toggleDir = (dir) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  const listColumn = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 px-2 py-2 dark:border-slate-800">
        <h1 className="text-sm font-semibold">Wiki</h1>
        <button
          type="button"
          className="ml-auto rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="New folder"
          onClick={handleCreateFolder}
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="New page"
          onClick={handleCreatePage}
        >
          <FilePlus2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {error ? (
        <div className="shrink-0 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        <button
          type="button"
          onClick={() => {
            setSelectedDir(WIKI_ROOT);
            setSelectedPath(null);
            setCreating(false);
            setEditing(false);
            setDetail(null);
          }}
          className={`mb-1 ${rowClass(selectedDir === WIKI_ROOT && !selectedPath)}`}
        >
          Wiki root
          <span className="ml-1 text-[10px] text-slate-400">{rootPages.length}</span>
        </button>
        {rootPages.length > 0 ? (
          <ul className="mb-1 space-y-0.5 pl-3">
            {rootPages.map((p) => (
              <li key={p.file_path}>
                <button
                  type="button"
                  className={rowClass(selectedPath === p.file_path)}
                  onClick={() => {
                    setSelectedDir(WIKI_ROOT);
                    setCreating(false);
                    setEditing(false);
                    setSelectedPath(p.file_path);
                  }}
                >
                  <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {p.title || p.page_id}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {p.page_id}
                    {p.status ? ` · ${p.status}` : ""}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <WikiTreeNodes
          nodes={tree}
          pagesByDir={pagesByDir}
          expanded={expanded}
          onToggle={toggleDir}
          selectedDir={selectedDir}
          selectedPath={selectedPath}
          onSelectDir={(dir) => {
            setSelectedDir(dir);
            setSelectedPath(null);
            setCreating(false);
            setEditing(false);
            setDetail(null);
            setExpanded((prev) => new Set(prev).add(dir));
          }}
          onSelectPage={(filePath, dir) => {
            setSelectedDir(dir);
            setCreating(false);
            setEditing(false);
            setSelectedPath(filePath);
          }}
        />
        {selectedDir !== WIKI_ROOT ? (
          <button
            type="button"
            className="mt-2 w-full rounded px-2 py-1 text-left text-[11px] text-red-600 hover:bg-red-50 dark:text-red-400"
            onClick={handleDeleteFolder}
          >
            Delete folder
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <ConfirmChangesTwoColumnLayout
      storageKeys={{ sidebarWidth: "wiki.col.sidebarWidth" }}
      sidebarColumn={listColumn}
      detailColumn={
        <SimpleEntityEditor
          empty={!detail}
          emptyMessage="Select or create a wiki page"
          idLabel="Page"
          idValue={creating ? "(new)" : detail?.page_id}
          fields={WIKI_FIELDS}
          values={{
            title: detail?.title || "",
            status: detail?.status || "draft",
            tags: (detail?.tags || []).join(", "),
          }}
          body={detail?.body || ""}
          isEditing={editing || creating}
          onToggleEdit={() => {
            if (creating) {
              setCreating(false);
              setDetail(null);
              setEditing(false);
              return;
            }
            setEditing((v) => !v);
          }}
          onSave={handleSave}
          onDelete={creating ? undefined : handleDelete}
          onClose={() => {
            setSelectedPath(null);
            setDetail(null);
            setCreating(false);
            setEditing(false);
          }}
        />
      }
    />
  );
}
