import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import DetailPanel from "./DetailPanel";
import LiveMarkdownEditor from "./LiveMarkdownEditor";
import MarkdownToolbar from "./MarkdownToolbar";
import { renderMarkdown } from "./TestCaseDetailModal";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";

const inputCls =
  "w-full rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const labelCls = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400";
const selectCls = inputCls;

/**
 * Lightweight metadata + Markdown editor for tickets / wiki / releases.
 */
export default function SimpleEntityEditor({
  idLabel = "ID",
  idValue = "",
  fields = [],
  values = {},
  body = "",
  isEditing = false,
  onToggleEdit,
  onSave,
  onClose,
  onDelete,
  empty = false,
  emptyMessage = "Select an item",
  titleFallback = "Untitled",
}) {
  const [draftValues, setDraftValues] = useState(values);
  const [draftBody, setDraftBody] = useState(body);
  const [saving, setSaving] = useState(false);
  const { toolbarProps, getLiveEditorProps } = useMarkdownEditor(
    draftBody,
    setDraftBody,
    { disabled: !isEditing },
  );

  useEffect(() => {
    setDraftValues(values);
    setDraftBody(body);
  }, [values, body, idValue, isEditing]);

  if (empty) {
    return (
      <DetailPanel title={null}>
        <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </div>
      </DetailPanel>
    );
  }

  const title = (isEditing ? draftValues.title : values.title) || titleFallback;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ values: draftValues, body: draftBody });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailPanel
      title={title}
      subtitle={idValue ? `${idLabel}: ${idValue}` : null}
      headerExtra={
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={onToggleEdit}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={onToggleEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {onDelete ? (
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={onDelete}
            >
              Delete
            </button>
          ) : null}
        </div>
      }
      onClose={onClose}
      bodyScroll={!isEditing}
    >
      <div className="space-y-4 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => {
            const key = field.key;
            const val = isEditing
              ? draftValues[key] ?? ""
              : values[key] ?? "";
            if (!isEditing) {
              return (
                <div key={key}>
                  <div className={labelCls}>{field.label}</div>
                  <div className="text-sm text-slate-800 dark:text-slate-200">
                    {val || "—"}
                  </div>
                </div>
              );
            }
            if (field.type === "select") {
              return (
                <label key={key} className="block">
                  <span className={labelCls}>{field.label}</span>
                  <select
                    className={selectCls}
                    value={val}
                    onChange={(e) =>
                      setDraftValues((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  >
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label key={key} className="block">
                <span className={labelCls}>{field.label}</span>
                <input
                  className={inputCls}
                  value={val}
                  onChange={(e) =>
                    setDraftValues((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  placeholder={field.label}
                />
              </label>
            );
          })}
        </div>

        <div>
          <div className={labelCls}>Body</div>
          {isEditing ? (
            <div className="rounded border border-slate-200 dark:border-slate-700">
              <MarkdownToolbar {...toolbarProps} />
              <LiveMarkdownEditor
                {...getLiveEditorProps({
                  className: "min-h-[240px] w-full p-2 text-sm",
                  "aria-label": "Markdown body",
                })}
              />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {body?.trim() ? (
                renderMarkdown(body)
              ) : (
                <p className="text-sm text-slate-500">No content yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DetailPanel>
  );
}
