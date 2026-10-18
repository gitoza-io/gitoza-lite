/** On-disk extension for tickets, releases, wiki, cases, and runs. */
export const ENTITY_FILE_EXT = ".md";

/** Ticket project meta under `.gitoza-lite/tasks/tickets/{project}/` (front-matter-only Markdown). */
export const PROJECT_META_FILE = ".project.md";

/** Glob segment for entity files under a directory (e.g. "*.md"). */
export const ENTITY_GLOB = `*${ENTITY_FILE_EXT}`;

/** Recursive glob segment (e.g. "**" + "/*.md"). */
export const ENTITY_GLOB_RECURSIVE = `**/*${ENTITY_FILE_EXT}`;

const ENTITY_EXT_RE = /\.md$/i;

export function isEntityFileName(name: string): boolean {
  return ENTITY_EXT_RE.test(name);
}

export function isEntityFilePath(path: string): boolean {
  return ENTITY_EXT_RE.test(path.replace(/\\/g, "/"));
}

/** Strip entity extension from a filename or path basename. */
export function entityStemFromFileName(fileName: string): string {
  return fileName.replace(ENTITY_EXT_RE, "");
}

/** Strip trailing `/{stem}.md` from a path, leaving the directory. */
export function directoryOfEntityPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/\/[^/]+\.md$/i, "");
}

export function entityFileName(stem: string): string {
  return `${stem}${ENTITY_FILE_EXT}`;
}
