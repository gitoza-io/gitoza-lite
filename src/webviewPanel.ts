import * as vscode from "vscode";
import type { CaseRepository } from "./caseRepository";
import type { RunRepository } from "./runRepository";
import type { TicketRepository } from "./ticketRepository";
import type { ReleaseRepository } from "./releaseRepository";
import type { WikiRepository } from "./wikiRepository";
import type {
  CreateReleasePayload,
  CreateTicketPayload,
  CreateTestCasePayload,
  CreateWikiPagePayload,
  HostToWebviewMessage,
  RunCaseResult,
  UpdateCasePayload,
  UpdateReleasePayload,
  UpdateTicketPayload,
  UpdateWikiPagePayload,
  WebviewRequest,
} from "./messageTypes";
import { CASES_ROOT, RUNS_ROOT, TICKETS_ROOT, WIKI_ROOT } from "./messageTypes";
import {
  hasCasesRoot,
  hasRunsRoot,
  hasTicketsRoot,
  hasWikiRoot,
  resolveCasesRootUri,
  resolveRunsRootUri,
  resolveTicketsRootUri,
  resolveWikiRootUri,
} from "./workspace";

async function handleWebviewRequest(
  caseRepo: CaseRepository,
  runRepo: RunRepository,
  ticketRepo: TicketRepository,
  releaseRepo: ReleaseRepository,
  wikiRepo: WikiRepository,
  message: WebviewRequest,
): Promise<unknown> {
  switch (message.type) {
    case "ready":
      return buildInitPayload();
    case "getRepositoryTree":
      return caseRepo.getRepositoryTree();
    case "listCases":
      return caseRepo.listCases(
        (message.payload ?? {}) as {
          directory?: string;
          path_prefix?: string;
        },
      );
    case "getCaseDetail":
      return caseRepo.getCaseDetail(String(message.payload?.filePath ?? ""));
    case "createProject":
      return caseRepo.createProject(String(message.payload?.name ?? ""));
    case "createFolder":
      return caseRepo.createFolder(
        String(message.payload?.parentPath ?? ""),
        String(message.payload?.name ?? ""),
      );
    case "createCase":
      return caseRepo.createCase(
        message.payload as unknown as CreateTestCasePayload,
      );
    case "updateCase":
      return caseRepo.updateCase(
        String(message.payload?.filePath ?? ""),
        (message.payload?.payload ?? {}) as UpdateCasePayload,
      );
    case "initializeCasesRoot":
      return { casesRoot: await caseRepo.initializeCasesRoot() };
    case "listRuns":
      return runRepo.listRuns();
    case "getRunDetail":
      return runRepo.getRunDetail(String(message.payload?.runId ?? ""));
    case "createRun":
      return runRepo.createRun(
        String(message.payload?.runId ?? ""),
        message.payload?.title != null
          ? String(message.payload.title)
          : undefined,
      );
    case "updateRunTitle":
      return runRepo.updateRunTitle(
        String(message.payload?.runId ?? ""),
        String(message.payload?.title ?? ""),
      );
    case "addRunCases":
      return runRepo.addRunCases(
        String(message.payload?.runId ?? ""),
        (message.payload?.paths as string[]) ?? [],
      );
    case "removeRunCase":
      return runRepo.removeRunCase(
        String(message.payload?.runId ?? ""),
        String(message.payload?.path ?? ""),
      );
    case "setRunCaseResult":
      return runRepo.setRunCaseResult(
        String(message.payload?.runId ?? ""),
        String(message.payload?.path ?? ""),
        String(message.payload?.result ?? "pending") as RunCaseResult,
      );
    case "setRunCaseResults":
      return runRepo.setRunCaseResults(
        String(message.payload?.runId ?? ""),
        ((message.payload?.updates as { path: string; result: string }[]) ?? []).map(
          (u) => ({
            path: String(u.path ?? ""),
            result: String(u.result ?? "pending") as RunCaseResult,
          }),
        ),
      );
    case "deleteRun":
      await runRepo.deleteRun(String(message.payload?.runId ?? ""));
      return { ok: true };
    case "deleteCase":
      return caseRepo.deleteCase(
        (message.payload?.filePaths as string[]) ?? [],
      );
    case "deleteFolder":
      return caseRepo.deleteFolder(String(message.payload?.folderPath ?? ""));
    case "deleteProject":
      return caseRepo.deleteProject(String(message.payload?.projectPath ?? ""));
    case "renameFolder": {
      const result = await caseRepo.renameFolder(
        String(message.payload?.folderPath ?? ""),
        String(message.payload?.name ?? ""),
      );
      if (result.old_path !== result.new_path) {
        await runRepo.remapCasePathsPrefix(result.old_path, result.new_path);
      }
      return result;
    }
    case "findRunsReferencingCases":
      return runRepo.findRunsReferencingPaths(
        (message.payload?.paths as string[]) ?? [],
      );
    case "initializeRunsRoot":
      return { runsRoot: await runRepo.initializeRunsRoot() };

    case "initializeTicketsRoot":
      return { ticketsRoot: await ticketRepo.initializeTicketsRoot() };
    case "listTicketProjects":
      return ticketRepo.listTicketProjects();
    case "createTicketProject":
      return ticketRepo.createTicketProject(String(message.payload?.name ?? ""));
    case "listTickets":
      return ticketRepo.listTickets(
        (message.payload ?? {}) as { project?: string; release?: string },
      );
    case "getTicketDetail":
      return ticketRepo.getTicketDetail(String(message.payload?.filePath ?? ""));
    case "createTicket":
      return ticketRepo.createTicket(
        message.payload as unknown as CreateTicketPayload,
      );
    case "updateTicket":
      return ticketRepo.updateTicket(
        String(message.payload?.filePath ?? ""),
        (message.payload?.payload ?? {}) as UpdateTicketPayload,
      );
    case "deleteTicket":
      return ticketRepo.deleteTicket(String(message.payload?.filePath ?? ""));
    case "deleteTicketProject":
      return ticketRepo.deleteTicketProject(
        String(message.payload?.projectPath ?? ""),
      );

    case "listReleases":
      return releaseRepo.listReleases(
        (message.payload ?? {}) as { project?: string },
      );
    case "getReleaseDetail":
      return releaseRepo.getReleaseDetail(
        String(message.payload?.filePath ?? ""),
      );
    case "createRelease":
      return releaseRepo.createRelease(
        message.payload as unknown as CreateReleasePayload,
      );
    case "updateRelease":
      return releaseRepo.updateRelease(
        String(message.payload?.filePath ?? ""),
        (message.payload?.payload ?? {}) as UpdateReleasePayload,
      );
    case "deleteRelease":
      return releaseRepo.deleteRelease(String(message.payload?.filePath ?? ""));

    case "initializeWikiRoot":
      return { wikiRoot: await wikiRepo.initializeWikiRoot() };
    case "getWikiTree":
      return wikiRepo.getWikiTree();
    case "listWikiPages":
      return wikiRepo.listWikiPages(
        (message.payload ?? {}) as { directory?: string },
      );
    case "getWikiDetail":
      return wikiRepo.getWikiDetail(String(message.payload?.filePath ?? ""));
    case "createWikiFolder":
      return wikiRepo.createWikiFolder(
        String(message.payload?.parentPath ?? WIKI_ROOT),
        String(message.payload?.name ?? ""),
      );
    case "createWikiPage":
      return wikiRepo.createWikiPage(
        message.payload as unknown as CreateWikiPagePayload,
      );
    case "updateWikiPage":
      return wikiRepo.updateWikiPage(
        String(message.payload?.filePath ?? ""),
        (message.payload?.payload ?? {}) as UpdateWikiPagePayload,
      );
    case "deleteWikiPage":
      return wikiRepo.deleteWikiPage(String(message.payload?.filePath ?? ""));
    case "deleteWikiFolder":
      return wikiRepo.deleteWikiFolder(
        String(message.payload?.folderPath ?? ""),
      );

    default:
      throw new Error(`Unknown request type: ${(message as WebviewRequest).type}`);
  }
}

