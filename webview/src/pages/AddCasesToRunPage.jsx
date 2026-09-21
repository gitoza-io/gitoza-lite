import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CaseReadOnlyDetailPanel from "../components/CaseReadOnlyDetailPanel";
import RepositoryFolderTree from "../components/RepositoryFolderTree";
import RepositoryVirtualCaseList from "../components/RepositoryVirtualCaseList";
import SidebarSection from "../components/SidebarSection";
import TestRepositoryThreeColumnLayout from "../components/TestRepositoryThreeColumnLayout";
import TreeToolbar from "../components/TreeToolbar";
import { useLazyRepositoryTree } from "../hooks/useLazyRepositoryTree";
import { usePickerBrowseState } from "../hooks/usePickerBrowseState";
import { getCaseDetail, getCases, getRunDetail } from "../services/api";
import {
  normalizeCaseFilePath,
  toggleProjectSelection,
  toggleSuiteSelection,
} from "../utils/casePickerSelection";
import { findFolderDisplayName } from "../utils/caseTree";
import { patchRepositoryTreeForActiveCaseRemovals } from "../utils/patchRepositoryTree";

const ACTIVE_REPO = "vscode";

const PICKER_STORAGE_KEYS = {
  treeWidth: "casePicker.col.treeWidth",
  listWidth: "casePicker.col.listWidth",
};

/**
 * Full-page "Add test cases to run": three-column picker (folder tree | case list | detail).
 * Only cases not already in the run are shown.
 */
