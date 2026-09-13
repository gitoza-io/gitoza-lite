import {
  createFolder as createFolderRequest,
  createProject as createProjectRequest,
  createTestCase,
  getCaseDetail as getCaseDetailRequest,
  getCases as listCasesRequest,
  getRepositoryTree as getRepositoryTreeRequest,
  updateCase as updateCaseRequest,
  initializeCasesRoot,
  onCasesUpdated,
  onRunsUpdated,
  onInit,
  ready,
  getInitPayload,
  listCaseTemplates,
  getCaseTemplateContent,
  saveCaseTemplate,
  saveTestAsset,
  getWorkspaceUsernames,
  getCaseFilters,
  postCaseComment,
  deleteCaseComment,
  archiveCase,
  deleteCase,
  renameCase,
  renameFolder,
  deleteFolder,
  deleteProject,
  findRunsReferencingCases,
  archiveFolder,
  restoreFolder,
  restoreCase,
  moveCase,
  getDashboardSummary,
  invoke,
  deleteLocalAsset,
  listRuns as listRunsRequest,
  getRunDetail as getRunDetailRequest,
  createRun as createRunRequest,
  updateRunTitle as updateRunTitleRequest,
  addRunCases as addRunCasesRequest,
  removeRunCase as removeRunCaseRequest,
  setRunCaseResult as setRunCaseResultRequest,
  saveRunResults as saveRunResultsRequest,
  deleteRun as deleteRunRequest,
  initializeRunsRoot,
  onTicketsUpdated,
  onWikiUpdated,
  initializeTicketsRoot,
  listTicketProjects as listTicketProjectsRequest,
  createTicketProject as createTicketProjectRequest,
  listTickets as listTicketsRequest,
  getTicketDetail as getTicketDetailRequest,
  createTicket as createTicketRequest,
  updateTicket as updateTicketRequest,
  deleteTicket as deleteTicketRequest,
  deleteTicketProject as deleteTicketProjectRequest,
  listReleases as listReleasesRequest,
  getReleaseDetail as getReleaseDetailRequest,
  createRelease as createReleaseRequest,
  updateRelease as updateReleaseRequest,
  deleteRelease as deleteReleaseRequest,
  initializeWikiRoot,
  getWikiTree as getWikiTreeRequest,
  listWikiPages as listWikiPagesRequest,
  getWikiDetail as getWikiDetailRequest,
  createWikiFolder as createWikiFolderRequest,
  createWikiPage as createWikiPageRequest,
  updateWikiPage as updateWikiPageRequest,
  deleteWikiPage as deleteWikiPageRequest,
  deleteWikiFolder as deleteWikiFolderRequest,
} from "../api/vscodeApi.js";

export {
  onCasesUpdated,
  onRunsUpdated,
  onTicketsUpdated,
  onWikiUpdated,
  onInit,
  ready,
  getInitPayload,
  initializeCasesRoot,
  initializeRunsRoot,
  initializeTicketsRoot,
  initializeWikiRoot,
  listCaseTemplates,
  getCaseTemplateContent,
  saveCaseTemplate,
  saveTestAsset,
  deleteLocalAsset,
  getWorkspaceUsernames,
  getCaseFilters,
  postCaseComment,
  deleteCaseComment,
  archiveCase,
  deleteCase,
  renameCase,
  renameFolder,
  deleteFolder,
  deleteProject,
  findRunsReferencingCases,
  archiveFolder,
  restoreFolder,
  restoreCase,
  moveCase,
  getDashboardSummary,
  invoke,
};

export const getRepositoryTree = async (_projectOrOptions = undefined, _repoSlug = null) => {
  return getRepositoryTreeRequest();
};

export const getCases = async (repoSlug = null, extraParams = {}) => {
  if (!repoSlug) {
    return { items: [], total: 0 };
  }
  const params = {
    directory: extraParams.directory || null,
    path_prefix: extraParams.path_prefix || extraParams.pathPrefix || null,
    status: extraParams.status || null,
    priority: extraParams.priority || null,
    tag: extraParams.tag || null,
    approve_status: extraParams.approve_status || extraParams.approveStatus || null,
    updated_by: extraParams.updated_by || extraParams.updatedBy || null,
    assigned_to: extraParams.assigned_to || extraParams.assignedTo || null,
    automated: extraParams.automated,
    search: extraParams.search || null,
    limit: extraParams.limit,
    offset: extraParams.offset,
  };
  return listCasesRequest(params);
};

export const getCaseDetail = (filePath, _repoSlug = null) =>
  getCaseDetailRequest(filePath);

export const updateCase = (filePath, payload, _repoSlug = null) =>
  updateCaseRequest(filePath, payload);

export const createProject = (projectName, _repoSlug = null) =>
  createProjectRequest(projectName);

export const createFolder = (parentPath, folderName, _repoSlug = null) =>
  createFolderRequest(parentPath, folderName);

export { createTestCase };

export const listRuns = () => listRunsRequest();

export const getRunDetail = (runId) => getRunDetailRequest(runId);

export const createRun = (runId, title) => createRunRequest(runId, title);

export const updateRunTitle = (runId, title) =>
  updateRunTitleRequest(runId, title);

export const addRunCases = (runId, paths) => addRunCasesRequest(runId, paths);

export const removeRunCase = (runId, path) =>
  removeRunCaseRequest(runId, path);

export const setRunCaseResult = (runId, path, result) =>
  setRunCaseResultRequest(runId, path, result);

export const saveRunResults = (runId, updates) =>
  saveRunResultsRequest(runId, updates);

export const deleteRun = (runId) => deleteRunRequest(runId);

export const listTicketProjects = () => listTicketProjectsRequest();
export const createTicketProject = (name) => createTicketProjectRequest(name);
export const listTickets = (params = {}) => listTicketsRequest(params);
export const getTicketDetail = (filePath) => getTicketDetailRequest(filePath);
export const createTicket = (payload) => createTicketRequest(payload);
export const updateTicket = (filePath, payload) =>
  updateTicketRequest(filePath, payload);
export const deleteTicket = (filePath) => deleteTicketRequest(filePath);
export const deleteTicketProject = (projectPath) =>
  deleteTicketProjectRequest(projectPath);

export const listReleases = (params = {}) => listReleasesRequest(params);
export const getReleaseDetail = (filePath) => getReleaseDetailRequest(filePath);
export const createRelease = (payload) => createReleaseRequest(payload);
export const updateRelease = (filePath, payload) =>
  updateReleaseRequest(filePath, payload);
export const deleteRelease = (filePath) => deleteReleaseRequest(filePath);

export const getWikiTree = () => getWikiTreeRequest();
export const listWikiPages = (params = {}) => listWikiPagesRequest(params);
export const getWikiDetail = (filePath) => getWikiDetailRequest(filePath);
export const createWikiFolder = (parentPath, name) =>
  createWikiFolderRequest(parentPath, name);
export const createWikiPage = (payload) => createWikiPageRequest(payload);
export const updateWikiPage = (filePath, payload) =>
  updateWikiPageRequest(filePath, payload);
export const deleteWikiPage = (filePath) => deleteWikiPageRequest(filePath);
export const deleteWikiFolder = (folderPath) =>
  deleteWikiFolderRequest(folderPath);
