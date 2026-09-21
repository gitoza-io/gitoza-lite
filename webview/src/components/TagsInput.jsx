import { useRef } from "react";
import { getTagColorClass } from "../utils/tagColor";
import { TagOptionRow } from "./TagBadge";

/**
 * Chip field: type a tag and press Enter (or comma) to add it.
 * The inner input is borderless so it does not look like a nested text field.
 */
function TagsInput({
  tags = [],
  inputValue = "",
  onInputChange,
  onAddTag,
  onRemoveTag,
  suggestions = [],
  disabled = false,
  placeholder = "Add tags…",
}) {
  const inputRef = useRef(null);

  const commit = (value) => {
    const tag = (value || "").trim();
    if (!tag) return;
    onAddTag?.(tag);
  };

  return (
    <div className="relative min-w-[12rem] w-full">
      <div
        className="flex min-h-[2rem] w-full cursor-text flex-wrap items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-400/40 dark:border-slate-500 dark:bg-slate-950 dark:focus-within:border-indigo-400 dark:focus-within:ring-indigo-500/30"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTagColorClass(
              tag,
            )}`}
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTag?.(tag);
              }}
              disabled={disabled}
              className="inline-flex h-3 w-3 items-center justify-center rounded-full text-[10px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => onInputChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(inputValue);
            } else if (e.key === "Backspace" && !inputValue) {
              const last = tags[tags.length - 1];
              if (last) onRemoveTag?.(last);
            }
          }}
          onBlur={() => commit(inputValue)}
          placeholder={tags.length === 0 ? placeholder : ""}
          aria-label="Add tag"
          className="tag-inline-input min-w-[2ch] flex-1 appearance-none border-0 bg-transparent p-0 text-xs text-slate-700 shadow-none outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-ui border border-slate-200 bg-white text-xs shadow-lg dark:border-slate-600 dark:bg-slate-900">
          {suggestions.map((tag) => (
            <li key={tag}>
              <TagOptionRow
                tag={tag}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddTag?.(tag);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TagsInput;
