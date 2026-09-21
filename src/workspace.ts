import * as vscode from "vscode";
import { CASES_ROOT, RUNS_ROOT, TICKETS_ROOT, WIKI_ROOT } from "./messageTypes";
import { assertUnderRoot } from "./pathAsserts";

export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return undefined;
  }
  for (const folder of folders) {
  const casesUri = vscode.Uri.joinPath(folder.uri, CASES_ROOT);
    try {
      // sync check via stat in async callers; here return first folder with cases or first folder
    } catch {
      // ignore
    }
    void casesUri;
  }
  return folders[0];
}

export async function resolveCasesRootUri(): Promise<{
  folder: vscode.WorkspaceFolder;
  casesRootUri: vscode.Uri;
  casesRootRel: string;
} | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return null;
  }

  for (const folder of folders) {
    const casesUri = vscode.Uri.joinPath(folder.uri, CASES_ROOT);
    try {
      const stat = await vscode.workspace.fs.stat(casesUri);
      if (stat.type === vscode.FileType.Directory) {
        return { folder, casesRootUri: casesUri, casesRootRel: CASES_ROOT };
      }
    } catch {
      // not found in this folder
    }
  }

  // Fall back to first folder — cases root may be created later
  const folder = folders[0];
  return {
    folder,
    casesRootUri: vscode.Uri.joinPath(folder.uri, CASES_ROOT),
    casesRootRel: CASES_ROOT,
  };
}

export async function hasCasesRoot(): Promise<boolean> {
  const resolved = await resolveCasesRootUri();
  if (!resolved) {
    return false;
  }
  try {
    const stat = await vscode.workspace.fs.stat(resolved.casesRootUri);
    return stat.type === vscode.FileType.Directory;
  } catch {
    return false;
  }
}

export function toRepoRelativePath(
  workspaceFolder: vscode.WorkspaceFolder,
  absUri: vscode.Uri,
): string {
  const root = workspaceFolder.uri.fsPath.replace(/\\/g, "/");
  const abs = absUri.fsPath.replace(/\\/g, "/");
  if (abs.startsWith(root + "/")) {
    return abs.slice(root.length + 1);
  }
  return abs;
}

export function joinRepoPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
}

export function isValidName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name.trim());
}

export {
  displayNameFromSanitized,
  sanitizeNameForPath,
} from "./nameSanitize";

export function isValidCaseId(caseId: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(caseId.trim());
}

export function assertUnderCasesRoot(relPath: string): void {
  assertUnderRoot(relPath, CASES_ROOT);
}

export async function resolveRunsRootUri(): Promise<{
  folder: vscode.WorkspaceFolder;
  runsRootUri: vscode.Uri;
  runsRootRel: string;
} | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return null;
  }

  for (const folder of folders) {
    const runsUri = vscode.Uri.joinPath(folder.uri, RUNS_ROOT);
    try {
      const stat = await vscode.workspace.fs.stat(runsUri);
      if (stat.type === vscode.FileType.Directory) {
        return { folder, runsRootUri: runsUri, runsRootRel: RUNS_ROOT };
      }
    } catch {
      // not found in this folder
    }
  }

  const folder = folders[0];
  return {
    folder,
    runsRootUri: vscode.Uri.joinPath(folder.uri, RUNS_ROOT),
    runsRootRel: RUNS_ROOT,
  };
}

export async function hasRunsRoot(): Promise<boolean> {
  const resolved = await resolveRunsRootUri();
  if (!resolved) {
    return false;
  }
  try {
    const stat = await vscode.workspace.fs.stat(resolved.runsRootUri);
    return stat.type === vscode.FileType.Directory;
  } catch {
    return false;
  }
}

export function assertUnderRunsRoot(relPath: string): void {
  assertUnderRoot(relPath, RUNS_ROOT);
}

async function resolveRootUri(
  rootRel: string,
): Promise<{
  folder: vscode.WorkspaceFolder;
  rootUri: vscode.Uri;
  rootRel: string;
} | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return null;
  }

  for (const folder of folders) {
    const rootUri = vscode.Uri.joinPath(folder.uri, rootRel);
    try {
      const stat = await vscode.workspace.fs.stat(rootUri);
      if (stat.type === vscode.FileType.Directory) {
        return { folder, rootUri, rootRel };
      }
    } catch {
      // not found in this folder
    }
  }

  const folder = folders[0];
  return {
    folder,
    rootUri: vscode.Uri.joinPath(folder.uri, rootRel),
    rootRel,
  };
}

async function hasRoot(rootRel: string): Promise<boolean> {
  const resolved = await resolveRootUri(rootRel);
  if (!resolved) {
    return false;
  }
  try {
    const stat = await vscode.workspace.fs.stat(resolved.rootUri);
    return stat.type === vscode.FileType.Directory;
  } catch {
    return false;
  }
}

export async function resolveTicketsRootUri(): Promise<{
  folder: vscode.WorkspaceFolder;
  ticketsRootUri: vscode.Uri;
  ticketsRootRel: string;
} | null> {
  const resolved = await resolveRootUri(TICKETS_ROOT);
  if (!resolved) {
    return null;
  }
  return {
    folder: resolved.folder,
    ticketsRootUri: resolved.rootUri,
    ticketsRootRel: resolved.rootRel,
  };
}

export async function hasTicketsRoot(): Promise<boolean> {
  return hasRoot(TICKETS_ROOT);
}

export function assertUnderTicketsRoot(relPath: string): void {
  assertUnderRoot(relPath, TICKETS_ROOT);
}

export async function resolveWikiRootUri(): Promise<{
  folder: vscode.WorkspaceFolder;
  wikiRootUri: vscode.Uri;
  wikiRootRel: string;
} | null> {
  const resolved = await resolveRootUri(WIKI_ROOT);
  if (!resolved) {
    return null;
  }
  return {
    folder: resolved.folder,
    wikiRootUri: resolved.rootUri,
    wikiRootRel: resolved.rootRel,
  };
}

export async function hasWikiRoot(): Promise<boolean> {
  return hasRoot(WIKI_ROOT);
}

export function assertUnderWikiRoot(relPath: string): void {
  assertUnderRoot(relPath, WIKI_ROOT);
}
