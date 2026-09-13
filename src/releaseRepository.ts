import * as vscode from "vscode";
import type {
  CreateReleasePayload,
  UpdateReleasePayload,
  YamlReleaseDetail,
  YamlReleaseListItem,
} from "./messageTypes";
import { TICKETS_ROOT } from "./messageTypes";
import {
  assertUnderTicketsRoot,
  isValidName,
  joinRepoPath,
  resolveTicketsRootUri,
  sanitizeNameForPath,
  toRepoRelativePath,
} from "./workspace";
import {
  parseReleaseYaml,
  serializeReleaseYaml,
  slugifyReleaseStem,
} from "./yamlReleaseIO";

export class ReleaseRepository {
  async listReleases(options: {
    project?: string | null;
  } = {}): Promise<YamlReleaseListItem[]> {
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      return [];
    }

    const project = options.project?.trim();
    const globPattern = project
      ? joinRepoPath(TICKETS_ROOT, project, "releases", "*.yaml")
      : joinRepoPath(TICKETS_ROOT, "*/releases/*.yaml");
    const pattern = new vscode.RelativePattern(resolved.folder, globPattern);
    const files = await vscode.workspace.findFiles(pattern, undefined, 5000);

    const items: YamlReleaseListItem[] = [];
    for (const fileUri of files.sort((a, b) => a.fsPath.localeCompare(b.fsPath))) {
      const rel = toRepoRelativePath(resolved.folder, fileUri);
      try {
        const bytes = await vscode.workspace.fs.readFile(fileUri);
        const parsed = parseReleaseYaml(
          Buffer.from(bytes).toString("utf8"),
          rel,
        );
        if (!parsed) continue;
        items.push({
          release_id: parsed.release_id,
          name: parsed.name,
          status: parsed.status,
          file_path: rel,
          project: parsed.project,
          stem: parsed.stem,
        });
      } catch {
        // skip
      }
    }
    items.sort((a, b) => a.release_id.localeCompare(b.release_id));
    return items;
  }

  async getReleaseDetail(filePath: string): Promise<YamlReleaseDetail | null> {
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      return null;
    }
    const norm = filePath.replace(/\\/g, "/");
    assertUnderTicketsRoot(norm);
    if (!norm.includes("/releases/")) {
      throw new Error("Not a release path");
    }
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    const bytes = await vscode.workspace.fs.readFile(fileUri);
    return parseReleaseYaml(Buffer.from(bytes).toString("utf8"), norm);
  }

  async createRelease(
    payload: CreateReleasePayload,
  ): Promise<{ file_path: string; release_id: string }> {
    const project = sanitizeNameForPath(payload.project);
    if (!isValidName(project)) {
      throw new Error("Invalid project name");
    }
    const name = payload.name?.trim();
    if (!name) {
      throw new Error("Release name is required");
    }
    const stem = slugifyReleaseStem(name);
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }

    const releasesDir = joinRepoPath(TICKETS_ROOT, project, "releases");
    assertUnderTicketsRoot(releasesDir);
    const releasesUri = vscode.Uri.joinPath(resolved.folder.uri, releasesDir);
    await vscode.workspace.fs.createDirectory(releasesUri);

    const fileRel = joinRepoPath(releasesDir, `${stem}.yaml`);
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, fileRel);
    try {
      await vscode.workspace.fs.stat(fileUri);
      throw new Error(`Release '${stem}' already exists.`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("already exists")) {
        throw e;
      }
    }

    const releaseId = `${project}/${stem}`;
    const detail: YamlReleaseDetail = {
      release_id: releaseId,
      name,
      status: payload.status ?? "open",
      file_path: fileRel,
      body: payload.body?.trim() || "",
      project,
      stem,
    };
    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(serializeReleaseYaml(detail), "utf8"),
    );
    return { file_path: fileRel, release_id: releaseId };
  }

  async updateRelease(
    filePath: string,
    payload: UpdateReleasePayload,
  ): Promise<{ file_path: string }> {
    const norm = filePath.replace(/\\/g, "/");
    const existing = await this.getReleaseDetail(norm);
    if (!existing) {
      throw new Error(`Release not found: ${norm}`);
    }
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }

    const merged: YamlReleaseDetail = {
      ...existing,
      name: payload.name !== undefined ? payload.name : existing.name,
      status: payload.status !== undefined ? payload.status : existing.status,
      body: payload.body !== undefined ? payload.body : existing.body,
    };

    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(serializeReleaseYaml(merged), "utf8"),
    );
    return { file_path: norm };
  }

  async deleteRelease(filePath: string): Promise<{ deleted: string }> {
    const norm = filePath.replace(/\\/g, "/");
    assertUnderTicketsRoot(norm);
    if (!norm.includes("/releases/")) {
      throw new Error("Not a release path");
    }
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    try {
      await vscode.workspace.fs.stat(fileUri);
    } catch {
      throw new Error(`Release not found: ${norm}`);
    }
    await vscode.workspace.fs.delete(fileUri);
    return { deleted: norm };
  }
}
