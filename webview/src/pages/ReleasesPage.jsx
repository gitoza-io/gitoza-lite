import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Box, ChevronDown, ChevronRight, FilePlus2, Rocket } from "lucide-react";
import CaseRowLabel from "../components/CaseRowLabel";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import ContextMenu from "../components/ContextMenu";
import InlineRenameInput from "../components/InlineRenameInput";
import ProjectPinButton from "../components/ProjectPinButton";
import SearchToggleButton from "../components/SearchToggleButton";
import SidebarRow from "../components/SidebarRow";
import ReleaseEditorPanel from "../components/ReleaseEditorPanel";
import TicketEditorPanel from "../components/TicketEditorPanel";
import { ReleaseIcon, TicketTypeIcon } from "../components/TestEntityIcons";
import TitleBarAddButton from "../components/TitleBarAddButton";
import Tooltip from "../components/Tooltip";
import TreeInlineSearchBar from "../components/TreeInlineSearchBar";
import TreeToolbar from "../components/TreeToolbar";
import SidebarSection, {
  TREE_ROW_CONTENT_GAP,
  TreeRowGuides,
  treeRowHoverFullWidthClass,
  treeRowSelectedFullWidthClass,
} from "../components/SidebarSection";
import { TreeAreaHoverProvider } from "../contexts/TreeAreaHoverContext";
import { usePinnedProjects } from "../hooks/usePinnedProjects";
import {
  createRelease,
  createTicketProject,
  getReleaseDetail,
  getTicketDetail,
  initializeTicketsRoot,
  listReleases,
  listTicketProjects,
  listTickets,
  onTicketsUpdated,
  updateRelease,
  updateTicket,
} from "../services/api";
import {
  filterGroupedMap,
  itemMatchesTreeSearch,
} from "../utils/entityTreeSearch";
import {
  sortProjectsWithPins,
  ticketProjectsToPinTree,
} from "../utils/folderTreePins";
import { filterProjectsToOpenedName } from "../utils/openFocusTreeFilter";

