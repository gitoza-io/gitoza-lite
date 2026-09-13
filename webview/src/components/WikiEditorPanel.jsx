import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Eye, Pencil, Save } from "lucide-react";
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
import WikiDetailView from "./WikiDetailView";
import Tooltip from "./Tooltip";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
import { getTagColorClass } from "../utils/tagColor";

const inlineCls =
  "bg-transparent border-0 border-b border-transparent outline-none transition-colors focus:border-indigo-400 dark:focus:border-indigo-500";

const WIKI_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "outdated", label: "Outdated" },
];

/**
 * Wiki detail / edit panel — mirrors TicketEditorPanel (manual save + LiveMarkdownEditor).
 */
function WikiEditorPanel({
  wikiDetail = null,
  selectedWikiFilePath = null,
  isEditing = false,
  onToggleEdit,
  onSave,
  onClearSelection,
  emptyTitle = "Select a page",
  emptyDescription = "or right-click a folder to create one",
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [tagsStr, setTagsStr] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [measuredBodyHeight, setMeasuredBodyHeight] = useState(null);
  const [formSyncedPath, setFormSyncedPath] = useState(null);
  const prevInitKeyRef = useRef(null);
  const bodyMeasureRef = useRef(null);

  const wikiDetailReady =
    !!wikiDetail &&
    !!selectedWikiFilePath &&
    wikiDetail.file_path === selectedWikiFilePath &&
    formSyncedPath === selectedWikiFilePath;

  useEffect(() => {
    if (!wikiDetail) {
      setFormSyncedPath(null);
      prevInitKeyRef.current = null;
      return;
    }
    if (wikiDetail.file_path !== selectedWikiFilePath) {
      setFormSyncedPath(null);
      prevInitKeyRef.current = null;
      return;
    }
    const initKey = selectedWikiFilePath;
    if (initKey === prevInitKeyRef.current) return;
    prevInitKeyRef.current = initKey;
    setTitle(wikiDetail.title ?? "");
    setStatus((wikiDetail.status || "draft").toLowerCase());
    setTagsStr(Array.isArray(wikiDetail.tags) ? wikiDetail.tags.join(", ") : "");
    setBody(wikiDetail.body ?? "");
    setError("");
    setFormSyncedPath(selectedWikiFilePath);
  }, [wikiDetail, selectedWikiFilePath]);

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
    () => ({ title, status, tagsStr, body }),
    [title, status, tagsStr, body],
  );

  const buildSavePayload = useCallback(
    (d) => ({
      title: d.title.trim(),
      status: d.status,
      tags: (d.tagsStr || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      body: (d.body || "").trim(),
    }),
    [],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!wikiDetailReady || !selectedWikiFilePath) return;
    setError("");
    setLoading(true);
    try {
      await onSave(buildSavePayload(draft));
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }, [buildSavePayload, draft, onSave, selectedWikiFilePath, wikiDetailReady]);

  const { toolbarProps, getLiveEditorProps } = useMarkdownEditor(body, setBody, {
    disabled: false,
    growWithContent: true,
    initialHeight: measuredBodyHeight ?? undefined,
  });

  const folderTitle =
    wikiDetail?.directory?.split("/").pop() ||
    selectedWikiFilePath?.split("/").slice(-2, -1)[0] ||
    "Wiki";

  if (!wikiDetail && !selectedWikiFilePath) {
    return (
      <DetailPanel>
        <DetailPanelEmpty
          iconComponent={BookOpen}
          title={emptyTitle}
          description={emptyDescription}
        />
      </DetailPanel>
    );
  }

  if (!isEditing && wikiDetail) {
    return (
      <DetailPanel
        title={
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {folderTitle}
          </span>
        }
        onClose={onClearSelection}
        bodyScroll={false}
      >
        <WikiDetailView
          page={wikiDetail}
          pageIdRowExtra={
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

  const pageId = wikiDetail?.page_id || "—";

  const wikiHeader = (
    <header className="border-b border-slate-200 bg-slate-50/60 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled page"
          className={`${inlineCls} min-w-0 flex-1 rounded border border-indigo-200 bg-white text-lg font-bold leading-snug text-slate-900 outline-none ring-indigo-400 placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600`}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="font-mono text-sm font-normal tracking-wide text-slate-800 dark:text-slate-100">
          {pageId}
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
            onClick={() => onToggleEdit?.(false)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip label="Save" placement="bottom-end">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading || !wikiDetailReady}
            className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            aria-label="Save"
          >
            <Save className="h-4 w-4" />
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
            {WIKI_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </MetadataFieldEdit>
        <MetadataFieldEdit label="Tags" className="min-w-[12rem]">
          <div className="relative min-w-[12rem]">
            <div className="flex min-h-[2rem] flex-wrap items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-500 dark:bg-slate-950">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTagColorClass(
                    tag,
                  )}`}
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="inline-flex h-3 w-3 items-center justify-center rounded-full text-[10px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  } else if (e.key === "Backspace" && !tagInput) {
                    const last = displayTags[displayTags.length - 1];
                    if (last) handleRemoveTag(last);
                  }
                }}
                onBlur={() => handleAddTag(tagInput)}
                placeholder={
                  displayTags.length === 0 ? "Add tags…" : "Type and press Enter"
                }
                className="min-w-[6rem] flex-1 border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </MetadataFieldEdit>
      </div>
    </header>
  );

  const bodyEditorProps = getLiveEditorProps({
    placeholder: "Write wiki content in Markdown…",
    "aria-label": "Wiki body (Markdown)",
    className:
      "min-h-[7.5rem] w-full overflow-y-hidden resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500",
    measureRef: bodyMeasureRef,
  });

  return (
    <DetailPanel
      title={
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {folderTitle}
        </span>
      }
      onClose={onClearSelection}
      bodyScroll={false}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <StickyThenScroll
          stickyContent={
            <>
              {wikiHeader}
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

export default WikiEditorPanel;
