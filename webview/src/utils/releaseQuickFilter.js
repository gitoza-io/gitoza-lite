/**
 * Release-status quick filters for Releases toolbar (list / project focus).
 * @typedef {"open" | "shipped" | "cancelled"} ReleaseQuickFilterId
 */

/**
 * @param {unknown} release
 * @param {ReleaseQuickFilterId | null | undefined} filter
 * @returns {boolean}
 */
export function releaseMatchesQuickFilter(release, filter) {
  if (!filter) return true;
  const status = String(release?.status ?? "").trim().toLowerCase();
  return status === filter;
}

/**
 * Toggle exclusive quick filter: same id clears; other id replaces.
 * @param {ReleaseQuickFilterId | null} current
 * @param {ReleaseQuickFilterId} next
 * @returns {ReleaseQuickFilterId | null}
 */
export function toggleReleaseQuickFilter(current, next) {
  return current === next ? null : next;
}

/**
 * Counts for toolbar icons (stable while a quick filter is applied).
 * @param {Array<{ status?: string }>} releases
 * @returns {{ open: number, shipped: number, cancelled: number }}
 */
export function countReleaseQuickFilters(releases) {
  let open = 0;
  let shipped = 0;
  let cancelled = 0;
  for (const r of releases || []) {
    if (releaseMatchesQuickFilter(r, "open")) open += 1;
    if (releaseMatchesQuickFilter(r, "shipped")) shipped += 1;
    if (releaseMatchesQuickFilter(r, "cancelled")) cancelled += 1;
  }
  return { open, shipped, cancelled };
}
