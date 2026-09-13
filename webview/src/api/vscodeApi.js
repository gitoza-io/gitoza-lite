const vscodeApi = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

let requestCounter = 0;
const pending = new Map();

let initPayload = null;
const initListeners = new Set();
let casesUpdatedListeners = new Set();
let runsUpdatedListeners = new Set();
let ticketsUpdatedListeners = new Set();
let wikiUpdatedListeners = new Set();
let themeChangedListeners = new Set();

function applyInitPayload(payload) {
  if (!payload || payload.type !== "init") return;
  initPayload = payload;
  for (const fn of initListeners) fn(payload);
}

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg?.type) return;

    if (msg.type === "init") {
      applyInitPayload(msg);
      return;
    }

    if (msg.type === "casesUpdated") {
      for (const fn of casesUpdatedListeners) fn();
      return;
    }

    if (msg.type === "runsUpdated") {
      for (const fn of runsUpdatedListeners) fn();
      return;
    }

    if (msg.type === "ticketsUpdated") {
      for (const fn of ticketsUpdatedListeners) fn();
      return;
    }

    if (msg.type === "wikiUpdated") {
      for (const fn of wikiUpdatedListeners) fn();
      return;
    }

    if (msg.type === "themeChanged") {
      for (const fn of themeChangedListeners) fn(msg.theme);
      return;
    }

    if (msg.type === "response" && msg.requestId) {
      const entry = pending.get(msg.requestId);
      if (!entry) return;
      pending.delete(msg.requestId);
      if (msg.ok) {
        entry.resolve(msg.data);
      } else {
        entry.reject(new Error(msg.error || "Request failed"));
      }
    }
  });
}

function request(type, payload = {}) {
  return new Promise((resolve, reject) => {
    const requestId = `req-${++requestCounter}`;
    pending.set(requestId, { resolve, reject });
    const message = { type, requestId, payload };
    if (vscodeApi) {
      vscodeApi.postMessage(message);
    } else if (import.meta.env?.DEV) {
      console.warn("[vscodeApi] not in webview", message);
      pending.delete(requestId);
      reject(new Error("VS Code API not available"));
    } else {
      pending.delete(requestId);
      reject(new Error("VS Code API not available"));
    }
  });
}

export function onInit(listener) {
  initListeners.add(listener);
  if (initPayload) listener(initPayload);
  return () => initListeners.delete(listener);
}

export function onCasesUpdated(listener) {
  casesUpdatedListeners.add(listener);
  return () => casesUpdatedListeners.delete(listener);
}

export function onRunsUpdated(listener) {
  runsUpdatedListeners.add(listener);
  return () => runsUpdatedListeners.delete(listener);
}

export function onTicketsUpdated(listener) {
  ticketsUpdatedListeners.add(listener);
  return () => ticketsUpdatedListeners.delete(listener);
}

export function onWikiUpdated(listener) {
  wikiUpdatedListeners.add(listener);
  return () => wikiUpdatedListeners.delete(listener);
}

export function onThemeChanged(listener) {
  themeChangedListeners.add(listener);
  return () => themeChangedListeners.delete(listener);
}

export function getInitPayload() {
  return initPayload;
}

export async function ready() {
  const data = await request("ready");
  applyInitPayload(data);
  return data;
}

export const getRepositoryTree = () => request("getRepositoryTree");

export const getCases = (params = {}) => request("listCases", params);

export const getCaseDetail = (filePath) =>
  request("getCaseDetail", { filePath });

export const updateCase = (filePath, payload) =>
  request("updateCase", { filePath, payload });

export const createTestCase = (payload) => request("createCase", payload);

export const createProject = (projectName) =>
  request("createProject", { name: projectName });

export const createFolder = (parentPath, folderName) =>
  request("createFolder", { parentPath, name: folderName });

export const initializeCasesRoot = () => request("initializeCasesRoot");

export const listRuns = () => request("listRuns");

export const getRunDetail = (runId) => request("getRunDetail", { runId });

export const createRun = (runId, title) =>
  request("createRun", { runId, title });

export const updateRunTitle = (runId, title) =>
  request("updateRunTitle", { runId, title });

export const addRunCases = (runId, paths) =>
  request("addRunCases", { runId, paths });

export const removeRunCase = (runId, path) =>
  request("removeRunCase", { runId, path });

