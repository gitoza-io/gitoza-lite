import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import SimpleEntityEditor from "../components/SimpleEntityEditor";
import {
  createRelease,
  deleteRelease,
  getReleaseDetail,
  initializeTicketsRoot,
  listReleases,
  listTicketProjects,
  onTicketsUpdated,
  updateRelease,
} from "../services/api";

const RELEASE_FIELDS = [
  { key: "name", label: "Name", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["open", "shipped", "cancelled"],
  },
];

export default function ReleasesPage({
  hasTicketsRoot,
  onTicketsRootInitialized,
}) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [releases, setReleases] = useState([]);
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
      const list = await listReleases(
        selectedProject ? { project: selectedProject } : {},
      );
      setReleases(list || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load releases");
    }
  }, [selectedProject]);

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
      setEditing(false);
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

  const handleCreate = async () => {
    if (!selectedProject) {
      setError("Select a project first");
      return;
    }
    setCreating(true);
    setEditing(true);
    setSelectedPath(null);
    setDetail({
      release_id: "(new)",
      name: "",
      status: "open",
      body: "",
      file_path: "",
      project: selectedProject,
    });
  };

  const handleSave = async ({ values, body }) => {
    try {
      if (creating || !selectedPath) {
        await initializeTicketsRoot();
        onTicketsRootInitialized?.();
        const created = await createRelease({
          project: selectedProject,
          name: values.name,
          status: values.status,
          body,
        });
        setCreating(false);
        setSelectedPath(created.file_path);
        setEditing(false);
      } else {
        await updateRelease(selectedPath, {
          name: values.name,
          status: values.status,
          body,
        });
        setEditing(false);
        setDetail(await getReleaseDetail(selectedPath));
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedPath || creating) return;
    if (!window.confirm("Delete this release?")) return;
    try {
      await deleteRelease(selectedPath);
      setSelectedPath(null);
      setDetail(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
          <h1 className="text-sm font-semibold">Releases</h1>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-xs text-white disabled:opacity-40"
            onClick={handleCreate}
            disabled={!selectedProject}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
        <div className="border-b border-slate-200 px-2 py-2 dark:border-slate-800">
          <select
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
            value={selectedProject || ""}
            onChange={(e) => setSelectedProject(e.target.value || null)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.display_name}
              </option>
            ))}
          </select>
        </div>
        {error ? (
          <div className="bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <ul className="flex-1 overflow-y-auto p-1">
          {releases.map((r) => (
            <li key={r.file_path}>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditing(false);
                  setSelectedPath(r.file_path);
                }}
                className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                  selectedPath === r.file_path
                    ? "bg-list-selected dark:bg-slate-700"
                    : "hover:bg-list-hover dark:hover:bg-slate-800"
                }`}
              >
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {r.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {r.release_id} · {r.status}
                </div>
              </button>
            </li>
          ))}
          {releases.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-slate-400">
              No releases yet
            </li>
          ) : null}
        </ul>
      </aside>
      <div className="min-w-0 flex-1">
        <SimpleEntityEditor
          empty={!detail}
          emptyMessage="Select or create a release"
          idLabel="Release"
          idValue={creating ? "(new)" : detail?.release_id}
          fields={RELEASE_FIELDS}
          values={{
            title: detail?.name || "",
            name: detail?.name || "",
            status: detail?.status || "open",
          }}
          body={detail?.body || ""}
          titleFallback="Untitled release"
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
      </div>
    </div>
  );
}
