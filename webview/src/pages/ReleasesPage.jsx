import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ChevronDown, ChevronRight, FilePlus2, Rocket } from "lucide-react";
import CaseRowLabel from "../components/CaseRowLabel";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import ContextMenu from "../components/ContextMenu";
import InlineRenameInput from "../components/InlineRenameInput";
import SidebarRow from "../components/SidebarRow";
import ReleaseEditorPanel from "../components/ReleaseEditorPanel";
import { ReleaseIcon } from "../components/TestEntityIcons";
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
  createRelease,
  createTicketProject,
  getReleaseDetail,
  initializeTicketsRoot,
  listReleases,
  listTicketProjects,
  onTicketsUpdated,
  updateRelease,
} from "../services/api";

export default function ReleasesPage({
  hasTicketsRoot,
  onTicketsRootInitialized,
}) {
  const [projects, setProjects] = useState([]);
  const [releases, setReleases] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingReleaseInProject, setCreatingReleaseInProject] =
    useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const proj = await listTicketProjects();
      setProjects(proj || []);
      const list = await listReleases({});
      setReleases(list || []);
      setExpanded((prev) => {
        if (prev.size > 0) return prev;
        const next = new Set();
        for (const p of proj || []) next.add(p.name);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load releases");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, hasTicketsRoot]);

  useEffect(() => {
    return onTicketsUpdated(() => {
      void reload();
      if (selectedPath) {
        void getReleaseDetail(selectedPath).then(setDetail).catch(() => {});
      }
    });
  }, [reload, selectedPath]);

  useEffect(() => {
    if (!selectedPath) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void getReleaseDetail(selectedPath)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load release");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const releasesByProject = useMemo(() => {
    const map = new Map();
    for (const r of releases) {
      const project = r.project || "unknown";
      if (!map.has(project)) map.set(project, []);
      map.get(project).push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.release_id.localeCompare(b.release_id));
    }
    return map;
  }, [releases]);

  const ensureRoot = async () => {
    await initializeTicketsRoot();
    onTicketsRootInitialized?.();
  };

  const handleCommitInlineProject = useCallback(
    async (name) => {
      if (!name?.trim()) {
        setCreatingProject(false);
        return;
      }
      try {
        await ensureRoot();
        const result = await createTicketProject(name.trim());
        const projectName = result.project_path.split("/").pop();
        setCreatingProject(false);
        setSelectedProject(projectName);
        setSelectedPath(null);
        setEditing(false);
        setDetail(null);
        setExpanded((prev) => new Set(prev).add(projectName));
        await reload();
      } catch (e) {
        setCreatingProject(false);
        setError(e instanceof Error ? e.message : "Failed to create project");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureRoot uses stable props
    [reload, onTicketsRootInitialized],
  );

  const handleCommitInlineRelease = useCallback(
    async (name) => {
      const projectName = creatingReleaseInProject;
      if (!projectName) return;
      if (!name?.trim()) {
        setCreatingReleaseInProject(null);
        return;
      }
      try {
        await ensureRoot();
        const created = await createRelease({
          project: projectName,
          name: name.trim(),
          status: "open",
        });
        setCreatingReleaseInProject(null);
        setSelectedProject(projectName);
        setExpanded((prev) => new Set(prev).add(projectName));
        await reload();
        setSelectedPath(created.file_path);
        setEditing(true);
      } catch (e) {
        setCreatingReleaseInProject(null);
        setError(e instanceof Error ? e.message : "Failed to create release");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creatingReleaseInProject, reload, onTicketsRootInitialized],
  );

  const handleSave = async (payload) => {
    if (!selectedPath) return;
    await updateRelease(selectedPath, payload);
    setEditing(false);
    setDetail(await getReleaseDetail(selectedPath));
    await reload();
  };

  const toggleProject = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectProject = (name) => {
    setSelectedProject(name);
    setSelectedPath(null);
    setEditing(false);
    setDetail(null);
    setCreatingReleaseInProject(null);
    setExpanded((prev) => new Set(prev).add(name));
  };

  const listColumn = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
        <SidebarSection
          title="Releases"
          toolbar={
            <TreeToolbar
              addButton={
                <TitleBarAddButton
                  tooltip="Create project"
                  onClick={() => {
                    setCreatingReleaseInProject(null);
                    setCreatingProject(true);
                  }}
                  ariaLabel="Create project"
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
          {creatingProject ? (
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
                  placeholder="Project name…"
                  onCommit={handleCommitInlineProject}
                />
              </div>
            </div>
          ) : null}
          {projects.length === 0 && !creatingProject ? (
            <div className="px-2 py-4 text-center text-sm text-slate-400">
              No ticket projects yet
            </div>
          ) : (
            <ul>
              {projects.map((p) => {
                const isOpen = expanded.has(p.name);
                const projectReleases = releasesByProject.get(p.name) || [];
                const projectSelected =
                  selectedProject === p.name && !selectedPath;
                const creatingHere = creatingReleaseInProject === p.name;
                return (
                  <li key={p.name}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`flex min-w-0 w-full cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/80 dark:focus-visible:ring-indigo-500/70 ${
                        projectSelected
                          ? treeRowSelectedFullWidthClass
                          : treeRowHoverFullWidthClass
                      }`}
                      onClick={() => selectProject(p.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectProject(p.name);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedProject(p.name);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          projectName: p.name,
                        });
                      }}
                    >
                      <TreeRowGuides level={0} />
                      <div
                        className="flex min-w-0 flex-1 items-center gap-0.5 font-medium"
                        style={{ paddingLeft: `${TREE_ROW_CONTENT_GAP}px` }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProject(p.name);
                          }}
                          aria-expanded={isOpen}
                          aria-label={
                            isOpen
                              ? `Collapse ${p.display_name}`
                              : `Expand ${p.display_name}`
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
                            projectSelected
                              ? "font-semibold text-ink dark:text-slate-100"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <Box
                            className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {p.display_name}
                          </span>
                          <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {projectReleases.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOpen || creatingHere ? (
                      <ul>
                        {creatingHere ? (
                          <li>
                            <div className="flex min-w-0 w-full items-center gap-0.5">
                              <TreeRowGuides level={1} />
                              <div
                                className="flex min-w-0 flex-1 items-center gap-0.5 font-medium"
                                style={{
                                  paddingLeft: `${TREE_ROW_CONTENT_GAP}px`,
                                }}
                              >
                                <Rocket
                                  className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400"
                                  aria-hidden
                                />
                                <InlineRenameInput
                                  initialValue=""
                                  placeholder="Release name…"
                                  onCommit={handleCommitInlineRelease}
                                />
                              </div>
                            </div>
                          </li>
                        ) : null}
                        {projectReleases.map((r) => {
                          const isSelected = selectedPath === r.file_path;
                          return (
                            <li key={r.file_path}>
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
                                  style={{
                                    paddingLeft: `${TREE_ROW_CONTENT_GAP}px`,
                                  }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <SidebarRow
                                      selected={isSelected}
                                      selectionOnParent
                                      icon={<ReleaseIcon />}
                                      label={
                                        <CaseRowLabel
                                          title={r.name}
                                          caseId={r.release_id}
                                        />
                                      }
                                      onClick={() => {
                                        setSelectedProject(p.name);
                                        setCreatingReleaseInProject(null);
                                        setEditing(false);
                                        setSelectedPath(r.file_path);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                        {!creatingHere && projectReleases.length === 0 ? (
                          <li>
                            <div className="flex min-w-0 w-full">
                              <TreeRowGuides level={1} />
                              <div
                                className="py-2 text-sm text-slate-400"
                                style={{
                                  paddingLeft: `${TREE_ROW_CONTENT_GAP}px`,
                                }}
                              >
                                No releases
                              </div>
                            </div>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
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
            label: "Create release",
            onClick: () => {
              const projectName = contextMenu?.projectName;
              if (!projectName) return;
              setCreatingProject(false);
              setCreatingReleaseInProject(projectName);
              setExpanded((prev) => new Set(prev).add(projectName));
              setSelectedProject(projectName);
              setSelectedPath(null);
              setEditing(false);
              setDetail(null);
            },
          },
        ]}
      />
    </div>
  );

  return (
    <ConfirmChangesTwoColumnLayout
      storageKeys={{ sidebarWidth: "releases.col.sidebarWidth" }}
      sidebarColumn={listColumn}
      detailColumn={
        <ReleaseEditorPanel
          releaseDetail={detail}
          selectedReleaseFilePath={selectedPath}
          isEditing={editing}
          onToggleEdit={(next) => setEditing(Boolean(next))}
          onSave={handleSave}
          onClearSelection={() => {
            setSelectedPath(null);
            setDetail(null);
            setEditing(false);
          }}
          emptyTitle={
            projects.length === 0
              ? "Create a ticket project to get started"
              : "Select a release"
          }
          emptyDescription={
            projects.length === 0
              ? "Use + to create a project"
              : "or right-click a project to create one"
          }
        />
      }
    />
  );
}
