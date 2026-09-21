import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, Rocket } from "lucide-react";
import DetailPanel from "./DetailPanel";
import DetailPanelEmpty from "./DetailPanelEmpty";
import LiveMarkdownEditor from "./LiveMarkdownEditor";
import MarkdownToolbar from "./MarkdownToolbar";
import {
  METADATA_EDIT_INPUT_CLS,
  METADATA_EDIT_INPUT_DEFAULT_CLS,
  MetadataFieldEdit,
  MetadataFieldRead,
} from "./MetadataField";
import StickyThenScroll from "./StickyThenScroll";
import ReleaseDetailView from "./ReleaseDetailView";
import Tooltip from "./Tooltip";
import { DEBOUNCE_MS } from "../constants/autoSave";
import { useDebouncedAutoSave } from "../hooks/useDebouncedAutoSave";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
import { registerAutoSaveFlush } from "../utils/autoSaveFlushRegistry";

const inlineCls =
  "bg-transparent border-0 border-b border-transparent outline-none transition-colors focus:border-indigo-400 dark:focus:border-indigo-500";

const RELEASE_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
];

const normalizeReleaseDraft = (d) => ({
  name: (d.name || "").trim(),
  status: (d.status || "open").trim().toLowerCase(),
  body: (d.body || "").trim(),
});

/**
 * Release detail / edit panel — debounced auto-save + LiveMarkdownEditor.
 */
function ReleaseEditorPanel({
  releaseDetail = null,
  selectedReleaseFilePath = null,
  isEditing = false,
  onToggleEdit,
  onSave,
  onClearSelection,
  emptyTitle = "Select a release",
  emptyDescription = "or right-click a project to create one",
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("open");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [measuredBodyHeight, setMeasuredBodyHeight] = useState(null);
  const [formSyncedPath, setFormSyncedPath] = useState(null);
  const prevInitKeyRef = useRef(null);
  const bodyMeasureRef = useRef(null);

  const releaseDetailReady =
    !!releaseDetail &&
    !!selectedReleaseFilePath &&
    releaseDetail.file_path === selectedReleaseFilePath &&
    formSyncedPath === selectedReleaseFilePath;

  useEffect(() => {
    if (!releaseDetail) {
      setFormSyncedPath(null);
      prevInitKeyRef.current = null;
      return;
    }
    if (releaseDetail.file_path !== selectedReleaseFilePath) {
      setFormSyncedPath(null);
      prevInitKeyRef.current = null;
      return;
    }
    const initKey = selectedReleaseFilePath;
    if (initKey === prevInitKeyRef.current) return;
    prevInitKeyRef.current = initKey;
    setName(releaseDetail.name ?? "");
    setStatus((releaseDetail.status || "open").toLowerCase());
    setBody(releaseDetail.body ?? "");
    setError("");
    setFormSyncedPath(selectedReleaseFilePath);
  }, [releaseDetail, selectedReleaseFilePath]);

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

  const draft = useMemo(
    () => ({ name, status, body }),
    [name, status, body],
  );

  const persistedSnapshot = useMemo(
    () => ({
      name: releaseDetail?.name ?? "",
      status: (releaseDetail?.status || "open").toLowerCase(),
      body: releaseDetail?.body ?? "",
    }),
    [releaseDetail],
  );

  const buildSavePayload = useCallback(
    (d) => ({
      name: d.name.trim(),
      status: d.status,
      body: (d.body || "").trim(),
    }),
    [],
  );

  const handleAutoSave = useCallback(
    async (d) => {
      if (!selectedReleaseFilePath) return;
      if (!(d.name || "").trim()) {
        setError("Release name is required");
        return;
      }
      setError("");
      try {
        await onSave(selectedReleaseFilePath, buildSavePayload(d));
      } catch (err) {
        setError(err?.message || "Save failed");
        throw err;
      }
    },
    [buildSavePayload, onSave, selectedReleaseFilePath],
  );

  const { flush } = useDebouncedAutoSave({
    enabled: isEditing && releaseDetailReady,
    key: selectedReleaseFilePath,
    draft,
    persisted: persistedSnapshot,
    normalize: normalizeReleaseDraft,
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

  const projectTitle =
    releaseDetail?.project ||
    selectedReleaseFilePath?.split("/").slice(-3, -2)[0] ||
    "Release";

  if (!releaseDetail && !selectedReleaseFilePath) {
    return (
      <DetailPanel>
        <DetailPanelEmpty
          iconComponent={Rocket}
          title={emptyTitle}
          description={emptyDescription}
        />
      </DetailPanel>
    );
  }

  if (!isEditing && releaseDetail) {
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
        <ReleaseDetailView
          release={releaseDetail}
          releaseIdRowExtra={
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

  const releaseId = releaseDetail?.release_id || "—";

  const releaseHeader = (
    <header className="border-b border-slate-200 bg-slate-50/60 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled release"
          className={`${inlineCls} min-w-0 flex-1 rounded border border-indigo-200 bg-white text-lg font-bold leading-snug text-slate-900 outline-none ring-indigo-400 placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600`}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="font-mono text-sm font-normal tracking-wide text-slate-800 dark:text-slate-100">
          {releaseId}
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
      <div className="mt-2 flex flex-wrap items-stretch gap-2">
        <MetadataFieldEdit label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${METADATA_EDIT_INPUT_CLS} ${METADATA_EDIT_INPUT_DEFAULT_CLS} cursor-pointer appearance-none pr-7 shadow-sm`}
          >
            {RELEASE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </MetadataFieldEdit>
        {releaseDetail?.project ? (
          <MetadataFieldRead label="Project" value={releaseDetail.project} />
        ) : null}
      </div>
    </header>
  );

  const bodyEditorProps = getLiveEditorProps({
    placeholder: "Write release notes in Markdown…",
    "aria-label": "Release body (Markdown)",
    className:
      "min-h-[7.5rem] w-full overflow-y-hidden resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500",
    measureRef: bodyMeasureRef,
  });

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
          stickyContent={
            <>
              {releaseHeader}
              <div className="px-3 pt-1">
                <MarkdownToolbar {...toolbarProps} />
              </div>
            </>
          }
          scrollContent={
            <div className="px-3 py-3">
              <div className="relative">
                <LiveMarkdownEditor {...bodyEditorProps} />
              </div>
            </div>
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

export default ReleaseEditorPanel;
