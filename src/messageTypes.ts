export const CASES_ROOT = ".gitoza-lite/test/cases";
export const RUNS_ROOT = ".gitoza-lite/test/run";
export const TICKETS_ROOT = ".gitoza-lite/tasks/tickets";
export const WIKI_ROOT = ".gitoza-lite/wiki";

export type RunCaseResult = "pending" | "passed" | "failed" | "skipped";

export interface RunYamlCase {
  path: string;
  result: RunCaseResult;
}

export interface RunDetail {
  run_id: string;
  file_path: string;
  title?: string;
  cases: RunCaseRow[];
}

export interface RunListItem {
  run_id: string;
  title?: string;
  file_path: string;
  case_count: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
}

export interface RunCaseRow extends RunYamlCase {
  case_id: string;
  title?: string;
  /** Alias of path for list row components */
  file_path: string;
}

export interface Comment {
  author: string;
  timestamp: string;
  text: string;
}

export interface YamlCaseDetail {
  case_id: string;
  title?: string;
  tags: string[];
  status?: string;
  priority?: string;
  file_path: string;
  body: string;
  /** Parsed from file when present; not written on save */
  approve_status?: string;
  updated_at?: string;
  updated_by?: string;
  approved_by?: string;
  approved_at?: string;
  requirement_id?: string;
  assigned_to?: string;
  automated: boolean;
  /** Parsed from file when present; not written on save */
  comments?: Comment[];
  params: Record<string, string>;
}

export interface YamlCaseListItem {
  case_id: string;
  title?: string;
  tags: string[];
  status?: string;
  priority?: string;
  file_path: string;
  directory?: string;
  /** Parsed from file when present; not written on save */
  approve_status?: string;
  updated_at?: string;
  updated_by?: string;
  approved_by?: string;
  approved_at?: string;
  requirement_id?: string;
  assigned_to?: string;
  automated: boolean;
}

export interface YamlCaseListResponse {
  total: number;
  items: YamlCaseListItem[];
}

export interface RepositoryTreeNode {
  type: string;
  name: string;
  display_name: string;
  children?: RepositoryTreeNode[];
  directory_path?: string;
  is_project: boolean;
  case_count: number;
}

export interface CreateTestCasePayload {
  directory: string;
  case_id: string;
  title?: string;
  priority?: string;
  tags?: string[];
  body?: string;
  requirement_id?: string;
  assigned_to?: string;
  automated?: boolean;
  params?: Record<string, string>;
  target_folder?: string;
}

export interface UpdateCasePayload {
  title?: string;
  priority?: string;
  tags?: string[];
  body?: string;
  status?: string;
  requirement_id?: string;
  assigned_to?: string;
  automated?: boolean;
  params?: Record<string, string>;
}

/** Tickets */
export type TicketType = "bug" | "story" | "task" | "spike";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "in_testing"
  | "blocked"
  | "done"
  | "cancelled";

export interface YamlTicketDetail {
  ticket_id: string;
  title?: string;
  tags: string[];
  type: TicketType;
  status: TicketStatus;
  priority?: string;
  assigned_to?: string;
  reporter?: string;
  sprint?: string;
  release?: string;
  params: Record<string, string>;
  file_path: string;
  body: string;
  project?: string;
}

export interface YamlTicketListItem {
  ticket_id: string;
  title?: string;
  tags: string[];
  type: TicketType;
  status: TicketStatus;
  priority?: string;
  assigned_to?: string;
  reporter?: string;
  sprint?: string;
  release?: string;
  file_path: string;
  project?: string;
}

export interface YamlTicketListResponse {
  total: number;
  items: YamlTicketListItem[];
}

export interface TicketProjectInfo {
  name: string;
  display_name: string;
  project_path: string;
  ticket_prefix: string;
  ticket_count: number;
}

export interface CreateTicketPayload {
  project: string;
  title?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: string;
  tags?: string[];
  body?: string;
  assigned_to?: string;
  reporter?: string;
  sprint?: string;
  release?: string;
  params?: Record<string, string>;
}

export interface UpdateTicketPayload {
  title?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: string;
  tags?: string[];
  body?: string;
  assigned_to?: string;
  reporter?: string;
  sprint?: string;
  release?: string;
  params?: Record<string, string>;
}

