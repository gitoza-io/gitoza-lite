import { useEffect, useRef } from "react";
import {
  UI_SCALE_DEFAULT,
  applyUiScale,
  readUiScale,
  stepUiScale,
  writeUiScale,
} from "../utils/webviewZoom";

function isZoomModifier(e) {
  return Boolean(e.ctrlKey || e.metaKey);
}

/**
 * Webview-only UI zoom: Ctrl/Cmd ± / 0 and Ctrl/Cmd + wheel.
 * Persists scale in localStorage; does not affect VS Code zoom.
 */
export function useWebviewZoom() {
  const scaleRef = useRef(UI_SCALE_DEFAULT);

  useEffect(() => {
    const initial = readUiScale();
    scaleRef.current = initial;
    applyUiScale(initial);

    const setScale = (next) => {
      const applied = applyUiScale(next);
      scaleRef.current = applied;
      writeUiScale(applied);
      return applied;
    };

    const onKeyDown = (e) => {
      if (!isZoomModifier(e)) return;
      const key = e.key;
      if (key === "=" || key === "+" || key === "Add") {
        e.preventDefault();
        setScale(stepUiScale(scaleRef.current, 1));
        return;
      }
      if (key === "-" || key === "_" || key === "Subtract") {
        e.preventDefault();
        setScale(stepUiScale(scaleRef.current, -1));
        return;
      }
      if (key === "0" || key === "Digit0" || key === "Numpad0") {
        e.preventDefault();
        setScale(UI_SCALE_DEFAULT);
      }
    };

    const onWheel = (e) => {
      if (!isZoomModifier(e)) return;
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      setScale(stepUiScale(scaleRef.current, direction));
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("wheel", onWheel, true);
    };
  }, []);
}

export default useWebviewZoom;
