import { renderMarkdown, priorityColors } from "./TestCaseDetailModal";
import { getTagColorClass } from "../utils/tagColor";
import { CustomFieldRead, sortCustomFieldEntries } from "./CaseCustomFields";
import { MetadataFieldRead } from "./MetadataField";
import StickyThenScroll from "./StickyThenScroll";

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTicketStatusLabel(status) {
  if (!status) return "";
  return String(status)
    .split("_")
    .map((part) => capitalize(part))
    .join(" ");
}

/**
 * Read-only ticket detail — pin title + ID; frontmatter scrolls with body.
 */
function TicketDetailView({ ticket, ticketIdRowExtra = null }) {
  if (!ticket) return null;

  const tags = ticket.tags ?? [];
  const customFieldEntries = sortCustomFieldEntries(ticket.params);
  const priorityKey = (ticket.priority || "").toLowerCase();
  const typeLabel = ticket.type || ticket.ticket_type || "task";

  const stickyHeader = (
    <header className="relative z-20 border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold leading-snug text-ink">
        {ticket.title || "Untitled ticket"}
      </h2>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="font-mono text-sm font-normal tracking-wide text-ink">
          {ticket.ticket_id || "—"}
        </span>
        {ticketIdRowExtra}
      </div>
    </header>
  );

  const frontmatterStrip = (
    <div className="flex flex-wrap items-stretch gap-2">
      {typeLabel ? (
        <MetadataFieldRead label="Type" value={capitalize(typeLabel)} />
      ) : null}
      {ticket.status ? (
        <MetadataFieldRead
          label="Status"
          value={formatTicketStatusLabel(ticket.status)}
        />
      ) : null}
      {ticket.priority ? (
        <MetadataFieldRead
          label="Priority"
          value={capitalize(ticket.priority)}
          valueClassName={
            priorityColors[priorityKey] || "text-slate-900 dark:text-slate-100"
          }
        />
      ) : null}
      {ticket.assigned_to ? (
        <MetadataFieldRead label="Assigned to" value={ticket.assigned_to} />
      ) : null}
      {ticket.reporter ? (
        <MetadataFieldRead label="Reporter" value={ticket.reporter} />
      ) : null}
      {ticket.release ? (
        <MetadataFieldRead label="Release" value={ticket.release} />
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
      {customFieldEntries.map(([key, val]) => (
        <CustomFieldRead key={key} fieldKey={key} value={val} />
      ))}
    </div>
  );

  return (
    <StickyThenScroll
      stickyContent={stickyHeader}
      scrollContent={
        <>
          <div className="px-3 pb-2 pt-3">{frontmatterStrip}</div>
          <div className="px-3 pb-3 pt-2">
            {ticket.body ? (
              <article className="prose-rex">{renderMarkdown(ticket.body)}</article>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                No body content for this ticket.
              </p>
            )}
          </div>
        </>
      }
    />
  );
}

export default TicketDetailView;
