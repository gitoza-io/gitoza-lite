/**
 * Project-focus quick filters for Tickets toolbar.
 * @typedef {"open" | "blocked" | "backlog"} TicketQuickFilterId
 */

/**
 * @param {unknown} ticket
 * @param {TicketQuickFilterId | null | undefined} filter
 * @returns {boolean}
 */
export function ticketMatchesQuickFilter(ticket, filter) {
  if (!filter) return true;
  const status = String(ticket?.status ?? "").trim().toLowerCase();
  const release = String(ticket?.release ?? "").trim();
  if (filter === "open") return status === "open";
  if (filter === "blocked") return status === "blocked";
  if (filter === "backlog") return !release;
  return true;
}

/**
 * Toggle exclusive quick filter: same id clears; other id replaces.
 * @param {TicketQuickFilterId | null} current
 * @param {TicketQuickFilterId} next
 * @returns {TicketQuickFilterId | null}
 */
export function toggleTicketQuickFilter(current, next) {
  return current === next ? null : next;
}

/**
 * Counts for toolbar icons (stable while a quick filter is applied).
 * @param {Array<{ status?: string, release?: string }>} tickets
 * @returns {{ open: number, blocked: number, backlog: number }}
 */
export function countTicketQuickFilters(tickets) {
  let open = 0;
  let blocked = 0;
  let backlog = 0;
  for (const t of tickets || []) {
    if (ticketMatchesQuickFilter(t, "open")) open += 1;
    if (ticketMatchesQuickFilter(t, "blocked")) blocked += 1;
    if (ticketMatchesQuickFilter(t, "backlog")) backlog += 1;
  }
  return { open, blocked, backlog };
}
