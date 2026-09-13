import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ChevronDown, ChevronRight, FilePlus2 } from "lucide-react";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import ContextMenu from "../components/ContextMenu";
import InlineRenameInput from "../components/InlineRenameInput";
import TicketEditorPanel from "../components/TicketEditorPanel";
import TitleBarAddButton from "../components/TitleBarAddButton";
import TreeToolbar from "../components/TreeToolbar";
import SidebarSection from "../components/SidebarSection";
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

function rowClass(selected) {
  return `w-full rounded px-2 py-1 text-left text-xs ${
    selected
      ? "bg-list-selected dark:bg-slate-700"
      : "hover:bg-list-hover dark:hover:bg-slate-800"
  }`;
}

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
      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {creatingProject ? (
          <div className="mb-1 flex min-w-0 items-center gap-2 rounded px-2 py-1.5">
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
        ) : null}
        {projects.length === 0 && !creatingProject ? (
          <div className="px-2 py-4 text-center text-xs text-slate-400">
            No ticket projects yet
          </div>
        ) : (
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const isOpen = expanded.has(p.name);
              const projectTickets = ticketsByProject.get(p.name) || [];
              const projectSelected =
                selectedProject === p.name && !selectedPath;
              return (
                <li key={p.name}>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => toggleProject(p.name)}
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
                      className={`${rowClass(projectSelected)} flex flex-1 items-center gap-1.5`}
                      onClick={() => {
                        setSelectedProject(p.name);
                        setSelectedPath(null);
                        setEditing(false);
                        setDetail(null);
                        setExpanded((prev) => new Set(prev).add(p.name));
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
                      <Box
                        className="h-3.5 w-3.5 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
                        {p.display_name}
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {projectTickets.length}
                      </span>
                    </button>
                  </div>
                  {isOpen ? (
                    <ul className="ml-4 space-y-0.5 border-l border-slate-200 pl-1 dark:border-slate-700">
                      {projectTickets.map((t) => (
                        <li key={t.file_path}>
                          <button
                            type="button"
                            className={rowClass(selectedPath === t.file_path)}
                            onClick={() => {
                              setSelectedProject(p.name);
                              setEditing(false);
                              setSelectedPath(t.file_path);
                            }}
                          >
                            <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                              {t.title || t.ticket_id}
                            </div>
                            <div className="truncate text-[10px] text-slate-500">
                              {t.ticket_id}
                              {t.status ? ` · ${t.status}` : ""}
                            </div>
                          </button>
                        </li>
                      ))}
                      {projectTickets.length === 0 ? (
                        <li className="px-2 py-2 text-[10px] text-slate-400">
                          No tickets
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