function getWebviewTheme(): "light" | "dark" {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Dark ||
    kind === vscode.ColorThemeKind.HighContrast
    ? "dark"
    : "light";
}

async function buildInitPayload() {
  const casesResolved = await resolveCasesRootUri();
  const runsResolved = await resolveRunsRootUri();
  const ticketsResolved = await resolveTicketsRootUri();
  const wikiResolved = await resolveWikiRootUri();
  const hasCases = await hasCasesRoot();
  const hasRuns = await hasRunsRoot();
  const hasTickets = await hasTicketsRoot();
  const hasWiki = await hasWikiRoot();
  const theme = getWebviewTheme();
  return {
    type: "init" as const,
    theme,
    casesRoot: casesResolved?.casesRootRel ?? null,
    workspaceName:
      casesResolved?.folder.name ??
      ticketsResolved?.folder.name ??
      wikiResolved?.folder.name ??
      runsResolved?.folder.name ??
      null,
    hasCasesRoot: hasCases,
    runsRoot: runsResolved?.runsRootRel ?? null,
    hasRunsRoot: hasRuns,
    ticketsRoot: ticketsResolved?.ticketsRootRel ?? null,
    hasTicketsRoot: hasTickets,
    wikiRoot: wikiResolved?.wikiRootRel ?? null,
    hasWikiRoot: hasWiki,
  };
}

