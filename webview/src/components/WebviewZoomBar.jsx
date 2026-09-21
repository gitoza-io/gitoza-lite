import { Minus, Plus } from "lucide-react";
import Tooltip from "./Tooltip";
import { UI_SCALE_MAX, UI_SCALE_MIN } from "../utils/webviewZoom";

/**
 * Bottom-right zoom control for webview-only UI scale.
 *
 * @param {{
 *   scale: number;
 *   onZoomIn: () => void;
 *   onZoomOut: () => void;
 *   onReset: () => void;
 * }} props
 */
export default function WebviewZoomBar({ scale, onZoomIn, onZoomOut, onReset }) {
  const percent = Math.round(scale * 100);
  const canZoomOut = scale > UI_SCALE_MIN;
  const canZoomIn = scale < UI_SCALE_MAX;

  const btnClass =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100";

  return (
    <div
      className="fixed bottom-4 right-4 z-[210] flex items-center gap-0.5 rounded-ui border border-slate-200 bg-white/95 px-1 py-0.5 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
      role="group"
      aria-label="UI zoom"
    >
      <Tooltip label="Zoom out" placement="top">
        <button
          type="button"
          className={btnClass}
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip label="Reset zoom" placement="top">
        <button
          type="button"
          className="min-w-[2.75rem] rounded px-1.5 py-1 text-center text-[11px] font-semibold tabular-nums text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          onClick={onReset}
          aria-label={`Reset zoom (currently ${percent}%)`}
        >
          {percent}%
        </button>
      </Tooltip>
      <Tooltip label="Zoom in" placement="top">
        <button
          type="button"
          className={btnClass}
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </Tooltip>
    </div>
  );
}
