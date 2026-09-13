import * as vscode from "vscode";
import { CaseRepository } from "./caseRepository";
import { RunRepository } from "./runRepository";
import { TicketRepository } from "./ticketRepository";
import { ReleaseRepository } from "./releaseRepository";
import { WikiRepository } from "./wikiRepository";
import { registerLauncherTree } from "./launcherTree";
import { GitozaWebviewPanel } from "./webviewPanel";

let caseRepo: CaseRepository;
let runRepo: RunRepository;
let ticketRepo: TicketRepository;
let releaseRepo: ReleaseRepository;
let wikiRepo: WikiRepository;

export function activate(context: vscode.ExtensionContext): void {
  caseRepo = new CaseRepository();
  runRepo = new RunRepository(caseRepo);
  ticketRepo = new TicketRepository();
  releaseRepo = new ReleaseRepository();
  wikiRepo = new WikiRepository();

  const openGitoza = () => {
    GitozaWebviewPanel.createOrShow(
      context.extensionUri,
      caseRepo,
      runRepo,
      ticketRepo,
      releaseRepo,
      wikiRepo,
    );
  };

  const openCommand = vscode.commands.registerCommand(
    "gitoza.openTestRepository",
    openGitoza,
  );

  context.subscriptions.push(
    openCommand,
    registerLauncherTree(context, openGitoza),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      GitozaWebviewPanel.currentPanel?.notifyCasesUpdated();
      GitozaWebviewPanel.currentPanel?.notifyRunsUpdated();
      GitozaWebviewPanel.currentPanel?.notifyTicketsUpdated();
      GitozaWebviewPanel.currentPanel?.notifyWikiUpdated();
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      void GitozaWebviewPanel.currentPanel?.sendInit();
    }),
  );

  openGitoza();
}

export function deactivate(): void {
  // panels dispose themselves
}
