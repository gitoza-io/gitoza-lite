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
 * Keep the ancestor chain of an opened folder (like project → release),
 * pruning siblings so only the focus path remains. Descendants of the
 * opened node are kept intact.
 * @param {Array<{ directory_path?: string, children?: Array }> | null | undefined} tree
 * @param {string | null | undefined} openedPath
 * @returns {Array<{ directory_path?: string, children?: Array }>}
 */
export function filterTreeToOpenedFocusPath(tree, openedPath) {
  if (!openedPath) return tree || [];

  function pruneToPath(nodes) {
    for (const n of nodes ?? []) {
      const path = n.directory_path;
      if (!path) continue;
      if (path === openedPath) {
        return [n];
      }
      if (openedPath.startsWith(`${path}/`)) {
        const childBranch = pruneToPath(n.children);
        return [
          {
            ...n,
            children: childBranch.length ? childBranch : undefined,
          },
        ];
      }
    }
    return [];
  }

  return pruneToPath(tree);
}

/**
 * Build a slash-joined breadcrumb label along the path to an opened node
 * (e.g. "guides/setup/install").
 * @param {Array<{ directory_path?: string, display_name?: string, name?: string, children?: Array }> | null | undefined} tree
 * @param {string | null | undefined} openedPath
 * @returns {string}
 */
export function buildOpenFocusPathLabel(tree, openedPath) {
  if (!openedPath) return "";
  const labels = [];
  function walk(nodes) {
    for (const n of nodes ?? []) {
      const path = n.directory_path;
      if (!path) continue;
      if (path === openedPath || openedPath.startsWith(`${path}/`)) {
        labels.push(n.display_name ?? n.name ?? path.split("/").pop() ?? path);
        if (path === openedPath) return true;
        return walk(n.children);
      }
    }
    return false;
  }
  walk(tree);
  return labels.join("/");
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