export default function AddCasesToRunPage({
  runId,
  runName,
  onDone,
  onCancel,
}) {
  const { repositoryTree, projectsReady, treeStructureLoadingPrefixes } =
    useLazyRepositoryTree(ACTIVE_REPO);

  const [selectedFilePaths, setSelectedFilePaths] = useState(() => new Set());
  const [selectedCaseFilePath, setSelectedCaseFilePath] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [existingCasePathsInRun, setExistingCasePathsInRun] = useState(() => new Set());
  const [pickerLoading, setPickerLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const caseDetailFetchIdRef = useRef(0);

  useEffect(() => {
    if (!runId) {
      setExistingCasePathsInRun(new Set());
      setPickerLoading(false);
      return;
    }
    let cancelled = false;
    setPickerLoading(true);
    getRunDetail(runId)
      .then((detail) => {
        if (cancelled) return;
        const paths = new Set(
          (detail?.cases ?? [])
            .map((c) => normalizeCaseFilePath(c.file_path))
            .filter(Boolean),
        );
        setExistingCasePathsInRun(paths);
      })
      .catch(() => {
        if (!cancelled) setExistingCasePathsInRun(new Set());
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  useEffect(() => {
    setSelectedFilePaths((prev) => {
      const next = new Set(
        [...prev].filter((p) => !existingCasePathsInRun.has(normalizeCaseFilePath(p))),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [existingCasePathsInRun]);

  const filterPath = useCallback(
    (filePath) => !existingCasePathsInRun.has(normalizeCaseFilePath(filePath)),
    [existingCasePathsInRun],
  );

  const pickerTree = useMemo(() => {
    if (!repositoryTree?.length) return [];
    const paths = [...existingCasePathsInRun];
    if (!paths.length) return repositoryTree;
    return patchRepositoryTreeForActiveCaseRemovals(repositoryTree, paths).tree;
  }, [repositoryTree, existingCasePathsInRun]);

  const {
    selectedFolderPath,
    expanded,
    setExpanded,
    handleSelectBrowseFolder,
  } = usePickerBrowseState({
    tree: pickerTree,
    selectedCaseFilePath,
    enabled: !pickerLoading && projectsReady,
  });

  useEffect(() => {
    if (!selectedFolderPath) {
      setCases([]);
      return;
    }
    let cancelled = false;
    setCasesLoading(true);
    getCases(ACTIVE_REPO, { directory: selectedFolderPath })
      .then((res) => {
        if (cancelled) return;
        const items = (res?.items ?? []).filter((row) => filterPath(row.file_path));
        setCases(items);
      })
      .catch(() => {
        if (!cancelled) setCases([]);
      })
      .finally(() => {
        if (!cancelled) setCasesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFolderPath, filterPath]);

  const pickerRows = useMemo(
    () => cases.filter((row) => filterPath(row.file_path)),
    [cases, filterPath],
  );

  const loadCasesForPrefix = useCallback(
    async (directoryPath) => {
      const res = await getCases(ACTIVE_REPO, { path_prefix: directoryPath });
      return (res?.items ?? []).filter((row) => filterPath(row.file_path));
    },
    [filterPath],
  );

  const handleToggleCase = useCallback((filePath) => {
    const norm = normalizeCaseFilePath(filePath);
    if (!norm) return;
    setSelectedFilePaths((prev) => {
      const next = new Set(prev);
      if (next.has(norm)) next.delete(norm);
      else next.add(norm);
      return next;
    });
  }, []);

  const handleToggleProject = useCallback(
    async (node) => {
      if (!node?.directory_path) return;
      await toggleProjectSelection({
        directoryPath: node.directory_path,
        rows: pickerRows,
        setSelectedFilePaths,
        loadCasesForPrefix,
        filterPath,
      });
    },
    [pickerRows, loadCasesForPrefix, filterPath],
  );

  const handleToggleSuite = useCallback(
    async (node) => {
      if (!node?.directory_path) return;
      await toggleSuiteSelection({
        directoryPath: node.directory_path,
        rows: pickerRows,
        setSelectedFilePaths,
        loadCasesForPrefix,
        filterPath,
      });
    },
    [pickerRows, loadCasesForPrefix, filterPath],
  );

  const handleSelectCase = useCallback(async (row) => {
    const nextPath = row?.file_path ?? null;
    setSelectedCaseFilePath(nextPath);
    if (!nextPath) {
      setCaseDetail(null);
      setDetailLoading(false);
      return;
    }
    const fetchId = ++caseDetailFetchIdRef.current;
    setDetailLoading(true);
    try {
      const detail = await getCaseDetail(nextPath, ACTIVE_REPO);
      if (caseDetailFetchIdRef.current !== fetchId) return;
      setCaseDetail(detail);
    } catch {
      if (caseDetailFetchIdRef.current !== fetchId) return;
      setCaseDetail(row);
    } finally {
      if (caseDetailFetchIdRef.current === fetchId) {
        setDetailLoading(false);
      }
    }
  }, []);

  const handleDone = useCallback(async () => {
    if (selectedFilePaths.size === 0 || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onDone([...selectedFilePaths]);
    } catch (err) {
      setError(err?.message || "Failed to add cases");
      setSubmitting(false);
    }
  }, [selectedFilePaths, submitting, onDone]);

  const folderLabel = findFolderDisplayName(pickerTree, selectedFolderPath);
  const selectedCount = selectedFilePaths.size;
  const nothingLeftToAdd = !pickerLoading && projectsReady && pickerTree.length === 0;

  const cancelDoneButtons = (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => void handleDone()}
        disabled={selectedCount === 0 || submitting || nothingLeftToAdd}
        className="rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? "Adding…" : `Done (${selectedCount})`}
      </button>
    </div>
  );

  const treeColumnBody = pickerLoading ? (
    <div className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
  ) : nothingLeftToAdd ? (
    <div className="px-3 py-6 text-center text-sm text-slate-600 dark:text-slate-400">
      All cases in the repository are already in this run.
    </div>
  ) : (
    <RepositoryFolderTree
      tree={pickerTree}
      projectsReady={projectsReady}
      treeStructureLoadingPrefixes={treeStructureLoadingPrefixes}
      selectedFolderPath={selectedFolderPath}
      onSelectFolder={handleSelectBrowseFolder}
      expanded={expanded}
      onExpandedChange={setExpanded}
      pickerMode
      pickerRows={pickerRows}
      selectedFilePaths={selectedFilePaths}
      onToggleProject={handleToggleProject}
      onToggleSuite={handleToggleSuite}
      filterPath={filterPath}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TestRepositoryThreeColumnLayout
        storageKeys={PICKER_STORAGE_KEYS}
        treeColumn={
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
              <SidebarSection
                title={runName ? `Add cases — ${runName}` : "Add cases"}
                toolbar={
                  <TreeToolbar
                    sortButton={null}
                    searchNode={null}
                    trailingActions={cancelDoneButtons}
                  />
                }
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{treeColumnBody}</div>
            {error ? (
              <p className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </div>
        }
        caseListColumn={
          pickerLoading || nothingLeftToAdd ? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-slate-500 dark:text-slate-400">
              {pickerLoading ? "Loading…" : "Nothing left to add"}
            </div>
          ) : (
            <RepositoryVirtualCaseList
              cases={pickerRows}
              loading={casesLoading}
              selectedCaseFilePath={selectedCaseFilePath}
              onSelectCase={handleSelectCase}
              folderPath={selectedFolderPath}
              listTitle={folderLabel}
              showNoFolderWhenEmpty
              emptyMessage="No cases in this folder"
              pickerMode
              selectedFilePaths={selectedFilePaths}
              onToggleCase={handleToggleCase}
            />
          )
        }
        detailColumn={
          <CaseReadOnlyDetailPanel
            selectedCaseFilePath={selectedCaseFilePath}
            caseDetail={caseDetail}
            caseDetailLoading={detailLoading}
            reviewEnabled={false}
            repoSlug={ACTIVE_REPO}
          />
        }
      />
    </div>
  );
}
