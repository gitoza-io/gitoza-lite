/**
 * Ticket-status quick filters for Releases release-focus toolbar.
 * @typedef {"open" | "in_progress" | "in_testing" | "blocked" | "done"} ReleaseTicketQuickFilterId
 */

export const RELEASE_TICKET_QUICK_FILTER_IDS = [
  "open",
  "in_progress",
  "in_testing",
  "blocked",
  "done",
];

/**
 * @param {unknown} ticket
 * @param {ReleaseTicketQuickFilterId | null | undefined} filter
 * @returns {boolean}
 */
export function releaseTicketMatchesQuickFilter(ticket, filter) {
  if (!filter) return true;
  const status = String(ticket?.status ?? "").trim().toLowerCase();
  return status === filter;
}

/**
 * Toggle exclusive quick filter: same id clears; other id replaces.
 * @param {ReleaseTicketQuickFilterId | null} current
 * @param {ReleaseTicketQuickFilterId} next
 * @returns {ReleaseTicketQuickFilterId | null}
 */
export function toggleReleaseTicketQuickFilter(current, next) {
  return current === next ? null : next;
}

/**
 * Counts for toolbar icons (stable while a quick filter is applied).
 * @param {Array<{ status?: string }>} tickets
 * @returns {{ open: number, in_progress: number, in_testing: number, blocked: number, done: number }}
 */
export function countReleaseTicketQuickFilters(tickets) {
  const counts = {
    open: 0,
    in_progress: 0,
    in_testing: 0,
    blocked: 0,
    done: 0,
  };
  for (const t of tickets || []) {
    for (const id of RELEASE_TICKET_QUICK_FILTER_IDS) {
      if (releaseTicketMatchesQuickFilter(t, id)) counts[id] += 1;
    }
  }
  return counts;
}
