import { renderMarkdown } from "./TestCaseDetailModal";
import { MetadataFieldRead } from "./MetadataField";

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Read-only release detail — same layout as TicketDetailView / WikiDetailView.
 */
function ReleaseDetailView({ release, releaseIdRowExtra = null }) {
  if (!release) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-700">
        <h2 className="text-lg font-bold leading-snug text-ink">
          {release.name || "Untitled release"}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-mono text-sm font-normal tracking-wide text-ink">
            {release.release_id || "—"}
          </span>
          {releaseIdRowExtra}
        </div>
        <div className="mt-2 flex flex-wrap items-stretch gap-2">
          {release.status ? (
            <MetadataFieldRead
              label="Status"
              value={capitalize(release.status)}
            />
          ) : null}
          {release.project ? (
            <MetadataFieldRead label="Project" value={release.project} />
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-3">
        {release.body ? (
          <article className="prose-rex">{renderMarkdown(release.body)}</article>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
            No body content for this release.
          </p>
        )}
      </div>
    </div>
  );
}

export default ReleaseDetailView;
