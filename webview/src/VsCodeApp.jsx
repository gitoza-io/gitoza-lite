import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import TestRepositoryPage from "./pages/TestRepositoryPage";
import TestRunPage from "./pages/TestRunPage";
import TicketsPage from "./pages/TicketsPage";
import ReleasesPage from "./pages/ReleasesPage";
import WikiPage from "./pages/WikiPage";
import { getInitPayload, onInit, onThemeChanged, ready } from "./api/vscodeApi";

export default function VsCodeApp() {
  const [activeView, setActiveView] = useState("explorer");
  const [hasCasesRoot, setHasCasesRoot] = useState(
    () => getInitPayload()?.hasCasesRoot ?? false,
  );
  const [hasRunsRoot, setHasRunsRoot] = useState(
    () => getInitPayload()?.hasRunsRoot ?? false,
  );
  const [hasTicketsRoot, setHasTicketsRoot] = useState(
    () => getInitPayload()?.hasTicketsRoot ?? false,
  );
  const [hasWikiRoot, setHasWikiRoot] = useState(
    () => getInitPayload()?.hasWikiRoot ?? false,
  );
  const [theme, setTheme] = useState(() => getInitPayload()?.theme ?? "light");
  const [runResultsDirty, setRunResultsDirty] = useState(false);
  const leaveTestRunRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    void ready();
    const offInit = onInit((init) => {
      setHasCasesRoot(Boolean(init.hasCasesRoot));
      setHasRunsRoot(Boolean(init.hasRunsRoot));
      setHasTicketsRoot(Boolean(init.hasTicketsRoot));
      setHasWikiRoot(Boolean(init.hasWikiRoot));
      setTheme(init.theme === "dark" ? "dark" : "light");
    });
    const offTheme = onThemeChanged((nextTheme) => {
      setTheme(nextTheme === "dark" ? "dark" : "light");
    });
    return () => {
      offInit();
      offTheme();
    };
  }, []);

  const handleChangeView = useCallback((view) => {
    if (activeView === "testrun" && view !== "testrun" && runResultsDirty) {
      leaveTestRunRef.current?.(() => setActiveView(view));
      return;
    }
    setActiveView(view);
  }, [activeView, runResultsDirty]);

  const registerLeaveTestRunHandler = useCallback((handler) => {
    leaveTestRunRef.current = handler;
  }, []);

  const handleCasesRootInitialized = useCallback(() => {
    setHasCasesRoot(true);
  }, []);

  const handleRunsRootInitialized = useCallback(() => {
    setHasRunsRoot(true);
  }, []);

  const handleTicketsRootInitialized = useCallback(() => {
    setHasTicketsRoot(true);
  }, []);

  const handleWikiRootInitialized = useCallback(() => {
    setHasWikiRoot(true);
  }, []);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white dark:bg-slate-950">
      <Sidebar activeView={activeView} onChangeView={handleChangeView} />
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {activeView === "explorer" ? (
          <TestRepositoryPage
            hasCasesRoot={hasCasesRoot}
            onCasesRootInitialized={handleCasesRootInitialized}
          />
        ) : activeView === "testrun" ? (
          <TestRunPage
            hasCasesRoot={hasCasesRoot}
            hasRunsRoot={hasRunsRoot}
            onRunsRootInitialized={handleRunsRootInitialized}
            onDirtyChange={setRunResultsDirty}
            registerLeaveHandler={registerLeaveTestRunHandler}
          />
        ) : activeView === "tickets" ? (
          <TicketsPage
            hasTicketsRoot={hasTicketsRoot}
            onTicketsRootInitialized={handleTicketsRootInitialized}
          />
        ) : activeView === "releases" ? (
          <ReleasesPage
            hasTicketsRoot={hasTicketsRoot}
            onTicketsRootInitialized={handleTicketsRootInitialized}
          />
        ) : activeView === "wiki" ? (
          <WikiPage
            hasWikiRoot={hasWikiRoot}
            onWikiRootInitialized={handleWikiRootInitialized}
          />
        ) : null}
      </main>
    </div>
  );
}
