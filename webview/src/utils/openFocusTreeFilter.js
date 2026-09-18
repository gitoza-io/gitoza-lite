/**
 * Filter a top-level folder/run tree to a single open-focus root.
 * @param {Array<{ directory_path?: string }> | null | undefined} tree
 * @param {string | null | undefined} openedPath
 * @returns {Array<{ directory_path?: string }>}
 */
export function filterTreeToOpenedRoot(tree, openedPath) {
  if (!openedPath) return tree || [];
  return (tree || []).filter((n) => n.directory_path === openedPath);
}

/**
 * Filter a nested folder tree to a single open-focus node (any depth).
 * @param {Array<{ directory_path?: string, children?: Array }> | null | undefined} tree
 * @param {string | null | undefined} openedPath
 * @returns {Array<{ directory_path?: string, children?: Array }>}
 */
export function filterTreeToOpenedNode(tree, openedPath) {
  if (!openedPath) return tree || [];
  let found = null;
  function walk(nodes) {
    for (const n of nodes ?? []) {
      if (n.directory_path === openedPath) {
        found = n;
        return;
      }
      walk(n.children);
      if (found) return;
    }
  }
  walk(tree);
  return found ? [found] : [];
}

/**
 * Filter a flat project list to a single open-focus project by name.
 * @param {Array<{ name?: string }> | null | undefined} projects
 * @param {string | null | undefined} openedName
 * @returns {Array<{ name?: string }>}
 */
export function filterProjectsToOpenedName(projects, openedName) {
  if (!openedName) return projects || [];
  return (projects || []).filter((p) => p.name === openedName);
}
