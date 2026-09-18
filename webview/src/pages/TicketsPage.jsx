import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ChevronDown, ChevronRight, FilePlus2 } from "lucide-react";
import CaseRowLabel from "../components/CaseRowLabel";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import ContextMenu from "../components/ContextMenu";
import InlineRenameInput from "../components/InlineRenameInput";
import ProjectPinButton from "../components/ProjectPinButton";
import SearchToggleButton from "../components/SearchToggleButton";
import SidebarRow from "../components/SidebarRow";
import TicketEditorPanel from "../components/TicketEditorPanel";
import { TicketTypeIcon } from "../components/TestEntityIcons";
import TitleBarAddButton from "../components/TitleBarAddButton";
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
  createTicket,
  createTicketProject,
  getTicketDetail,
  initializeTicketsRoot,
  listTicketProjects,
  listTickets,
  onTicketsUpdated,
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

const TICKET_QUERY_FIELDS = ["ticket_id", "title"];
const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function TicketsPage({
  hasTicketsRoot,
  onTicketsRootInitialized,
}) {
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [creatingProject, setCreatingProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const reload = useCallback(async () => {
    setError(null);
    try {
      const proj = await listTicketProjects();
      setProjects(proj || []);
      const list = await listTickets({});
      setTickets(list?.items || []);
      setExpanded((prev) => {
        if (prev.size > 0) return prev;
        const next = new Set();
        for (const p of proj || []) next.add(p.name);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, hasTicketsRoot]);

  useEffect(() => {
    return onTicketsUpdated(() => {
      void reload();
      if (selectedPath) {
        void getTicketDetail(selectedPath).then(setDetail).catch(() => {});
      }
    });
  }, [reload, selectedPath]);

  useEffect(() => {
    if (!selectedPath) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void getTicketDetail(selectedPath)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ticket");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const ticketsByProject = useMemo(() => {
    const map = new Map();
    for (const t of tickets) {
      const project = t.project || "unknown";
      if (!map.has(project)) map.set(project, []);
      map.get(project).push(t);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.ticket_id.localeCompare(b.ticket_id));
    }
    return map;
  }, [tickets]);

  const searchActive =
    searchOpen &&
    (String(searchQuery).trim().length > 0 ||
      String(priorityFilter).trim().length > 0);

  const filteredTicketsByProject = useMemo(() => {
    if (!searchActive) return ticketsByProject;
    return filterGroupedMap(ticketsByProject, (t) =>
      itemMatchesTreeSearch(t, {
        query: searchQuery,
        queryFields: TICKET_QUERY_FIELDS,
        enumKey: "priority",
        enumValue: priorityFilter,
      }),
    );
  }, [ticketsByProject, searchActive, searchQuery, priorityFilter]);

  const pinTree = useMemo(() => ticketProjectsToPinTree(projects), [projects]);
  const { pinnedProjectPaths, isPinned, togglePin } = usePinnedProjects(
    "ticket-projects",
    pinTree,
  );

  const visibleProjects = useMemo(() => {
    const base = searchActive
      ? projects.filter((p) => filteredTicketsByProject.has(p.name))
      : projects;
    return sortProjectsWithPins(base, pinnedProjectPaths);
  }, [projects, searchActive, filteredTicketsByProject, pinnedProjectPaths]);

  useEffect(() => {
    if (!searchActive) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const name of filteredTicketsByProject.keys()) {
        if (!next.has(name)) {
          next.add(name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [searchActive, filteredTicketsByProject]);

  const handleSearchClick = useCallback(() => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
      setPriorityFilter("");
    } else {
      setSearchOpen(true);
    }
  }, [searchOpen]);

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

  const handleCreateTicket = useCallback(
    async (projectName) => {
      if (!projectName) return;
      try {
        await ensureRoot();
        const created = await createTicket({
          project: projectName,
          title: "Untitled",
          type: "task",
          status: "open",
          priority: "medium",
        });
        setSelectedProject(projectName);
        setExpanded((prev) => new Set(prev).add(projectName));
        await reload();
        setSelectedPath(created.file_path);
        setEditing(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create ticket");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reload, onTicketsRootInitialized],
  );

  const handleSave = async (payload) => {
    if (!selectedPath) return;
    await updateTicket(selectedPath, payload);
    setEditing(false);
    setDetail(await getTicketDetail(selectedPath));
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
    setExpanded((prev) => new Set(prev).add(name));
  };

  const listColumn = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
        <SidebarSection
          title="Tickets"
          toolbar={
            <TreeToolbar
              addButton={
                <TitleBarAddButton
                  tooltip="Create project"
                  onClick={() => setCreatingProject(true)}
                  ariaLabel="Create project"
                />
              }
              searchNode={
                <SearchToggleButton
                  isOpen={searchOpen}
                  hasActiveChips={searchActive}
                  onClick={handleSearchClick}
                  ariaLabelWhenClosed="Search tickets"
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
          placeholder="Search tickets…"
          enumValue={priorityFilter}
          onEnumChange={setPriorityFilter}
          enumOptions={PRIORITY_OPTIONS}
          enumAriaLabel="Filter by priority"
          enumEmptyLabel="All priorities"
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
              No matching tickets
            </div>
          ) : (
            <ul>
              {visibleProjects.map((p) => {
                const isOpen = expanded.has(p.name);
                const projectTickets = filteredTicketsByProject.get(p.name) || [];
                const projectSelected =
                  selectedProject === p.name && !selectedPath;
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
                          <span className="ml-auto flex shrink-0 items-center gap-1">
                            <ProjectPinButton
                              pinned={isPinned(p.project_path)}
                              onToggle={() => togglePin(p.project_path)}
                            />
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {projectTickets.length}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOpen ? (
                      <ul>
                        {projectTickets.map((t) => {
                          const isSelected = selectedPath === t.file_path;
                          return (
                            <li key={t.file_path}>
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
                                      icon={
                                        <TicketTypeIcon
                                          type={
                                            t.type || t.ticket_type || "task"
                                          }
                                        />
                                      }
                                      label={
                                        <CaseRowLabel
                                          title={t.title}
                                          caseId={t.ticket_id}
                                        />
                                      }
                                      onClick={() => {
                                        setSelectedProject(p.name);
                                        setEditing(false);
                                        setSelectedPath(t.file_path);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                        {projectTickets.length === 0 ? (
                          <li>
                            <div className="flex min-w-0 w-full">
                              <TreeRowGuides level={1} />
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
            label: "Create ticket",
            onClick: () => {
              const projectName = contextMenu?.projectName;
              if (projectName) void handleCreateTicket(projectName);
            },
          },
        ]}
      />
    </div>
  );

  return (
    <ConfirmChangesTwoColumnLayout
      storageKeys={{ sidebarWidth: "tickets.col.sidebarWidth" }}
      sidebarColumn={listColumn}
      detailColumn={
        <TicketEditorPanel
          ticketDetail={detail}
          selectedTicketFilePath={selectedPath}
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
              : "Select a ticket"
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
