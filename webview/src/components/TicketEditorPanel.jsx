import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, Ticket } from "lucide-react";
import { CustomFieldsEditStrip } from "./CaseCustomFields";
import DetailPanel from "./DetailPanel";
import DetailPanelEmpty from "./DetailPanelEmpty";
import LiveMarkdownEditor from "./LiveMarkdownEditor";
import MarkdownToolbar from "./MarkdownToolbar";
import {
  METADATA_EDIT_INPUT_CLS,
  METADATA_EDIT_INPUT_DEFAULT_CLS,
  MetadataFieldEdit,
} from "./MetadataField";
import StickyThenScroll from "./StickyThenScroll";
import TicketDetailView from "./TicketDetailView";
import Tooltip from "./Tooltip";
import { priorityColors } from "./TestCaseDetailModal";
import { DEBOUNCE_MS } from "../constants/autoSave";
import { useDebouncedAutoSave } from "../hooks/useDebouncedAutoSave";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
import { listReleases, onTicketsUpdated } from "../services/api";
import { registerAutoSaveFlush } from "../utils/autoSaveFlushRegistry";
import TagsInput from "./TagsInput";

const inlineCls =
  "bg-transparent border-0 border-b border-transparent outline-none transition-colors focus:border-indigo-400 dark:focus:border-indigo-500";

