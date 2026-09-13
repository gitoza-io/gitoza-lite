import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderPlus, Plus } from "lucide-react";
import ConfirmChangesTwoColumnLayout from "../components/ConfirmChangesTwoColumnLayout";
import SimpleEntityEditor from "../components/SimpleEntityEditor";
import {
  createTicket,
  createTicketProject,
  deleteTicket,
  getTicketDetail,
  initializeTicketsRoot,
  listTicketProjects,
  listTickets,
  onTicketsUpdated,
  updateTicket,
} from "../services/api";

const TICKET_STATUSES = [
  "open",
  "in_progress",
  "in_testing",
  "blocked",
  "done",
  "cancelled",
];

const TICKET_FIELDS = [
  { key: "title", label: "Title", type: "text" },
  {
    key: "type",
    label: "Type",
    type: "select",
    options: ["bug", "story", "task", "spike"],
  },
  { key: "status", label: "Status", type: "select", options: TICKET_STATUSES },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["low", "medium", "high"],
  },
  { key: "tags", label: "Tags (comma-separated)", type: "text" },
  { key: "assigned_to", label: "Assignee", type: "text" },
  { key: "reporter", label: "Reporter", type: "text" },
  { key: "sprint", label: "Sprint", type: "text" },
  { key: "release", label: "Release", type: "text" },
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

export default function TicketsPage({
  hasTicketsRoot,
  onTicketsRootInitialized,
}) {
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

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
      setEditing(false);
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

  const handleCreateProject = async () => {
    const name = window.prompt("Ticket project name");
    if (!name?.trim()) return;
    try {
      await ensureRoot();
      const result = await createTicketProject(name.trim());
      const projectName = result.project_path.split("/").pop();
      setSelectedProject(projectName);
      setExpanded((prev) => new Set(prev).add(projectName));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    }
  };

  const handleCreateTicket = async () => {
    if (!selectedProject) {
      setError("Select a project first");
      return;
    }
    setCreating(true);
    setEditing(true);
    setSelectedPath(null);
    setDetail({
      ticket_id: "(new)",
      title: "",
      type: "task",
      status: "open",
      priority: "medium",
      tags: [],
      assigned_to: "",
      reporter: "",
      sprint: "",
      release: "",
      body: "",
      file_path: "",
      project: selectedProject,
    });
  };

  const editorValues = detail
    ? {
        title: detail.title || "",
        type: detail.type || "task",
        status: detail.status || "open",
        priority: detail.priority || "medium",
        tags: (detail.tags || []).join(", "),
        assigned_to: detail.assigned_to || "",
        reporter: detail.reporter || "",
        sprint: detail.sprint || "",
        release: detail.release || "",
      }
    : {};

  const handleSave = async ({ values, body }) => {
    const payload = {
      title: values.title,
      type: values.type,
      status: values.status,
      priority: values.priority,
      tags: parseTags(values.tags),
      assigned_to: values.assigned_to,
      reporter: values.reporter,
      sprint: values.sprint,
      release: values.release,
      body,
    };
    try {
      if (creating || !selectedPath) {
        if (!selectedProject) throw new Error("Select a project first");
        const created = await createTicket({
          project: selectedProject,
          ...payload,
        });
        setCreating(false);
        setSelectedPath(created.file_path);
        setEditing(false);
      } else {
        await updateTicket(selectedPath, payload);
        setEditing(false);
        setDetail(await getTicketDetail(selectedPath));
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedPath || creating) return;
    if (!window.confirm("Delete this ticket?")) return;
    try {
      await deleteTicket(selectedPath);
      setSelectedPath(null);
      setDetail(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
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
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 px-2 py-2 dark:border-slate-800">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Tickets
        </h1>
        <button
          type="button"
          className="ml-auto rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="New project"
          onClick={handleCreateProject}
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          title="New ticket"
          onClick={handleCreateTicket}
          disabled={!selectedProject}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {error ? (
        <div className="shrink-0 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {projects.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-slate-400">
            No ticket projects yet
          </div>
        ) : (
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const isOpen = expanded.has(p.name);
              const projectTickets = ticketsByProject.get(p.name) || [];
              const projectSelected =
                selectedProject === p.name && !selectedPath && !creating;
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
                      className={`${rowClass(projectSelected)} flex-1`}
                      onClick={() => {
                        setSelectedProject(p.name);
                        setSelectedPath(null);
                        setCreating(false);
                        setEditing(false);
                        setDetail(null);
                        setExpanded((prev) => new Set(prev).add(p.name));
                      }}
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {p.display_name}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-400">
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
                              setCreating(false);
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
    </div>
  );

  return (
    <ConfirmChangesTwoColumnLayout
      storageKeys={{ sidebarWidth: "tickets.col.sidebarWidth" }}
      sidebarColumn={listColumn}
      detailColumn={
        <SimpleEntityEditor
          empty={!detail}
          emptyMessage={
            projects.length === 0
              ? "Create a ticket project to get started"
              : "Select a ticket"
          }
          idLabel="Ticket"
          idValue={creating ? "(new)" : detail?.ticket_id}
          fields={TICKET_FIELDS}
          values={editorValues}
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
