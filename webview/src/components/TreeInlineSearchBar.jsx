import { Search, X } from "lucide-react";

/**
 * Compact in-tree search bar: text field + frontmatter enum dropdown.
 * Filters apply live; does not replace the tree.
 *
 * @param {{
 *   query: string;
 *   onQueryChange: (value: string) => void;
 *   placeholder?: string;
 *   enumValue: string;
 *   onEnumChange: (value: string) => void;
 *   enumOptions: { value: string; label: string }[];
 *   enumAriaLabel?: string;
 *   enumEmptyLabel?: string;
 * }} props
 */
function TreeInlineSearchBar({
  query,
  onQueryChange,
  placeholder = "Search…",
  enumValue,
  onEnumChange,
  enumOptions = [],
  enumAriaLabel = "Filter",
  enumEmptyLabel = "All",
}) {
  const hasActive =
    String(query ?? "").trim().length > 0 || String(enumValue ?? "").trim().length > 0;

  const handleClear = () => {
    onQueryChange?.("");
    onEnumChange?.("");
  };

  return (
    <div className="flex flex-col gap-1.5 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query ?? ""}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded border border-slate-300 bg-white py-1.5 pl-7 pr-7 text-sm text-ink outline-none placeholder:text-muted focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-blue-500"
        />
        {hasActive ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <select
        value={enumValue ?? ""}
        onChange={(e) => onEnumChange?.(e.target.value)}
        aria-label={enumAriaLabel}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500"
      >
        <option value="">{enumEmptyLabel}</option>
        {enumOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TreeInlineSearchBar;
