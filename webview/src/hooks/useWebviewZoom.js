import { useCallback, useEffect, useState } from "react";
import {
  UI_SCALE_DEFAULT,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  applyUiScale,
  readUiScale,
  stepUiScale,
  writeUiScale,
} from "../utils/webviewZoom";

function isZoomModifier(e) {
  return Boolean(e.ctrlKey || e.metaKey);
}

function commitNext(next) {
  const applied = applyUiScale(next);
  writeUiScale(applied);
  return applied;
}

/**
 * Webview-only UI zoom: Ctrl/Cmd + wheel, plus bar APIs.
 * No keyboard ± (conflicts with VS Code on Mac). Persists in localStorage.
 *
 * @returns {{
 *   scale: number;
 *   zoomIn: () => void;
 *   zoomOut: () => void;
 *   resetZoom: () => void;
 * }}
 */
export function useWebviewZoom() {
  const [scale, setScale] = useState(() => readUiScale());

  useEffect(() => {
    applyUiScale(scale);
  }, [scale]);

  useEffect(() => {
    const onWheel = (e) => {
      if (!isZoomModifier(e)) return;
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      setScale((prev) => commitNext(stepUiScale(prev, direction)));
    };

    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel, true);
    };
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => commitNext(stepUiScale(prev, 1)));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => commitNext(stepUiScale(prev, -1)));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(commitNext(UI_SCALE_DEFAULT));
  }, []);

  return {
    scale,
    zoomIn,
    zoomOut,
    resetZoom,
    canZoomIn: scale < UI_SCALE_MAX,
    canZoomOut: scale > UI_SCALE_MIN,
  };
}

export default useWebviewZoom;
