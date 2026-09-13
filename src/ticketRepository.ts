import * as vscode from "vscode";
import type {
  CreateTicketPayload,
  TicketProjectInfo,
  UpdateTicketPayload,
  YamlTicketDetail,
  YamlTicketListItem,
  YamlTicketListResponse,
} from "./messageTypes";
import { TICKETS_ROOT } from "./messageTypes";
import {
  assertUnderTicketsRoot,
  displayNameFromSanitized,
  isValidName,
  joinRepoPath,
  resolveTicketsRootUri,
  sanitizeNameForPath,
  toRepoRelativePath,
} from "./workspace";
import {
  deriveTicketPrefix,
  parseProjectYaml,
  parseTicketYaml,
  parseTicketYamlFrontMatterOnly,
  randomTicketSuffix,
  serializeProjectYaml,
  serializeTicketYaml,
} from "./yamlTicketIO";

const RESERVED_PROJECT_NAMES = new Set([".archive", "releases"]);

export class TicketRepository {
  async initializeTicketsRoot(): Promise<string> {
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    await vscode.workspace.fs.createDirectory(resolved.ticketsRootUri);
    return TICKETS_ROOT;
  }

  async listTicketProjects(): Promise<TicketProjectInfo[]> {
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      return [];
    }
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(resolved.ticketsRootUri);
    } catch {
      return [];
    }

    const projects: TicketProjectInfo[] = [];
    for (const [name, type] of entries) {
      if (type !== vscode.FileType.Directory) continue;
      if (RESERVED_PROJECT_NAMES.has(name) || name.startsWith(".")) continue;
      const projectPath = joinRepoPath(TICKETS_ROOT, name);
      const prefix = await this.readProjectPrefix(resolved.folder, projectPath, name);
      const ticketCount = await this.countTicketsInProject(
        vscode.Uri.joinPath(resolved.ticketsRootUri, name),
      );
      projects.push({
        name,
        display_name: displayNameFromSanitized(name),
        project_path: projectPath,
        ticket_prefix: prefix,
        ticket_count: ticketCount,
      });
    }
    projects.sort((a, b) => a.name.localeCompare(b.name));
    return projects;
  }

  private async readProjectPrefix(
    folder: vscode.WorkspaceFolder,
    projectPath: string,
    projectName: string,
  ): Promise<string> {
    const metaUri = vscode.Uri.joinPath(
      folder.uri,
      joinRepoPath(projectPath, ".project.yaml"),
    );
    try {
      const bytes = await vscode.workspace.fs.readFile(metaUri);
      return parseProjectYaml(Buffer.from(bytes).toString("utf8")).ticket_prefix;
    } catch {
      return deriveTicketPrefix(projectName);
    }
  }

  private async countTicketsInProject(projectUri: vscode.Uri): Promise<number> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(projectUri);
    } catch {
      return 0;
    }
    let count = 0;
    for (const [name, type] of entries) {
      if (type === vscode.FileType.File && /\.ya?ml$/i.test(name) && !name.startsWith(".")) {
        count += 1;
      }
    }
    return count;
  }

  async createTicketProject(
    projectName: string,
  ): Promise<{ project_path: string; ticket_prefix: string }> {
    const name = sanitizeNameForPath(projectName);
    if (!isValidName(name) || RESERVED_PROJECT_NAMES.has(name)) {
      throw new Error(
        "Invalid project name. Use only letters, numbers, underscores, and hyphens.",
      );
    }
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    await vscode.workspace.fs.createDirectory(resolved.ticketsRootUri);

    const existing = await this.listTicketProjects();
    const usedPrefixes = new Set(existing.map((p) => p.ticket_prefix.toUpperCase()));
    let prefix = deriveTicketPrefix(name);
    let n = 1;
    while (usedPrefixes.has(prefix)) {
      const base = deriveTicketPrefix(name).slice(0, 3);
      prefix = `${base}${n}`.slice(0, 4).toUpperCase();
      n += 1;
    }

    const projectRel = joinRepoPath(TICKETS_ROOT, name);
    const projectUri = vscode.Uri.joinPath(resolved.folder.uri, projectRel);
    try {
      await vscode.workspace.fs.stat(projectUri);
      throw new Error(`Project '${name}' already exists.`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("already exists")) {
        throw e;
      }
    }
    await vscode.workspace.fs.createDirectory(projectUri);
    const metaUri = vscode.Uri.joinPath(projectUri, ".project.yaml");
    await vscode.workspace.fs.writeFile(
      metaUri,
      Buffer.from(serializeProjectYaml(prefix), "utf8"),
    );
    return { project_path: projectRel, ticket_prefix: prefix };
  }

  async listTickets(options: {
    project?: string | null;
    release?: string | null;
  } = {}): Promise<YamlTicketListResponse> {
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      return { total: 0, items: [] };
    }

    const project = options.project?.trim();
    const prefix = project
      ? joinRepoPath(TICKETS_ROOT, project)
      : TICKETS_ROOT;
    assertUnderTicketsRoot(prefix);

    const globPattern = project
      ? joinRepoPath(prefix, "*.yaml")
      : joinRepoPath(TICKETS_ROOT, "*/*.yaml");
    const pattern = new vscode.RelativePattern(resolved.folder, globPattern);
    const files = await vscode.workspace.findFiles(pattern, undefined, 10000);

    const releaseFilter = options.release?.trim();
    const items: YamlTicketListItem[] = [];

    for (const fileUri of files.sort((a, b) => a.fsPath.localeCompare(b.fsPath))) {
      const rel = toRepoRelativePath(resolved.folder, fileUri);
      const base = rel.split("/").pop() ?? "";
      if (base.startsWith(".") || rel.includes("/releases/")) {
        continue;
      }
      try {
        const bytes = await vscode.workspace.fs.readFile(fileUri);
        const content = Buffer.from(bytes).toString("utf8");
        const parsed = parseTicketYamlFrontMatterOnly(content, rel);
        if (!parsed) continue;
        if (releaseFilter && (parsed.release ?? "") !== releaseFilter) {
          continue;
        }
        items.push({
          ticket_id: parsed.ticket_id,
          title: parsed.title,
          tags: parsed.tags,
          type: parsed.type,
          status: parsed.status,
          priority: parsed.priority,
          assigned_to: parsed.assigned_to,
          reporter: parsed.reporter,
          sprint: parsed.sprint,
          release: parsed.release,
          file_path: rel,
          project: parsed.project,
        });
      } catch {
        // skip
      }
    }

    items.sort((a, b) => a.ticket_id.localeCompare(b.ticket_id));
    return { total: items.length, items };
  }

  async getTicketDetail(filePath: string): Promise<YamlTicketDetail | null> {
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      return null;
    }
    const norm = filePath.replace(/\\/g, "/");
    assertUnderTicketsRoot(norm);
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    const bytes = await vscode.workspace.fs.readFile(fileUri);
    const content = Buffer.from(bytes).toString("utf8");
    return parseTicketYaml(content, norm);
  }

  private async allocateTicketId(
    folder: vscode.WorkspaceFolder,
    projectPath: string,
    prefix: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 40; attempt++) {
      const id = `${prefix}-${randomTicketSuffix()}`;
      const fileRel = joinRepoPath(projectPath, `${id}.yaml`);
      const fileUri = vscode.Uri.joinPath(folder.uri, fileRel);
      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        return id;
      }
    }
    throw new Error("Could not allocate a unique ticket id");
  }

  async createTicket(
    payload: CreateTicketPayload,
  ): Promise<{ file_path: string; ticket_id: string }> {
    const project = sanitizeNameForPath(payload.project);
    if (!isValidName(project) || RESERVED_PROJECT_NAMES.has(project)) {
      throw new Error("Invalid ticket project");
    }
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }

    const projectPath = joinRepoPath(TICKETS_ROOT, project);
    assertUnderTicketsRoot(projectPath);
    const projectUri = vscode.Uri.joinPath(resolved.folder.uri, projectPath);
    await vscode.workspace.fs.createDirectory(projectUri);

    const prefix = await this.readProjectPrefix(
      resolved.folder,
      projectPath,
      project,
    );
    const ticketId = await this.allocateTicketId(
      resolved.folder,
      projectPath,
      prefix,
    );
    const fileRel = joinRepoPath(projectPath, `${ticketId}.yaml`);
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, fileRel);

    const detail: YamlTicketDetail = {
      ticket_id: ticketId,
      title: payload.title?.trim() || ticketId,
      tags: payload.tags ?? [],
      type: payload.type ?? "task",
      status: payload.status ?? "open",
      priority: payload.priority?.trim().toLowerCase() || "medium",
      assigned_to: payload.assigned_to?.trim() || undefined,
      reporter: payload.reporter?.trim() || undefined,
      sprint: payload.sprint?.trim() || undefined,
      release: payload.release?.trim() || undefined,
      params: payload.params ?? {},
      file_path: fileRel,
      body: payload.body?.trim() || "",
      project,
    };

    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(serializeTicketYaml(detail), "utf8"),
    );
    return { file_path: fileRel, ticket_id: ticketId };
  }

  async updateTicket(
    filePath: string,
    payload: UpdateTicketPayload,
  ): Promise<{ file_path: string }> {
    const norm = filePath.replace(/\\/g, "/");
    assertUnderTicketsRoot(norm);
    const existing = await this.getTicketDetail(norm);
    if (!existing) {
      throw new Error(`Ticket not found: ${norm}`);
    }
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }

    const merged: YamlTicketDetail = {
      ...existing,
      title: payload.title !== undefined ? payload.title : existing.title,
      type: payload.type !== undefined ? payload.type : existing.type,
      status: payload.status !== undefined ? payload.status : existing.status,
      priority:
        payload.priority !== undefined ? payload.priority : existing.priority,
      tags: payload.tags !== undefined ? payload.tags : existing.tags,
      body: payload.body !== undefined ? payload.body : existing.body,
      assigned_to:
        payload.assigned_to !== undefined
          ? payload.assigned_to
          : existing.assigned_to,
      reporter:
        payload.reporter !== undefined ? payload.reporter : existing.reporter,
      sprint: payload.sprint !== undefined ? payload.sprint : existing.sprint,
      release:
        payload.release !== undefined ? payload.release : existing.release,
      params: payload.params !== undefined ? payload.params : existing.params,
    };

    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(serializeTicketYaml(merged), "utf8"),
    );
    return { file_path: norm };
  }

  async deleteTicket(filePath: string): Promise<{ deleted: string }> {
    const norm = filePath.replace(/\\/g, "/");
    assertUnderTicketsRoot(norm);
    if (norm.includes("/releases/") || norm.endsWith(".project.yaml")) {
      throw new Error("Not a ticket file");
    }
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    const fileUri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    try {
      await vscode.workspace.fs.stat(fileUri);
    } catch {
      throw new Error(`Ticket not found: ${norm}`);
    }
    await vscode.workspace.fs.delete(fileUri);
    return { deleted: norm };
  }

  async deleteTicketProject(projectPath: string): Promise<{ project_path: string }> {
    const norm = projectPath.replace(/\\/g, "/").replace(/\/+$/, "");
    assertUnderTicketsRoot(norm);
    if (norm === TICKETS_ROOT) {
      throw new Error("Cannot delete tickets root");
    }
    const resolved = await resolveTicketsRootUri();
    if (!resolved) {
      throw new Error("No workspace folder open");
    }
    const uri = vscode.Uri.joinPath(resolved.folder.uri, norm);
    await vscode.workspace.fs.delete(uri, { recursive: true });
    return { project_path: norm };
  }
}
