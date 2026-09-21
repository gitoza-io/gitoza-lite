import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Box,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleSlash,
  FilePlus2,
  FlaskConical,
  Inbox,
  OctagonAlert,
  Rocket,
  Ship,
  Timer,
} from "lucide-react";
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
import Tooltip from "../components/Tooltip";
import TreeQuerySearchBar from "../components/TreeQuerySearchBar";
import TreeToolbar from "../components/TreeToolbar";
import SidebarSection, {
  TREE_ROW_CONTENT_GAP,
  TreeRowGuides,
  treeRowHoverFullWidthClass,
  treeRowSelectedFullWidthClass,
} from "../components/SidebarSection";
import { TreeAreaHoverProvider } from "../contexts/TreeAreaHoverContext";
import { ticketSearchKeys } from "../constants/searchKeys";
import { TOOLBAR_BTN_SELECTED } from "../constants/toolbarStyles";
import { usePinnedProjects } from "../hooks/usePinnedProjects";
import {
  createRelease,
  createTicket,
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
import { flushAllAutoSavesBeforeSync } from "../utils/autoSaveFlushRegistry";
import { filterGroupedMap } from "../utils/entityTreeSearch";
import {
  sortProjectsWithPins,
  ticketProjectsToPinTree,
} from "../utils/folderTreePins";
import { filterProjectsToOpenedName } from "../utils/openFocusTreeFilter";
import {
  collectTicketFilterOptions,
  itemMatchesSearchChips,
  withParamSearchKeys,
} from "../utils/querySearch";
import {
  countReleaseQuickFilters,
  releaseMatchesQuickFilter,
  toggleReleaseQuickFilter,
} from "../utils/releaseQuickFilter";
import {
  countReleaseTicketQuickFilters,
  releaseTicketMatchesQuickFilter,
  toggleReleaseTicketQuickFilter,
} from "../utils/releaseTicketQuickFilter";

const TICKET_QUERY_FIELDS = ["ticket_id", "title"];
const TICKET_SEARCH_KEYS = ticketSearchKeys();

const QUICK_FILTER_BTN =
  "inline-flex h-7 items-center gap-1 rounded-ui px-1.5 text-muted hover:bg-list-hover hover:text-ink dark:hover:bg-slate-700 dark:hover:text-slate-300";

const RELEASE_STATUS_FILTERS = [
  {
    id: "open",
    label: "Open",
    Icon: Inbox,
    iconClass: "text-blue-500 dark:text-blue-300",
  },
  {
    id: "shipped",
    label: "Shipped",
    Icon: Ship,
    iconClass: "text-emerald-500 dark:text-emerald-300",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    Icon: CircleSlash,
    iconClass: "text-slate-500 dark:text-slate-200",
  },
];

const RELEASE_TICKET_STATUS_FILTERS = [
  {
    id: "open",
    label: "Open",
    Icon: Inbox,
    iconClass: "text-blue-500 dark:text-blue-300",
  },
  {
    id: "in_progress",
    label: "In progress",
    Icon: Timer,
    iconClass: "text-amber-500 dark:text-amber-300",
  },
  {
    id: "in_testing",
    label: "In testing",
    Icon: FlaskConical,
    iconClass: "text-violet-500 dark:text-violet-300",
  },
  {
    id: "blocked",
    label: "Blocked",
    Icon: OctagonAlert,
    iconClass: "text-red-500 dark:text-red-300",
  },
  {
    id: "done",
    label: "Done",
    Icon: CircleCheck,
    iconClass: "text-emerald-500 dark:text-emerald-300",
  },
];

function QuickFilterButtons({ controls, counts, activeId, onToggle }) {
  return (
    <div className="flex items-center gap-0.5">
      {controls.map(({ id, label, Icon, iconClass }) => {
        const selected = activeId === id;
        const count = counts[id] ?? 0;
        return (
          <Tooltip key={id} label={label} placement="bottom">
            <button
              type="button"
              onClick={() => onToggle(id)}
              className={`${QUICK_FILTER_BTN} ${selected ? TOOLBAR_BTN_SELECTED : ""}`}
              aria-label={label}
              aria-pressed={selected}
            >
              <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
              <span className="text-xs font-medium tabular-nums leading-none text-slate-600 dark:text-slate-300">
                {count}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

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
  const selectedReleasePathRef = useRef(null);
  const selectedTicketPathRef = useRef(null);
  selectedReleasePathRef.current = selectedReleasePath;
  selectedTicketPathRef.current = selectedTicketPath;
  const [contextMenu, setContextMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchChips, setSearchChips] = useState([]);
  const [openedProjectName, setOpenedProjectName] = useState(null);
  const [openedReleaseId, setOpenedReleaseId] = useState(null);
  /** @type {[null | "open" | "shipped" | "cancelled", function]} */
  const [releaseQuickFilter, setReleaseQuickFilter] = useState(null);
  /** @type {[null | "open" | "in_progress" | "in_testing" | "blocked" | "done", function]} */
  const [ticketQuickFilter, setTicketQuickFilter] = useState(null);

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
      const releasePath = selectedReleasePathRef.current;
      if (releasePath) {
        void getReleaseDetail(releasePath)
          .then((d) => {
            if (selectedReleasePathRef.current === releasePath) {
              setReleaseDetail(d);
            }
          })
          .catch(() => {});
      }
      const ticketPath = selectedTicketPathRef.current;
      if (ticketPath) {
        void getTicketDetail(ticketPath)
          .then((d) => {
            if (selectedTicketPathRef.current === ticketPath) {
              setTicketDetail(d);
            }
          })
          .catch(() => {});
      }
    });
  }, [reload]);

  useEffect(() => {
    if (!selectedReleasePath) {
      setReleaseDetail(null);
      return;
    }
    const path = selectedReleasePath;
    let cancelled = false;
    void getReleaseDetail(path)
      .then((d) => {
        if (!cancelled && selectedReleasePathRef.current === path) {
          setReleaseDetail(d);
        }
      })
      .catch((e) => {
        if (!cancelled && selectedReleasePathRef.current === path) {
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
    const path = selectedTicketPath;
    let cancelled = false;
    void getTicketDetail(path)
      .then((d) => {
        if (!cancelled && selectedTicketPathRef.current === path) {
          setTicketDetail(d);
        }
      })
      .catch((e) => {
        if (!cancelled && selectedTicketPathRef.current === path) {
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

  const releaseFocusActive = Boolean(openedReleaseId);
  const searchActive = releaseFocusActive && searchOpen && searchChips.length > 0;

  const ticketFilterOptions = useMemo(
    () => collectTicketFilterOptions(tickets),
    [tickets],
  );

  const effectiveTicketSearchKeys = useMemo(
    () => withParamSearchKeys(TICKET_SEARCH_KEYS, ticketFilterOptions),
    [ticketFilterOptions],
  );

  const filteredReleasesByProject = useMemo(() => {
    if (releaseFocusActive || !releaseQuickFilter) return releasesByProject;
    return filterGroupedMap(releasesByProject, (r) =>
      releaseMatchesQuickFilter(r, releaseQuickFilter),
    );
  }, [releasesByProject, releaseFocusActive, releaseQuickFilter]);

  const releaseQuickFilterCounts = useMemo(() => {
    if (releaseFocusActive) return { open: 0, shipped: 0, cancelled: 0 };
    const pool = openedProjectName
      ? releasesByProject.get(openedProjectName) || []
      : releases;
    return countReleaseQuickFilters(pool);
  }, [releaseFocusActive, openedProjectName, releasesByProject, releases]);

  const openedReleaseTickets = useMemo(() => {
    if (!openedReleaseId) return [];
    return ticketsByReleaseId.get(openedReleaseId) || [];
  }, [openedReleaseId, ticketsByReleaseId]);

  const searchFilteredReleaseTickets = useMemo(() => {
    if (!searchActive) return openedReleaseTickets;
    return openedReleaseTickets.filter((t) =>
      itemMatchesSearchChips(t, searchChips, {
        queryFields: TICKET_QUERY_FIELDS,
        paramKeys: ticketFilterOptions.param_keys,
        searchKeys: effectiveTicketSearchKeys,
      }),
    );
  }, [
    openedReleaseTickets,
    searchActive,
    searchChips,
    ticketFilterOptions,
    effectiveTicketSearchKeys,
  ]);

  const filteredReleaseTickets = useMemo(() => {
    if (!ticketQuickFilter) return searchFilteredReleaseTickets;
    return searchFilteredReleaseTickets.filter((t) =>
      releaseTicketMatchesQuickFilter(t, ticketQuickFilter),
    );
  }, [searchFilteredReleaseTickets, ticketQuickFilter]);

  const ticketQuickFilterCounts = useMemo(
    () => countReleaseTicketQuickFilters(searchFilteredReleaseTickets),
    [searchFilteredReleaseTickets],
  );

  const pinTree = useMemo(() => ticketProjectsToPinTree(projects), [projects]);
  const { pinnedProjectPaths, isPinned, togglePin } = usePinnedProjects(
    "ticket-projects",
    pinTree,
  );

  const releaseFilterActive = Boolean(releaseQuickFilter) && !releaseFocusActive;
  const listFilterActive =
    releaseFilterActive || searchActive || Boolean(ticketQuickFilter);

  const visibleProjects = useMemo(() => {
    const base = releaseFilterActive
      ? projects.filter((p) => filteredReleasesByProject.has(p.name))
      : projects;
    const pinned = sortProjectsWithPins(base, pinnedProjectPaths);
    return filterProjectsToOpenedName(pinned, openedProjectName);
  }, [
    projects,
    releaseFilterActive,
    filteredReleasesByProject,
    pinnedProjectPaths,
    openedProjectName,
  ]);

  useEffect(() => {
    if (!openedProjectName) {
      setOpenedReleaseId(null);
      setTicketQuickFilter(null);
      return;
    }
    if (!projects.some((p) => p.name === openedProjectName)) {
      setOpenedProjectName(null);
      setOpenedReleaseId(null);
    }
  }, [openedProjectName, projects]);

  useEffect(() => {
    if (!openedReleaseId) {
      setTicketQuickFilter(null);
      setSearchOpen(false);
      setSearchChips([]);
      return;
    }
    if (!releases.some((r) => r.release_id === openedReleaseId)) {
      setOpenedReleaseId(null);
    }
  }, [openedReleaseId, releases]);

  const handleSearchClick = useCallback(() => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchChips([]);
    } else {
      setSearchOpen(true);
    }
  }, [searchOpen]);

  const handleReleaseQuickFilterClick = useCallback((id) => {
    setReleaseQuickFilter((prev) => toggleReleaseQuickFilter(prev, id));
  }, []);

  const handleTicketQuickFilterClick = useCallback((id) => {
    setTicketQuickFilter((prev) => toggleReleaseTicketQuickFilter(prev, id));
  }, []);

  const ensureRoot = async () => {
    await initializeTicketsRoot();
    onTicketsRootInitialized?.();
  };

  const clearDetailSelection = () => {
    void flushAllAutoSavesBeforeSync();
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

  const handleCreateTicketFromRelease = useCallback(
    async (projectName, releaseId) => {
      if (!projectName || !releaseId) return;
      try {
        await ensureRoot();
        const created = await createTicket({
          project: projectName,
          release: releaseId,
          title: "Untitled",
          type: "task",
          status: "open",
          priority: "medium",
        });
        setCreatingReleaseInProject(null);
        setSelectedProject(projectName);
        setSelectedReleasePath(null);
        setReleaseDetail(null);
        setExpanded((prev) => new Set(prev).add(projectName));
        setExpandedReleases((prev) => new Set(prev).add(releaseId));
        await reload();
        setSelectedTicketPath(created.file_path);
        setEditing(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create ticket");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureRoot uses stable props
    [reload, onTicketsRootInitialized],
  );

  const handleSaveRelease = useCallback(
    async (filePath, payload) => {
      if (!filePath) return;
      await updateRelease(filePath, payload);
      if (selectedReleasePathRef.current === filePath) {
        setReleaseDetail(await getReleaseDetail(filePath));
      }
      await reload();
    },
    [reload],
  );

  const handleSaveTicket = useCallback(
    async (filePath, payload) => {
      if (!filePath) return;
      await updateTicket(filePath, payload);
      if (selectedTicketPathRef.current === filePath) {
        setTicketDetail(await getTicketDetail(filePath));
      }
      await reload();
    },
    [reload],
  );

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
    const switchingFromTicket = Boolean(selectedTicketPath);
    if (switchingFromTicket) {
      void flushAllAutoSavesBeforeSync();
      setEditing(false);
    }
    setSelectedTicketPath(null);
    setTicketDetail(null);
    setSelectedReleasePath(release.file_path);
  };

  const selectTicket = (projectName, release, ticket) => {
    setSelectedProject(projectName);
    setCreatingReleaseInProject(null);
    const switchingFromRelease = Boolean(selectedReleasePath);
    if (switchingFromRelease) {
      void flushAllAutoSavesBeforeSync();
      setEditing(false);
    }
    setSelectedReleasePath(null);
    setReleaseDetail(null);
    setSelectedTicketPath(ticket.file_path);
  };

  const handleOpenProject = useCallback((name) => {
    if (!name) return;
    setOpenedProjectName(name);
    setOpenedReleaseId(null);
    setTicketQuickFilter(null);
    setSearchOpen(false);
    setSearchChips([]);
    setSelectedProject(name);
    clearDetailSelection();
    setCreatingReleaseInProject(null);
    setExpanded((prev) => new Set(prev).add(name));
  }, []);

  const handleCloseOpenedProject = useCallback(() => {
    const name = openedProjectName;
    setOpenedProjectName(null);
    setOpenedReleaseId(null);
    setTicketQuickFilter(null);
    setSearchOpen(false);
    setSearchChips([]);
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
    setReleaseQuickFilter(null);
    setTicketQuickFilter(null);
    setSearchOpen(false);
    setSearchChips([]);
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
    setTicketQuickFilter(null);
    setSearchOpen(false);
    setSearchChips([]);
    if (releaseId) {
      setExpandedReleases((prev) => {
        if (!prev.has(releaseId)) return prev;
        const next = new Set(prev);
        next.delete(releaseId);
        return next;
      });
    }
  }, [openedReleaseId]);

  const releaseStatusToolbar = !releaseFocusActive ? (
    <QuickFilterButtons
      controls={RELEASE_STATUS_FILTERS}
      counts={releaseQuickFilterCounts}
      activeId={releaseQuickFilter}
      onToggle={handleReleaseQuickFilterClick}
    />
  ) : null;

  const ticketStatusToolbar = releaseFocusActive ? (
    <div className="flex items-center gap-0.5">
      <QuickFilterButtons
        controls={RELEASE_TICKET_STATUS_FILTERS}
        counts={ticketQuickFilterCounts}
        activeId={ticketQuickFilter}
        onToggle={handleTicketQuickFilterClick}
      />
      <SearchToggleButton
        isOpen={searchOpen}
        hasActiveChips={searchActive}
        onClick={handleSearchClick}
        ariaLabelWhenClosed="Search tickets"
      />
    </div>
  ) : null;

  const listColumn = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
        <SidebarSection
          title="Releases"
          toolbar={
            <TreeToolbar
              addButton={null}
              searchNode={
                releaseFocusActive ? ticketStatusToolbar : releaseStatusToolbar
              }
            />
          }
        />
      </div>
      {releaseFocusActive && searchOpen ? (
        <TreeQuerySearchBar
          searchKeys={effectiveTicketSearchKeys}
          filterOptions={ticketFilterOptions}
          chips={searchChips}
          onChipsChange={setSearchChips}
          placeholder="status: open · tag: smoke · free text"
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
          ) : listFilterActive && visibleProjects.length === 0 ? (
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
                const projectReleaseCount = (
                  releasesByProject.get(p.name) || []
                ).length;
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
                    {!openedReleaseId ? (
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
                            kind: "project",
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
                              {!projectFocusActive ? (
                                <ProjectPinButton
                                  pinned={isPinned(p.project_path)}
                                  onToggle={() => togglePin(p.project_path)}
                                />
                              ) : null}
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {projectReleaseCount}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {isOpen || creatingHere ? (
                      <ul>
                        {creatingHere && !openedReleaseId ? (
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
                          const releaseLevel = releaseFocusActive ? 0 : 1;
                          const ticketLevel = releaseFocusActive ? 1 : 2;
                          const releaseOpen =
                            releaseFocusActive ||
                            expandedReleases.has(r.release_id);
                          const releaseTicketsRaw =
                            ticketsByReleaseId.get(r.release_id) || [];
                          const releaseTickets =
                            releaseFocusActive &&
                            openedReleaseId === r.release_id
                              ? filteredReleaseTickets
                              : releaseTicketsRaw;
                          const releaseTicketCount =
                            releaseFocusActive &&
                            openedReleaseId === r.release_id
                              ? openedReleaseTickets.length
                              : releaseTicketsRaw.length;
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
                          const releaseLabel = releaseFocusActive
                            ? `${p.display_name}/${r.name}`
                            : r.name;
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
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  selectRelease(p.name, r);
                                  setContextMenu({
                                    kind: "release",
                                    x: e.clientX,
                                    y: e.clientY,
                                    projectName: p.name,
                                    releaseId: r.release_id,
                                  });
                                }}
                              >
                                <TreeRowGuides level={releaseLevel} />
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
                                    {releaseFocusActive ? (
                                      <Rocket
                                        className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400"
                                        aria-hidden
                                      />
                                    ) : (
                                      <span className="shrink-0">
                                        <ReleaseIcon />
                                      </span>
                                    )}
                                    {releaseFocusActive ? (
                                      <span className="min-w-0 flex-1 truncate">
                                        {releaseLabel}
                                      </span>
                                    ) : (
                                      <div className="min-w-0 flex-1">
                                        <CaseRowLabel
                                          title={r.name}
                                          caseId={r.release_id}
                                        />
                                      </div>
                                    )}
                                    <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                      {releaseTicketCount}
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
                                          <TreeRowGuides level={ticketLevel} />
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
                                        <TreeRowGuides level={ticketLevel} />
                                        <div
                                          className="py-2 text-sm text-slate-400"
                                          style={{
                                            paddingLeft: `${TREE_ROW_CONTENT_GAP}px`,
                                          }}
                                        >
                                          {listFilterActive
                                            ? "No matching tickets"
                                            : "No tickets"}
                                        </div>
                                      </div>
                                    </li>
                                  ) : null}
                                </ul>
                              ) : null}
                            </li>
                          );
                        })}
                        {!creatingHere &&
                        !openedReleaseId &&
                        projectReleases.length === 0 ? (
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
        items={
          contextMenu?.kind === "release"
            ? [
                {
                  icon: FilePlus2,
                  label: "Create ticket",
                  onClick: () => {
                    const projectName = contextMenu?.projectName;
                    const releaseId = contextMenu?.releaseId;
                    if (projectName && releaseId) {
                      void handleCreateTicketFromRelease(projectName, releaseId);
                    }
                  },
                },
              ]
            : [
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
              ]
        }
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