/** Releases */
export type ReleaseStatus = "open" | "shipped" | "cancelled";

export interface YamlReleaseDetail {
  release_id: string;
  name: string;
  status: ReleaseStatus;
  file_path: string;
  body: string;
  project?: string;
  stem?: string;
}

export interface YamlReleaseListItem {
  release_id: string;
  name: string;
  status: ReleaseStatus;
  file_path: string;
  project?: string;
  stem?: string;
}

export interface CreateReleasePayload {
  project: string;
  name: string;
  status?: ReleaseStatus;
  body?: string;
}

export interface UpdateReleasePayload {
  name?: string;
  status?: ReleaseStatus;
  body?: string;
}

/** Wiki */
export type WikiStatus = "draft" | "published" | "outdated";

export interface YamlWikiDetail {
  page_id: string;
  title?: string;
  tags: string[];
  status: WikiStatus;
  file_path: string;
  body: string;
  directory?: string;
}

export interface YamlWikiListItem {
  page_id: string;
  title?: string;
  tags: string[];
  status: WikiStatus;
  file_path: string;
  directory?: string;
}

export interface YamlWikiListResponse {
  total: number;
  items: YamlWikiListItem[];
}

export interface CreateWikiPagePayload {
  directory: string;
  title?: string;
  tags?: string[];
  status?: WikiStatus;
  body?: string;
}

export interface UpdateWikiPagePayload {
  title?: string;
  tags?: string[];
  status?: WikiStatus;
  body?: string;
}

export type WebviewRequestType =
  | "ready"
  | "getRepositoryTree"
  | "listCases"
  | "getCaseDetail"
  | "createProject"
  | "createFolder"
  | "createCase"
  | "updateCase"
  | "initializeCasesRoot"
  | "listRuns"
  | "getRunDetail"
  | "createRun"
  | "updateRunTitle"
  | "addRunCases"
  | "removeRunCase"
  | "setRunCaseResult"
  | "setRunCaseResults"
  | "deleteRun"
  | "initializeRunsRoot"
  | "deleteCase"
  | "deleteFolder"
  | "deleteProject"
  | "renameFolder"
  | "findRunsReferencingCases"
  | "initializeTicketsRoot"
  | "listTicketProjects"
  | "createTicketProject"
  | "listTickets"
  | "getTicketDetail"
  | "createTicket"
  | "updateTicket"
  | "deleteTicket"
  | "deleteTicketProject"
  | "listReleases"
  | "getReleaseDetail"
  | "createRelease"
  | "updateRelease"
  | "deleteRelease"
  | "initializeWikiRoot"
  | "getWikiTree"
  | "listWikiPages"
  | "getWikiDetail"
  | "createWikiFolder"
  | "createWikiPage"
  | "updateWikiPage"
  | "deleteWikiPage"
  | "deleteWikiFolder";

export interface WebviewRequest {
  type: WebviewRequestType;
  requestId: string;
  payload?: Record<string, unknown>;
}

export interface WebviewResponse {
  type: "response";
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface WebviewInitMessage {
  type: "init";
  theme: "light" | "dark";
  casesRoot: string | null;
  workspaceName: string | null;
  hasCasesRoot: boolean;
  runsRoot: string | null;
  hasRunsRoot: boolean;
  ticketsRoot: string | null;
  hasTicketsRoot: boolean;
  wikiRoot: string | null;
  hasWikiRoot: boolean;
}

export interface CasesUpdatedMessage {
  type: "casesUpdated";
}

export interface RunsUpdatedMessage {
  type: "runsUpdated";
}

export interface TicketsUpdatedMessage {
  type: "ticketsUpdated";
}

export interface WikiUpdatedMessage {
  type: "wikiUpdated";
}

export interface ThemeChangedMessage {
  type: "themeChanged";
  theme: "light" | "dark";
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type HostToWebviewMessage =
  | WebviewInitMessage
  | WebviewResponse
  | CasesUpdatedMessage
  | RunsUpdatedMessage
  | TicketsUpdatedMessage
  | WikiUpdatedMessage
  | ThemeChangedMessage
  | ErrorMessage;
