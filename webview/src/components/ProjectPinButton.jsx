import { Pin } from "lucide-react";
import Tooltip from "./Tooltip";

/**
 * Hover-revealed pin control shown before a project count badge.
 *
 * @param {{
 *   pinned: boolean;
 *   onToggle: () => void;
 * }} props
 */
export default function ProjectPinButton({ pinned, onToggle }) {
  return (
    <Tooltip label={pinned ? "Unpin project" : "Pin project to top"} placement="bottom">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 ${
          pinned
            ? "text-indigo-600 opacity-100 dark:text-indigo-400"
            : "opacity-0 group-hover:opacity-100"
        }`}
        aria-label={pinned ? "Unpin project" : "Pin project to top"}
      >
        <Pin className={`h-3 w-3 ${pinned ? "fill-current" : ""}`} aria-hidden />
      </button>
    </Tooltip>
  );
}
