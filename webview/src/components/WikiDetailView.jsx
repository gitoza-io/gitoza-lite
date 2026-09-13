import { renderMarkdown } from "./TestCaseDetailModal";
import { getTagColorClass } from "../utils/tagColor";
import { MetadataFieldRead } from "./MetadataField";

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Read-only wiki page detail — same layout as TicketDetailView / CaseDetailView.
 */
function WikiDetailView({ page, pageIdRowExtra = null }) {
  if (!page) return null;

  const tags = page.tags ?? [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-700">
        <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
          {page.title || "Untitled page"}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-mono text-sm font-normal tracking-wide text-slate-800 dark:text-slate-100">
            {page.page_id || "—"}
          </span>
          {pageIdRowExtra}
        </div>
        <div className="mt-2 flex flex-wrap items-stretch gap-2">
          {page.status ? (
            <MetadataFieldRead
              label="Status"
              value={capitalize(page.status)}
            />
          ) : null}
          {tags.length > 0 ? (
            <MetadataFieldRead label="Tags">
              <div className="flex flex-wrap items-center gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTagColorClass(
                      tag,
                    )}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </MetadataFieldRead>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-3">
        {page.body ? (
          <article className="prose-rex">{renderMarkdown(page.body)}</article>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
            No body content for this page.
          </p>
        )}
      </div>
    </div>
  );
}

export default WikiDetailView;