function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  title: string,
): string {
  // Bust webview asset cache so rebuilt Tickets/Wiki/Releases UI loads after F5 / reload.
  const cacheBust = String(Date.now());
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", "assets", "index.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", "assets", "index.css"),
  );
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data: blob:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html {
      --gitoza-ui-scale: 1;
      font-size: calc(var(--vscode-font-size, 13px) * var(--gitoza-ui-scale));
    }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #root { height: 100%; }
  </style>
  <link rel="stylesheet" href="${styleUri}?v=${cacheBust}">
  <title>${title}</title>
</head>
<body class="vscode-host">
  <div id="root"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}?v=${cacheBust}"></script>
</body>
</html>`;
}

export class GitozaWebviewPanel {
  public static currentPanel: GitozaWebviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly caseRepo: CaseRepository;
  private readonly runRepo: RunRepository;
  private readonly ticketRepo: TicketRepository;
  private readonly releaseRepo: ReleaseRepository;
  private readonly wikiRepo: WikiRepository;
  private disposables: vscode.Disposable[] = [];
  private casesWatcher: vscode.FileSystemWatcher | undefined;
  private runsWatcher: vscode.FileSystemWatcher | undefined;
  private ticketsWatcher: vscode.FileSystemWatcher | undefined;
  private wikiWatcher: vscode.FileSystemWatcher | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    caseRepo: CaseRepository,
    runRepo: RunRepository,
    ticketRepo: TicketRepository,
    releaseRepo: ReleaseRepository,
    wikiRepo: WikiRepository,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.caseRepo = caseRepo;
    this.runRepo = runRepo;
    this.ticketRepo = ticketRepo;
    this.releaseRepo = releaseRepo;
    this.wikiRepo = wikiRepo;

    this.panel.webview.html = getWebviewHtml(
      this.panel.webview,
      this.extensionUri,
      "Gitoza Lite",
    );
    this.setupMessageHandler(this.panel.webview);
    this.setupWatcher();
    this.setupThemeListener();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    caseRepo: CaseRepository,
    runRepo: RunRepository,
    ticketRepo: TicketRepository,
    releaseRepo: ReleaseRepository,
    wikiRepo: WikiRepository,
  ): void {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (GitozaWebviewPanel.currentPanel) {
      GitozaWebviewPanel.currentPanel.panel.reveal(column);
      GitozaWebviewPanel.currentPanel.reloadWebview();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "gitozaLite",
      "Gitoza Lite",
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "dist", "webview"),
        ],
      },
    );

    GitozaWebviewPanel.currentPanel = new GitozaWebviewPanel(
      panel,
      extensionUri,
      caseRepo,
      runRepo,
      ticketRepo,
      releaseRepo,
      wikiRepo,
    );
  }

  private setupMessageHandler(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(
      async (message: WebviewRequest) => {
        if (!message?.requestId || !message?.type) {
          return;
        }
        try {
          const data = await handleWebviewRequest(
            this.caseRepo,
            this.runRepo,
            this.ticketRepo,
            this.releaseRepo,
            this.wikiRepo,
            message,
          );
          this.postMessage({
            type: "response",
            requestId: message.requestId,
            ok: true,
            data,
          });
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Unknown error";
          this.postMessage({
            type: "response",
            requestId: message.requestId,
            ok: false,
            error: errorMsg,
          });
        }
      },
      null,
      this.disposables,
    );
  }

  public async sendInit(): Promise<void> {
    this.postMessage(await buildInitPayload());
  }

  /** Force HTML + assets reload (picks up new webview builds). */
  public reloadWebview(): void {
    this.panel.webview.html = getWebviewHtml(
      this.panel.webview,
      this.extensionUri,
      "Gitoza Lite",
    );
  }

  private setupThemeListener(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        this.postMessage({
          type: "themeChanged",
          theme: getWebviewTheme(),
        });
      }),
    );
  }

  private setupWatcher(): void {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return;
    }
    const casesPattern = new vscode.RelativePattern(
      folder,
      `${CASES_ROOT}/**`,
    );
    this.casesWatcher = vscode.workspace.createFileSystemWatcher(casesPattern);
    const notifyCases = () => {
      this.postMessage({ type: "casesUpdated" });
    };
    this.casesWatcher.onDidCreate(notifyCases, null, this.disposables);
    this.casesWatcher.onDidChange(notifyCases, null, this.disposables);
    this.casesWatcher.onDidDelete(notifyCases, null, this.disposables);

    const runsPattern = new vscode.RelativePattern(
      folder,
      `${RUNS_ROOT}/**`,
    );
    this.runsWatcher = vscode.workspace.createFileSystemWatcher(runsPattern);
    const notifyRuns = () => {
      this.postMessage({ type: "runsUpdated" });
    };
    this.runsWatcher.onDidCreate(notifyRuns, null, this.disposables);
    this.runsWatcher.onDidChange(notifyRuns, null, this.disposables);
    this.runsWatcher.onDidDelete(notifyRuns, null, this.disposables);

    const ticketsPattern = new vscode.RelativePattern(
      folder,
      `${TICKETS_ROOT}/**`,
    );
    this.ticketsWatcher =
      vscode.workspace.createFileSystemWatcher(ticketsPattern);
    const notifyTickets = () => {
      this.postMessage({ type: "ticketsUpdated" });
    };
    this.ticketsWatcher.onDidCreate(notifyTickets, null, this.disposables);
    this.ticketsWatcher.onDidChange(notifyTickets, null, this.disposables);
    this.ticketsWatcher.onDidDelete(notifyTickets, null, this.disposables);

    const wikiPattern = new vscode.RelativePattern(folder, `${WIKI_ROOT}/**`);
    this.wikiWatcher = vscode.workspace.createFileSystemWatcher(wikiPattern);
    const notifyWiki = () => {
      this.postMessage({ type: "wikiUpdated" });
    };
    this.wikiWatcher.onDidCreate(notifyWiki, null, this.disposables);
    this.wikiWatcher.onDidChange(notifyWiki, null, this.disposables);
    this.wikiWatcher.onDidDelete(notifyWiki, null, this.disposables);
  }

  private postMessage(message: HostToWebviewMessage): void {
    void this.panel.webview.postMessage(message);
  }

  public notifyCasesUpdated(): void {
    this.postMessage({ type: "casesUpdated" });
  }

  public notifyRunsUpdated(): void {
    this.postMessage({ type: "runsUpdated" });
  }

  public notifyTicketsUpdated(): void {
    this.postMessage({ type: "ticketsUpdated" });
  }

  public notifyWikiUpdated(): void {
    this.postMessage({ type: "wikiUpdated" });
  }

  private dispose(): void {
    GitozaWebviewPanel.currentPanel = undefined;
    this.casesWatcher?.dispose();
    this.runsWatcher?.dispose();
    this.ticketsWatcher?.dispose();
    this.wikiWatcher?.dispose();
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