const RELEASE_QUERY_FIELDS = ["release_id", "name"];
const RELEASE_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ReleasesPage({
  hasTicketsRoot,
  onTicketsRootInitialized,
}) {
  const [projects, setProjects] = useState([]);
  const [releases, setReleases] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [expandedReleases, setExpandedReleases] = useState(() => new Set());
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingReleaseInProject, setCreatingReleaseInProject] =
    useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedReleasePath, setSelectedReleasePath] = useState(null);
  const [selectedTicketPath, setSelectedTicketPath] = useState(null);
  const [releaseDetail, setReleaseDetail] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openedProjectName, setOpenedProjectName] = useState(null);
  const [openedReleaseId, setOpenedReleaseId] = useState(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const proj = await listTicketProjects();
      setProjects(proj || []);
      const list = await listReleases({});
      setReleases(list || []);
      const ticketList = await listTickets({});
      setTickets(ticketList?.items || []);
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
      if (selectedReleasePath) {
        void getReleaseDetail(selectedReleasePath)
          .then(setReleaseDetail)
          .catch(() => {});
      }
      if (selectedTicketPath) {
        void getTicketDetail(selectedTicketPath)
          .then(setTicketDetail)
          .catch(() => {});
      }
    });
  }, [reload, selectedReleasePath, selectedTicketPath]);

  useEffect(() => {
    if (!selectedReleasePath) {
      setReleaseDetail(null);
      return;
    }
    let cancelled = false;
    void getReleaseDetail(selectedReleasePath)
      .then((d) => {
        if (!cancelled) setReleaseDetail(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load release");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedReleasePath]);

  useEffect(() => {
    if (!selectedTicketPath) {
      setTicketDetail(null);
      return;
    }
    let cancelled = false;
    void getTicketDetail(selectedTicketPath)
      .then((d) => {
        if (!cancelled) setTicketDetail(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ticket");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTicketPath]);

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

  const ticketsByReleaseId = useMemo(() => {
    const map = new Map();
    for (const t of tickets) {
      const releaseId = (t.release || "").trim();
      if (!releaseId) continue;
      if (!map.has(releaseId)) map.set(releaseId, []);
      map.get(releaseId).push(t);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.ticket_id.localeCompare(b.ticket_id));
    }
    return map;
  }, [tickets]);

  const searchActive =
    searchOpen &&
    (String(searchQuery).trim().length > 0 ||
      String(statusFilter).trim().length > 0);

  const filteredReleasesByProject = useMemo(() => {
    if (!searchActive) return releasesByProject;
    return filterGroupedMap(releasesByProject, (r) =>
      itemMatchesTreeSearch(r, {
        query: searchQuery,
        queryFields: RELEASE_QUERY_FIELDS,
        enumKey: "status",
        enumValue: statusFilter,
      }),
    );
  }, [releasesByProject, searchActive, searchQuery, statusFilter]);

  const pinTree = useMemo(() => ticketProjectsToPinTree(projects), [projects]);
  const { pinnedProjectPaths, isPinned, togglePin } = usePinnedProjects(
    "ticket-projects",
    pinTree,
  );

  const visibleProjects = useMemo(() => {
    const base = searchActive
      ? projects.filter((p) => filteredReleasesByProject.has(p.name))
      : projects;
    const pinned = sortProjectsWithPins(base, pinnedProjectPaths);
    return filterProjectsToOpenedName(pinned, openedProjectName);
  }, [
    projects,
    searchActive,
    filteredReleasesByProject,
    pinnedProjectPaths,
    openedProjectName,
  ]);

  useEffect(() => {
    if (!openedProjectName) return;
    if (!projects.some((p) => p.name === openedProjectName)) {
      setOpenedProjectName(null);
      setOpenedReleaseId(null);
    }
  }, [openedProjectName, projects]);

  useEffect(() => {
    if (!openedReleaseId) return;
    if (!releases.some((r) => r.release_id === openedReleaseId)) {
      setOpenedReleaseId(null);
    }
  }, [openedReleaseId, releases]);

  useEffect(() => {
    if (!searchActive) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const name of filteredReleasesByProject.keys()) {
        if (!next.has(name)) {
          next.add(name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [searchActive, filteredReleasesByProject]);

  const handleSearchClick = useCallback(() => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
      setStatusFilter("");
    } else {
      setSearchOpen(true);
    }
  }, [searchOpen]);

  const ensureRoot = async () => {
    await initializeTicketsRoot();
    onTicketsRootInitialized?.();
  };

  const clearDetailSelection = () => {
    setSelectedReleasePath(null);
    setSelectedTicketPath(null);
    setReleaseDetail(null);
    setTicketDetail(null);
    setEditing(false);
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
        clearDetailSelection();
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
        setSelectedTicketPath(null);
        setTicketDetail(null);
        setExpanded((prev) => new Set(prev).add(projectName));
        await reload();
        setSelectedReleasePath(created.file_path);
        setEditing(true);
      } catch (e) {
        setCreatingReleaseInProject(null);
        setError(e instanceof Error ? e.message : "Failed to create release");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creatingReleaseInProject, reload, onTicketsRootInitialized],
  );

  const handleSaveRelease = async (payload) => {
    if (!selectedReleasePath) return;
    await updateRelease(selectedReleasePath, payload);
    setEditing(false);
    setReleaseDetail(await getReleaseDetail(selectedReleasePath));
    await reload();
  };

  const handleSaveTicket = async (payload) => {
    if (!selectedTicketPath) return;
    await updateTicket(selectedTicketPath, payload);
    setEditing(false);
    setTicketDetail(await getTicketDetail(selectedTicketPath));
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

  const toggleRelease = (releaseId) => {
    setExpandedReleases((prev) => {
      const next = new Set(prev);
      if (next.has(releaseId)) next.delete(releaseId);
      else next.add(releaseId);
      return next;
    });
  };

  const selectProject = (name) => {
    setSelectedProject(name);
    clearDetailSelection();
    setCreatingReleaseInProject(null);
  };

  const selectRelease = (projectName, release) => {
    setSelectedProject(projectName);
    setCreatingReleaseInProject(null);
    setSelectedTicketPath(null);
    setTicketDetail(null);
    setEditing(false);
    setSelectedReleasePath(release.file_path);
  };

  const selectTicket = (projectName, release, ticket) => {
    setSelectedProject(projectName);
    setCreatingReleaseInProject(null);
    setSelectedReleasePath(null);
    setReleaseDetail(null);
    setEditing(false);
    setSelectedTicketPath(ticket.file_path);
  };

  const handleOpenProject = useCallback((name) => {
    if (!name) return;
    setOpenedProjectName(name);
    setOpenedReleaseId(null);
    setSelectedProject(name);
    clearDetailSelection();
    setCreatingReleaseInProject(null);
    setExpanded((prev) => new Set(prev).add(name));
  }, []);

  const handleCloseOpenedProject = useCallback(() => {
    const name = openedProjectName;
    setOpenedProjectName(null);
    setOpenedReleaseId(null);
    if (name) {
      setExpanded((prev) => {
        if (!prev.has(name)) return prev;
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  }, [openedProjectName]);

  const handleOpenRelease = useCallback((projectName, release) => {
    if (!projectName || !release?.release_id) return;
    setOpenedProjectName(projectName);
    setOpenedReleaseId(release.release_id);
    setSelectedProject(projectName);
    setCreatingReleaseInProject(null);
    setSelectedTicketPath(null);
    setTicketDetail(null);
    setEditing(false);
    setSelectedReleasePath(release.file_path);
    setExpanded((prev) => new Set(prev).add(projectName));
    setExpandedReleases((prev) => new Set(prev).add(release.release_id));
  }, []);

  const handleCloseOpenedRelease = useCallback(() => {
    const releaseId = openedReleaseId;
    setOpenedReleaseId(null);
    if (releaseId) {
      setExpandedReleases((prev) => {
        if (!prev.has(releaseId)) return prev;
        const next = new Set(prev);
        next.delete(releaseId);
        return next;
      });
    }
  }, [openedReleaseId]);

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
              searchNode={
                <SearchToggleButton
                  isOpen={searchOpen}
                  hasActiveChips={searchActive}
                  onClick={handleSearchClick}
                  ariaLabelWhenClosed="Search releases"
                />
              }
            />
          }
        />
      </div>
      {searchOpen ? (
        <TreeInlineSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          placeholder="Search releases…"
          enumValue={statusFilter}
          onEnumChange={setStatusFilter}
          enumOptions={RELEASE_STATUS_OPTIONS}
          enumAriaLabel="Filter by status"
          enumEmptyLabel="All statuses"
        />
      ) : null}
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
          ) : searchActive && visibleProjects.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-slate-400">
              No matching releases
            </div>
          ) : (
            <ul>
              {visibleProjects.map((p) => {
                const projectFocusActive =
                  openedProjectName === p.name && !openedReleaseId;
                const isOpen =
                  projectFocusActive ||
                  openedProjectName === p.name ||
                  expanded.has(p.name);
                const allProjectReleases =
                  filteredReleasesByProject.get(p.name) || [];
                const projectReleases = openedReleaseId
                  ? allProjectReleases.filter(
                      (r) => r.release_id === openedReleaseId,
                    )
                  : allProjectReleases;
                const projectSelected =
                  selectedProject === p.name &&
                  !selectedReleasePath &&
                  !selectedTicketPath;
                const creatingHere = creatingReleaseInProject === p.name;
                const projectRowSurface = projectFocusActive
                  ? projectSelected
                    ? "sticky top-0 z-20 border-b border-slate-200/80 bg-list-selected dark:border-slate-700/80 dark:bg-slate-700"
                    : "sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50 hover:bg-list-hover dark:border-slate-700/80 dark:bg-slate-950 dark:hover:bg-slate-800"
                  : projectSelected
                    ? treeRowSelectedFullWidthClass
                    : treeRowHoverFullWidthClass;
                return (
                  <li key={p.name}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={projectFocusActive ? undefined : isOpen}
                      className={`flex min-w-0 w-full cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/80 dark:focus-visible:ring-indigo-500/70 ${projectRowSurface}`}
                      onClick={() => selectProject(p.name)}
                      onDoubleClick={() => handleOpenProject(p.name)}
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
                        {projectFocusActive ? (
                          <Tooltip label="Back to all projects" placement="bottom">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCloseOpenedProject();
                              }}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/80 dark:hover:text-slate-200"
                              aria-label="Back to all projects"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </Tooltip>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openedProjectName === p.name) return;
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
                        )}
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
                          <span className="ml-auto flex shrink-0 items-center gap-1">
                            {!projectFocusActive && !openedReleaseId ? (
                              <ProjectPinButton
                                pinned={isPinned(p.project_path)}
                                onToggle={() => togglePin(p.project_path)}
                              />
                            ) : null}
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {allProjectReleases.length}
                            </span>
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
                          const releaseFocusActive =
                            openedReleaseId === r.release_id;
                          const releaseOpen =
                            releaseFocusActive ||
                            expandedReleases.has(r.release_id);
                          const releaseTickets =
                            ticketsByReleaseId.get(r.release_id) || [];
                          const releaseSelected =
                            selectedReleasePath === r.file_path &&
                            !selectedTicketPath;
                          const releaseRowSurface = releaseFocusActive
                            ? releaseSelected
                              ? "sticky top-0 z-20 border-b border-slate-200/80 bg-list-selected dark:border-slate-700/80 dark:bg-slate-700"
                              : "sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50 hover:bg-list-hover dark:border-slate-700/80 dark:bg-slate-950 dark:hover:bg-slate-800"
                            : releaseSelected
                              ? treeRowSelectedFullWidthClass
                              : treeRowHoverFullWidthClass;
                          return (
                            <li key={r.file_path}>
                              <div
                                role="button"
                                tabIndex={0}
                                aria-expanded={
                                  releaseFocusActive ? undefined : releaseOpen
                                }
                                className={`flex min-w-0 w-full cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/80 dark:focus-visible:ring-indigo-500/70 ${releaseRowSurface}`}
                                onClick={() => selectRelease(p.name, r)}
                                onDoubleClick={() =>
                                  handleOpenRelease(p.name, r)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    selectRelease(p.name, r);
                                  }
                                }}
                              >
                                <TreeRowGuides level={1} />
                                <div
                                  className="flex min-w-0 flex-1 items-center gap-0.5 font-medium"
                                  style={{
                                    paddingLeft: `${TREE_ROW_CONTENT_GAP}px`,
                                  }}
                                >
                                  {releaseFocusActive ? (
                                    <Tooltip
                                      label="Back to project"
                                      placement="bottom"
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleCloseOpenedRelease();
                                        }}
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/80 dark:hover:text-slate-200"
                                        aria-label="Back to project"
                                      >
                                        <ArrowLeft
                                          className="h-3.5 w-3.5"
                                          aria-hidden
                                        />
                                      </button>
                                    </Tooltip>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRelease(r.release_id);
                                      }}
                                      aria-expanded={releaseOpen}
                                      aria-label={
                                        releaseOpen
                                          ? `Collapse ${r.name}`
                                          : `Expand ${r.name}`
                                      }
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                                    >
                                      {releaseOpen ? (
                                        <ChevronDown
                                          className="h-3.5 w-3.5"
                                          aria-hidden
                                        />
                                      ) : (
                                        <ChevronRight
                                          className="h-3.5 w-3.5"
                                          aria-hidden
                                        />
                                      )}
                                    </button>
                                  )}
                                  <div
                                    className={`group flex min-w-0 flex-1 select-none items-center gap-1 rounded py-1.5 pr-1 text-left text-sm ${
                                      releaseSelected
                                        ? "font-semibold text-ink dark:text-slate-100"
                                        : "text-slate-600 dark:text-slate-300"
                                    }`}
                                  >
                                    <span className="shrink-0">
                                      <ReleaseIcon />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <CaseRowLabel
                                        title={r.name}
                                        caseId={r.release_id}
                                      />
                                    </div>
                                    <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                      {releaseTickets.length}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {releaseOpen ? (
                                <ul>
                                  {releaseTickets.map((t) => {
                                    const isSelected =
                                      selectedTicketPath === t.file_path;
                                    return (
                                      <li key={t.file_path}>
                                        <div
                                          className={`flex min-w-0 w-full ${
                                            isSelected
                                              ? treeRowSelectedFullWidthClass
                                              : treeRowHoverFullWidthClass
                                          }`}
                                        >
                                          <TreeRowGuides level={2} />
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
                                                icon={
                                                  <TicketTypeIcon
                                                    type={
                                                      t.type ||
                                                      t.ticket_type ||
                                                      "task"
                                                    }
                                                  />
                                                }
                                                label={
                                                  <CaseRowLabel
                                                    title={t.title}
                                                    caseId={t.ticket_id}
                                                  />
                                                }
                                                onClick={() =>
                                                  selectTicket(p.name, r, t)
                                                }
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                  {releaseTickets.length === 0 ? (
                                    <li>
                                      <div className="flex min-w-0 w-full">
                                        <TreeRowGuides level={2} />
                                        <div
                                          className="py-2 text-sm text-slate-400"
                                          style={{
                                            paddingLeft: `${TREE_ROW_CONTENT_GAP}px`,
                                          }}
                                        >
                                          No tickets
                                        </div>
                                      </div>
                                    </li>
                                  ) : null}
                                </ul>
                              ) : null}
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
              clearDetailSelection();
            },
          },
        ]}
      />
    </div>
  );

  const detailColumn = selectedTicketPath ? (
    <TicketEditorPanel
      ticketDetail={ticketDetail}
      selectedTicketFilePath={selectedTicketPath}
      isEditing={editing}
      onToggleEdit={(next) => setEditing(Boolean(next))}
      onSave={handleSaveTicket}
      onClearSelection={clearDetailSelection}
      emptyTitle="Select a ticket"
      emptyDescription="or assign a ticket to this release from the Tickets view"
    />
  ) : (
    <ReleaseEditorPanel
      releaseDetail={releaseDetail}
      selectedReleaseFilePath={selectedReleasePath}
      isEditing={editing}
      onToggleEdit={(next) => setEditing(Boolean(next))}
      onSave={handleSaveRelease}
      onClearSelection={clearDetailSelection}
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
  );

  return (
    <ConfirmChangesTwoColumnLayout
      storageKeys={{ sidebarWidth: "releases.col.sidebarWidth" }}
      sidebarColumn={listColumn}
      detailColumn={detailColumn}
    />
  );
}
