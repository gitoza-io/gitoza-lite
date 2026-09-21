import * as vscode from "vscode";
import type {
  CreateWikiPagePayload,
  RepositoryTreeNode,
  UpdateWikiPagePayload,
  YamlWikiDetail,
  YamlWikiListItem,
  YamlWikiListResponse,
} from "./messageTypes";
import { WIKI_ROOT } from "./messageTypes";
import {
  assertUnderWikiRoot,
  displayNameFromSanitized,
  isValidName,
  joinRepoPath,
  resolveWikiRootUri,
  sanitizeNameForPath,
  toRepoRelativePath,
} from "./workspace";
import {
  parseWikiYaml,
  parseWikiYamlFrontMatterOnly,
  randomWikiId,
  serializeWikiYaml,
} from "./yamlWikiIO";

const ARCHIVE_SEGMENT = ".archive";

export class WikiRepository {
  async initializeWikiRoot(): Promise<string> {
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    await vscode.workspace.fs.createDirectory(resolved.wikiRootUri);
    return WIKI_ROOT;
  }

  async getWikiTree(): Promise<RepositoryTreeNode[]> {
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      return [];
    }
    try {
      await vscode.workspace.fs.stat(resolved.wikiRootUri);
    } catch {
      return [];
    }
    return this.buildTree(resolved.wikiRootUri, WIKI_ROOT);
  }

  private async buildTree(
    dirUri: vscode.Uri,
    relPath: string,
  ): Promise<RepositoryTreeNode[]> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return [];
    }

    const nodes: RepositoryTreeNode[] = [];
    const dirs = entries
      .filter(
        ([name, type]) =>
          type === vscode.FileType.Directory &&
          name !== ARCHIVE_SEGMENT &&
          !name.startsWith("."),
      )
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [name] of dirs) {
      const childRel = joinRepoPath(relPath, name);
      const childUri = vscode.Uri.joinPath(dirUri, name);
      const children = await this.buildTree(childUri, childRel);
      const caseCount = await this.countYamlFiles(childUri);
      nodes.push({
        type: "folder",
        name,
        display_name: displayNameFromSanitized(name),
        directory_path: childRel,
        is_project: false,
        case_count: caseCount,
        children: children.length > 0 ? children : undefined,
      });
    }
    return nodes;
  }

  private async countYamlFiles(dirUri: vscode.Uri): Promise<number> {
    let count = 0;
    const walk = async (uri: vscode.Uri): Promise<void> => {
      let entries: [string, vscode.FileType][];
      try {
        entries = await vscode.workspace.fs.readDirectory(uri);
      } catch {
        return;
      }
      for (const [name, type] of entries) {
        if (name === ARCHIVE_SEGMENT || name.startsWith(".")) continue;
        const child = vscode.Uri.joinPath(uri, name);
        if (type === vscode.FileType.File && /\.ya?ml$/i.test(name)) {
          count += 1;
        } else if (type === vscode.FileType.Directory) {
          await walk(child);
        }
      }
    };
    await walk(dirUri);
    return count;
  }

  async listWikiPages(options: {
    directory?: string | null;
  } = {}): Promise<YamlWikiListResponse> {
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      return { total: 0, items: [] };
    }

    const directory =
      options.directory?.trim().replace(/\\/g, "/") || WIKI_ROOT;
    assertUnderWikiRoot(directory);

    const globPattern = joinRepoPath(directory, "**/*.{yaml,yml}");
    const pattern = new vscode.RelativePattern(resolved.folder, globPattern);
    const files = await vscode.workspace.findFiles(
      pattern,
      `**/${ARCHIVE_SEGMENT}/**`,
      10000,
    );

    const items: YamlWikiListItem[] = [];
    for (const fileUri of files.sort((a, b) => a.fsPath.localeCompare(b.fsPath))) {
      const rel = toRepoRelativePath(resolved.folder, fileUri);
      if (rel.includes(`/${ARCHIVE_SEGMENT}/`)) continue;
      try {
        const bytes = await vscode.workspace.fs.readFile(fileUri);
        const parsed = parseWikiYamlFrontMatterOnly(
          Buffer.from(bytes).toString("utf8"),
          rel,
        );
        if (!parsed) continue;
        items.push({
          page_id: parsed.page_id,
          title: parsed.title,
          tags: parsed.tags,
          status: parsed.status,
          file_path: rel,
          directory: parsed.directory,
        });
      } catch {
        // skip
      }
    }
    items.sort((a, b) =>
      (a.title || a.page_id).localeCompare(b.title || b.page_id),
    );
    return { total: items.length, items };
  }

  async getWikiDetail(filePath: string): Promise<YamlWikiDetail | null> {
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      return null;
    }
    const norm = filePath.replace(/\\/g, "/");
    assertUnderWikiRoot(norm);
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    const bytes = await vscode.workspace.fs.readFile(fileUri);
    return parseWikiYaml(Buffer.from(bytes).toString("utf8"), norm);
  }

  async createWikiFolder(
    parentPath: string,
    folderName: string,
  ): Promise<{ directory_path: string }> {
    const parent = (parentPath.trim() || WIKI_ROOT).replace(/\\/g, "/");
    const name = sanitizeNameForPath(folderName);
    if (!isValidName(name)) {
      throw new Error("Invalid folder name.");
    }
    assertUnderWikiRoot(parent);
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    await vscode.workspace.fs.createDirectory(resolved.wikiRootUri);
    const childRel = joinRepoPath(parent, name);
    const childUri = vscode.Uri.joinPath(resolved.folder.uri, childRel);
    await vscode.workspace.fs.createDirectory(childUri);
    const keepUri = vscode.Uri.joinPath(childUri, ".gitkeep");
    try {
      await vscode.workspace.fs.stat(keepUri);
    } catch {
      await vscode.workspace.fs.writeFile(keepUri, Buffer.from("", "utf8"));
    }
    return { directory_path: childRel };
  }

  private async allocatePageId(
    folder: vscode.WorkspaceFolder,
  ): Promise<string> {
    for (let attempt = 0; attempt < 40; attempt++) {
      const id = randomWikiId();
      const pattern = new vscode.RelativePattern(
        folder,
        joinRepoPath(WIKI_ROOT, `**/${id}.yaml`),
      );
      const hits = await vscode.workspace.findFiles(pattern, undefined, 1);
      if (hits.length === 0) {
        return id;
      }
    }
    throw new Error("Could not allocate a unique wiki page id");
  }

  async createWikiPage(
    payload: CreateWikiPagePayload,
  ): Promise<{ file_path: string; page_id: string }> {
    const directory = (payload.directory?.trim() || WIKI_ROOT).replace(
      /\\/g,
      "/",
    );
    assertUnderWikiRoot(directory);
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.joinPath(resolved.folder.uri, directory),
    );

    const pageId = await this.allocatePageId(resolved.folder);
    const fileRel = joinRepoPath(directory, `${pageId}.yaml`);
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, fileRel);

    const detail: YamlWikiDetail = {
      page_id: pageId,
      title: payload.title?.trim() || "Untitled",
      tags: payload.tags ?? [],
      status: payload.status ?? "draft",
      file_path: fileRel,
      body: payload.body?.trim() || "",
      directory,
    };
    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(serializeWikiYaml(detail), "utf8"),
    );
    return { file_path: fileRel, page_id: pageId };
  }

  async updateWikiPage(
    filePath: string,
    payload: UpdateWikiPagePayload,
  ): Promise<{ file_path: string }> {
    const norm = filePath.replace(/\\/g, "/");
    assertUnderWikiRoot(norm);
    const existing = await this.getWikiDetail(norm);
    if (!existing) {
      throw new Error(`Wiki page not found: ${norm}`);
    }
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }

    const merged: YamlWikiDetail = {
      ...existing,
      title: payload.title !== undefined ? payload.title : existing.title,
      tags: payload.tags !== undefined ? payload.tags : existing.tags,
      status: payload.status !== undefined ? payload.status : existing.status,
      body: payload.body !== undefined ? payload.body : existing.body,
    };

    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(serializeWikiYaml(merged), "utf8"),
    );
    return { file_path: norm };
  }

  async deleteWikiPage(filePath: string): Promise<{ deleted: string }> {
    const norm = filePath.replace(/\\/g, "/");
    assertUnderWikiRoot(norm);
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    try {
      await vscode.workspace.fs.stat(fileUri);
    } catch {
      throw new Error(`Wiki page not found: ${norm}`);
    }
    await vscode.workspace.fs.delete(fileUri);
    return { deleted: norm };
  }

  async deleteWikiFolder(folderPath: string): Promise<{ folder_path: string }> {
    const norm = folderPath.replace(/\\/g, "/").replace(/\/+$/, "");
    assertUnderWikiRoot(norm);
    if (norm === WIKI_ROOT) {
      throw new Error("Cannot delete wiki root");
    }
    const resolved = await resolveWikiRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    const uri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    await vscode.workspace.fs.delete(uri, { recursive: true });
    return { folder_path: norm };
  }
}