const TICKET_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "in_testing", label: "In testing" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const normalizeTicketDraft = (d) => ({
  title: (d.title || "").trim(),
  type: (d.type || "task").trim().toLowerCase(),
  status: (d.status || "open").trim().toLowerCase(),
  priority: (d.priority || "medium").trim().toLowerCase(),
  assigned_to: (d.assignedTo || "").trim(),
  reporter: (d.reporter || "").trim(),
  release: (d.release || "").trim(),
  tags: (d.tagsStr || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .join(","),
  body: (d.body || "").trim(),
  params: JSON.stringify(d.params ?? {}),
});

/**
 * Ticket detail / edit panel — debounced auto-save + LiveMarkdownEditor.
 */
function TicketEditorPanel({
  ticketDetail = null,
  selectedTicketFilePath = null,
  isEditing = false,
  onToggleEdit,
  onSave,
  onClearSelection,
  emptyTitle = "Select a ticket",
  emptyDescription = "or right-click a project to create one",
}) {
  const [title, setTitle] = useState("");
  const [ticketType, setTicketType] = useState("task");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [reporter, setReporter] = useState("");
  const [release, setRelease] = useState("");
  const [projectReleases, setProjectReleases] = useState([]);
  const [tagsStr, setTagsStr] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [params, setParams] = useState({});
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [measuredBodyHeight, setMeasuredBodyHeight] = useState(null);
  const [formSyncedPath, setFormSyncedPath] = useState(null);
  const prevInitKeyRef = useRef(null);
  const bodyMeasureRef = useRef(null);

  const ticketDetailReady =
    !!ticketDetail &&
    !!selectedTicketFilePath &&
    ticketDetail.file_path === selectedTicketFilePath &&
    formSyncedPath === selectedTicketFilePath;

  const ticketProject =
    ticketDetail?.project ||
    selectedTicketFilePath?.split("/").slice(-2, -1)[0] ||
    "";

  useEffect(() => {
    if (!ticketProject) {
      setProjectReleases([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      void listReleases({ project: ticketProject })
        .then((list) => {
          if (!cancelled) setProjectReleases(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (!cancelled) setProjectReleases([]);
        });
    };
    load();
    const unsubscribe = onTicketsUpdated(load);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [ticketProject]);

  const releaseSelectOptions = useMemo(() => {
    const options = projectReleases.map((r) => ({
      value: r.release_id,
      label: r.name
        ? `${r.name} (${r.release_id})`
        : r.release_id,
    }));
    const current = (release || "").trim();
    if (
      current &&
      !options.some((o) => o.value === current)
    ) {
      options.unshift({ value: current, label: `${current} (missing)` });
    }
    return options;
  }, [projectReleases, release]);

  useEffect(() => {
    if (!ticketDetail) {
      setFormSyncedPath(null);
      prevInitKeyRef.current = null;
      return;
    }
    if (ticketDetail.file_path !== selectedTicketFilePath) {
      setFormSyncedPath(null);
      prevInitKeyRef.current = null;
      return;
    }
    const initKey = selectedTicketFilePath;
    if (initKey === prevInitKeyRef.current) return;
    prevInitKeyRef.current = initKey;
    setTitle(ticketDetail.title ?? "");
    setTicketType((ticketDetail.type || "task").toLowerCase());
    setStatus((ticketDetail.status || "open").toLowerCase());
    setPriority((ticketDetail.priority || "medium").toLowerCase());
    setAssignedTo(ticketDetail.assigned_to ?? "");
    setReporter(ticketDetail.reporter ?? "");
    setRelease(ticketDetail.release ?? "");
    setTagsStr(Array.isArray(ticketDetail.tags) ? ticketDetail.tags.join(", ") : "");
    setParams(ticketDetail.params ?? {});
    setBody(ticketDetail.body ?? "");
    setError("");
    setFormSyncedPath(selectedTicketFilePath);
  }, [ticketDetail, selectedTicketFilePath]);

  useEffect(() => {
    if (!isEditing) {
      prevInitKeyRef.current = null;
      setMeasuredBodyHeight(null);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !bodyMeasureRef.current) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled && bodyMeasureRef.current) {
          setMeasuredBodyHeight(bodyMeasureRef.current.scrollHeight);
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [isEditing, body]);

  const displayTags = useMemo(
    () =>
      (tagsStr || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsStr],
  );

  const handleAddTag = useCallback(
    (value) => {
      const tag = (value || "").trim();
      if (!tag) return;
      const exists = displayTags.some((t) => t.toLowerCase() === tag.toLowerCase());
      if (exists) {
        setTagInput("");
        return;
      }
      setTagsStr([...displayTags, tag].join(", "));
      setTagInput("");
    },
    [displayTags],
  );

  const handleRemoveTag = useCallback(
    (tagToRemove) => {
      setTagsStr(displayTags.filter((t) => t !== tagToRemove).join(", "));
    },
    [displayTags],
  );

  const draft = useMemo(
    () => ({
      title,
      type: ticketType,
      status,
      priority,
      assignedTo,
      reporter,
      release,
      tagsStr,
      params,
      body,
    }),
    [
      title,
      ticketType,
      status,
      priority,
      assignedTo,
      reporter,
      release,
      tagsStr,
      params,
      body,
    ],
  );

  const persistedSnapshot = useMemo(
    () => ({
      title: ticketDetail?.title ?? "",
      type: (ticketDetail?.type || "task").toLowerCase(),
      status: (ticketDetail?.status || "open").toLowerCase(),
      priority: (ticketDetail?.priority || "medium").toLowerCase(),
      assignedTo: ticketDetail?.assigned_to ?? "",
      reporter: ticketDetail?.reporter ?? "",
      release: ticketDetail?.release ?? "",
      tagsStr: Array.isArray(ticketDetail?.tags) ? ticketDetail.tags.join(", ") : "",
      params: ticketDetail?.params ?? {},
      body: ticketDetail?.body ?? "",
    }),
    [ticketDetail],
  );

  const buildSavePayload = useCallback(
    (d) => ({
      title: d.title.trim(),
      type: d.type,
      status: d.status,
      priority: d.priority,
      assigned_to: (d.assignedTo || "").trim(),
      reporter: (d.reporter || "").trim(),
      release: (d.release || "").trim(),
      tags: (d.tagsStr || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      body: (d.body || "").trim(),
      params: d.params ?? {},
    }),
    [],
  );

  const handleAutoSave = useCallback(
    async (d) => {
      if (!selectedTicketFilePath) return;
      setError("");
      try {
        await onSave(selectedTicketFilePath, buildSavePayload(d));
      } catch (err) {
        setError(err?.message || "Save failed");
        throw err;
      }
    },
    [buildSavePayload, onSave, selectedTicketFilePath],
  );

  const { flush } = useDebouncedAutoSave({
    enabled: isEditing && ticketDetailReady,
    key: selectedTicketFilePath,
    draft,
    persisted: persistedSnapshot,
    normalize: normalizeTicketDraft,
    save: handleAutoSave,
    delayMs: DEBOUNCE_MS,
    silent: true,
  });

  useEffect(() => registerAutoSaveFlush(flush), [flush]);

  const handleView = useCallback(async () => {
    try {
      await flush();
      onToggleEdit?.(false);
    } catch {
      // Error already shown in footer; stay in edit mode.
    }
  }, [flush, onToggleEdit]);

  const { toolbarProps, getLiveEditorProps } = useMarkdownEditor(body, setBody, {
    onBlur: () => flush(),
    disabled: false,
    growWithContent: true,
    initialHeight: measuredBodyHeight ?? undefined,
  });

  if (!ticketDetail && !selectedTicketFilePath) {
    return (
      <DetailPanel>
        <DetailPanelEmpty
          iconComponent={Ticket}
          title={emptyTitle}
          description={emptyDescription}
        />
      </DetailPanel>
    );
  }

  if (!isEditing && ticketDetail) {
    const projectTitle =
      ticketDetail.project ||
      selectedTicketFilePath?.split("/").slice(-2, -1)[0] ||
      "Ticket";
    return (
      <DetailPanel
        title={
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {projectTitle}
          </span>
        }
        onClose={onClearSelection}
        bodyScroll={false}
      >
        <TicketDetailView
          ticket={ticketDetail}
          ticketIdRowExtra={
            <Tooltip label="Edit" placement="bottom-end">
              <button
                type="button"
                onClick={() => onToggleEdit?.(true)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </Tooltip>
          }
        />
      </DetailPanel>
    );
  }

  const priorityKey = priority.toLowerCase();
  const ticketId = ticketDetail?.ticket_id || "—";

  const ticketHeader = (
    <header className="relative z-20 border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled ticket"
          className={`${inlineCls} min-w-0 flex-1 rounded border border-indigo-200 bg-white text-lg font-bold leading-snug text-slate-900 outline-none ring-indigo-400 placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600`}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="font-mono text-sm font-normal tracking-wide text-slate-800 dark:text-slate-100">
          {ticketId}
        </span>
        <Tooltip label="Editing mode" placement="bottom">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100">
            <Pencil className="h-3 w-3" />
            Editing
          </span>
        </Tooltip>
        <Tooltip label="View" placement="bottom-end">
          <button
            type="button"
            onClick={() => void handleView()}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </header>
  );

  const ticketMetadataStrip = (
    <div className="flex flex-wrap items-stretch gap-2">
      <MetadataFieldEdit label="Type">
        <select
          value={ticketType}
          onChange={(e) => setTicketType(e.target.value)}
          className={`${METADATA_EDIT_INPUT_CLS} ${METADATA_EDIT_INPUT_DEFAULT_CLS} cursor-pointer appearance-none pr-7 shadow-sm`}
        >
          <option value="bug">Bug</option>
          <option value="story">Story</option>
          <option value="task">Task</option>
          <option value="spike">Spike</option>
        </select>
      </MetadataFieldEdit>
      <MetadataFieldEdit label="Status">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${METADATA_EDIT_INPUT_CLS} ${METADATA_EDIT_INPUT_DEFAULT_CLS} cursor-pointer appearance-none pr-7 shadow-sm`}
        >
          {TICKET_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </MetadataFieldEdit>
      <MetadataFieldEdit label="Priority">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={`${METADATA_EDIT_INPUT_CLS} ${priorityColors[priorityKey] || METADATA_EDIT_INPUT_DEFAULT_CLS} cursor-pointer appearance-none pr-7 shadow-sm`}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </MetadataFieldEdit>
      <MetadataFieldEdit label="Assigned to">
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="—"
          className={`${METADATA_EDIT_INPUT_CLS} ${METADATA_EDIT_INPUT_DEFAULT_CLS}`}
        />
      </MetadataFieldEdit>
      <MetadataFieldEdit label="Reporter">
        <input
          type="text"
          value={reporter}
          onChange={(e) => setReporter(e.target.value)}
          placeholder="—"
          className={`${METADATA_EDIT_INPUT_CLS} ${METADATA_EDIT_INPUT_DEFAULT_CLS}`}
        />
      </MetadataFieldEdit>
      <MetadataFieldEdit label="Release">
        <select
          value={release}
          onChange={(e) => setRelease(e.target.value)}
          className={`${METADATA_EDIT_INPUT_CLS} ${METADATA_EDIT_INPUT_DEFAULT_CLS} cursor-pointer appearance-none pr-7 shadow-sm`}
          aria-label="Release"
        >
          <option value="">—</option>
          {releaseSelectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </MetadataFieldEdit>
      <MetadataFieldEdit label="Tags" className="min-w-[12rem]">
        <TagsInput
          tags={displayTags}
          inputValue={tagInput}
          onInputChange={setTagInput}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      </MetadataFieldEdit>
      <CustomFieldsEditStrip value={params} onChange={setParams} />
    </div>
  );

  const bodyEditorProps = getLiveEditorProps({
    placeholder: "Write ticket details in Markdown…",
    "aria-label": "Ticket body (Markdown)",
    className:
      "min-h-[7.5rem] w-full overflow-y-hidden resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500",
    measureRef: bodyMeasureRef,
  });

  const projectTitle =
    ticketDetail?.project ||
    selectedTicketFilePath?.split("/").slice(-2, -1)[0] ||
    "Ticket";

  return (
    <DetailPanel
      title={
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {projectTitle}
        </span>
      }
      onClose={onClearSelection}
      bodyScroll={false}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <StickyThenScroll
          stickyContent={ticketHeader}
          scrollContent={
            <>
              <div className="px-3 pb-2 pt-3">{ticketMetadataStrip}</div>
              <div className="sticky top-0 z-20 border-t border-slate-200 bg-white px-3 pt-2 shadow-[0_-2px_0_0_#fff] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_-2px_0_0_#0f172a]">
                <MarkdownToolbar {...toolbarProps} />
              </div>
              <div className="px-3 pb-3 pt-2">
                <div className="relative">
                  <LiveMarkdownEditor {...bodyEditorProps} />
                </div>
              </div>
            </>
          }
        />
        {error ? (
          <footer className="shrink-0 border-t border-slate-200 px-2 py-1.5 dark:border-slate-700">
            <div className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          </footer>
        ) : null}
      </div>
    </DetailPanel>
  );
}

export default TicketEditorPanel;
