/**
 * Client-side filter helpers for Tickets / Releases / Wiki tree search.
 */

/**
 * Case-insensitive substring match against one or more string / string[] fields.
 * Empty query matches everything.
 *
 * @param {Record<string, unknown>} item
 * @param {string} query
 * @param {string[]} fields
 * @returns {boolean}
 */
export function itemMatchesQuery(item, query, fields) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  if (!item || !Array.isArray(fields)) return false;

  for (const field of fields) {
    const raw = item[field];
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      if (raw.some((v) => String(v).toLowerCase().includes(q))) return true;
    } else if (String(raw).toLowerCase().includes(q)) {
      return true;
    }
  }
  return false;
}

/**
 * Exact case-insensitive match on an enum frontmatter field.
 * Empty value matches everything.
 *
 * @param {Record<string, unknown>} item
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
export function itemMatchesEnum(item, key, value) {
  const filter = String(value ?? "").trim().toLowerCase();
  if (!filter) return true;
  if (!item) return false;
  return String(item[key] ?? "")
    .trim()
    .toLowerCase() === filter;
}

/**
 * Filter items in a Map of groupKey → items[], dropping empty groups.
 *
 * @template T
 * @param {Map<string, T[]>} map
 * @param {(item: T) => boolean} predicate
 * @returns {Map<string, T[]>}
 */
export function filterGroupedMap(map, predicate) {
  const next = new Map();
  if (!map) return next;
  for (const [key, items] of map.entries()) {
    const filtered = (items || []).filter(predicate);
    if (filtered.length > 0) next.set(key, filtered);
  }
  return next;
}

/**
 * Collect directory paths that have matching pages (and their ancestors)
 * so the wiki folder tree can be pruned while keeping paths to hits.
 *
 * @param {Map<string, Array<{ directory?: string }>>} pagesByDir - already filtered pages
 * @param {string} rootDir
 * @returns {Set<string>}
 */
export function collectMatchingWikiDirs(pagesByDir, rootDir) {
  const keep = new Set();
  if (!pagesByDir) return keep;
  const root = String(rootDir || "").replace(/\/+$/, "");

  for (const [dir, pages] of pagesByDir.entries()) {
    if (!pages?.length) continue;
    let current = String(dir || "").replace(/\/+$/, "");
    while (current) {
      keep.add(current);
      if (!root || current === root) break;
      if (root && !current.startsWith(`${root}/`)) break;
      const slash = current.lastIndexOf("/");
      if (slash <= 0) break;
      current = current.slice(0, slash);
    }
  }
  return keep;
}

/**
 * Prune a wiki folder tree to only folders in `keepDirs` (and their kept children).
 *
 * @param {Array<{ directory_path?: string; children?: unknown[] }>} nodes
 * @param {Set<string>} keepDirs
 * @returns {typeof nodes}
 */
export function pruneWikiTree(nodes, keepDirs) {
  if (!Array.isArray(nodes) || !keepDirs) return [];
  const out = [];
  for (const node of nodes) {
    const dir = node?.directory_path;
    if (!dir || !keepDirs.has(dir)) continue;
    const children = pruneWikiTree(node.children || [], keepDirs);
    out.push({ ...node, children });
  }
  return out;
}

/**
 * Combined text + enum match for a list item.
 *
 * @param {Record<string, unknown>} item
 * @param {{ query?: string; queryFields?: string[]; enumKey?: string; enumValue?: string }} opts
 * @returns {boolean}
 */
export function itemMatchesTreeSearch(item, opts = {}) {
  const {
    query = "",
    queryFields = [],
    enumKey = "",
    enumValue = "",
  } = opts;
  return (
    itemMatchesQuery(item, query, queryFields) &&
    itemMatchesEnum(item, enumKey, enumValue)
  );
}
