/** Pure path-prefix guards (no vscode dependency). */

export function assertUnderRoot(relPath: string, rootRel: string): void {
  const norm = relPath.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!norm.startsWith(rootRel + "/") && norm !== rootRel) {
    throw new Error(`Path must be under ${rootRel}`);
  }
  if (norm.includes("..")) {
    throw new Error("Invalid path");
  }
}
