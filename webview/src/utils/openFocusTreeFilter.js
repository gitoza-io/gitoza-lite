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
 * Filter a flat project list to a single open-focus project by name.
 * @param {Array<{ name?: string }> | null | undefined} projects
 * @param {string | null | undefined} openedName
 * @returns {Array<{ name?: string }>}
 */
export function filterProjectsToOpenedName(projects, openedName) {
  if (!openedName) return projects || [];
  return (projects || []).filter((p) => p.name === openedName);
}