export const setRunCaseResult = (runId, path, result) =>
  request("setRunCaseResult", { runId, path, result });

export const saveRunResults = (runId, updates) =>
  request("setRunCaseResults", { runId, updates });

export const deleteRun = (runId) => request("deleteRun", { runId });

export const initializeRunsRoot = () => request("initializeRunsRoot");

export const initializeTicketsRoot = () => request("initializeTicketsRoot");
export const listTicketProjects = () => request("listTicketProjects");
export const createTicketProject = (name) =>
  request("createTicketProject", { name });
export const listTickets = (params = {}) => request("listTickets", params);
export const getTicketDetail = (filePath) =>
  request("getTicketDetail", { filePath });
export const createTicket = (payload) => request("createTicket", payload);
export const updateTicket = (filePath, payload) =>
  request("updateTicket", { filePath, payload });
export const deleteTicket = (filePath) =>
  request("deleteTicket", { filePath });
export const deleteTicketProject = (projectPath) =>
  request("deleteTicketProject", { projectPath });

export const listReleases = (params = {}) => request("listReleases", params);
export const getReleaseDetail = (filePath) =>
  request("getReleaseDetail", { filePath });
export const createRelease = (payload) => request("createRelease", payload);
export const updateRelease = (filePath, payload) =>
  request("updateRelease", { filePath, payload });
export const deleteRelease = (filePath) =>
  request("deleteRelease", { filePath });

export const initializeWikiRoot = () => request("initializeWikiRoot");
export const getWikiTree = () => request("getWikiTree");
export const listWikiPages = (params = {}) => request("listWikiPages", params);
export const getWikiDetail = (filePath) =>
  request("getWikiDetail", { filePath });
export const createWikiFolder = (parentPath, name) =>
  request("createWikiFolder", { parentPath, name });
export const createWikiPage = (payload) => request("createWikiPage", payload);
export const updateWikiPage = (filePath, payload) =>
  request("updateWikiPage", { filePath, payload });
export const deleteWikiPage = (filePath) =>
  request("deleteWikiPage", { filePath });
export const deleteWikiFolder = (folderPath) =>
  request("deleteWikiFolder", { folderPath });

// Stubs for vendored components that reference desktop-only APIs
export const listCaseTemplates = async () => ({ items: [] });
export const getCaseTemplateContent = async () => ({ content: "" });
export const saveCaseTemplate = async () => ({ status: "ok" });
export const saveTestAsset = async () => {
  throw new Error("Image assets are not supported in the VS Code preview extension.");
};
export const getWorkspaceUsernames = async () => ({ usernames: [] });
export const getCaseFilters = async () => ({
  tags: [],
  param_keys: [],
  param_values_by_key: {},
});
export const postCaseComment = async () => {
  throw new Error("Comments are read-only in the VS Code preview extension.");
};
export const deleteCaseComment = async () => {
  throw new Error("Comments are read-only in the VS Code preview extension.");
};
export const archiveCase = async () => {
  throw new Error("Archive is not available in the VS Code preview extension.");
};
export const deleteCase = (filePaths) =>
  request("deleteCase", { filePaths: Array.isArray(filePaths) ? filePaths : [filePaths] });
export const renameCase = async () => {
  throw new Error("Rename is not available in the VS Code preview extension.");
};
export const renameFolder = (folderPath, name) =>
  request("renameFolder", { folderPath, name });
export const deleteFolder = (folderPath) =>
  request("deleteFolder", { folderPath });
export const deleteProject = (projectPath) =>
  request("deleteProject", { projectPath });
export const findRunsReferencingCases = (paths) =>
  request("findRunsReferencingCases", { paths });
export const archiveFolder = async () => {
  throw new Error("Archive is not available in the VS Code preview extension.");
};
export const restoreFolder = async () => {
  throw new Error("Archive is not available in the VS Code preview extension.");
};
export const restoreCase = async () => {
  throw new Error("Archive is not available in the VS Code preview extension.");
};
export const moveCase = async () => {
  throw new Error("Move is not available in the VS Code preview extension.");
};
export const deleteLocalAsset = async () => ({ status: "ok" });
export const getDashboardSummary = async () => ({ projects: [] });
export const invoke = async () => {
  throw new Error("Tauri invoke is not available in VS Code extension.");
};
