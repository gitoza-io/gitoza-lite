import { Check, Circle, Minus, MinusCircle, X, XCircle } from "lucide-react";

export const RESULT_STYLES = {
  passed: {
    active:
      "bg-[color:var(--vscode-testing-iconPassed)] text-[color:var(--gitoza-on-accent)] ring-1 ring-[color:var(--vscode-testing-iconPassed)]",
    idle: "text-[color:color-mix(in_srgb,var(--vscode-testing-iconPassed)_50%,transparent)] hover:text-[color:var(--vscode-testing-iconPassed)] hover:bg-[color:color-mix(in_srgb,var(--vscode-testing-iconPassed)_15%,transparent)]",
    segmentActive:
      "bg-[color:var(--vscode-testing-iconPassed)] text-[color:var(--gitoza-on-accent)]",
    segmentIdle:
      "bg-transparent text-[color:color-mix(in_srgb,var(--vscode-testing-iconPassed)_45%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--vscode-testing-iconPassed)_15%,transparent)] hover:text-[color:var(--vscode-testing-iconPassed)]",
  },
  failed: {
    active:
      "bg-[color:var(--vscode-errorForeground)] text-[color:var(--gitoza-on-accent)] ring-1 ring-[color:var(--vscode-errorForeground)]",
    idle: "text-[color:color-mix(in_srgb,var(--vscode-errorForeground)_50%,transparent)] hover:text-[color:var(--vscode-errorForeground)] hover:bg-[color:color-mix(in_srgb,var(--vscode-errorForeground)_15%,transparent)]",
    segmentActive:
      "bg-[color:var(--vscode-errorForeground)] text-[color:var(--gitoza-on-accent)]",
    segmentIdle:
      "bg-transparent text-[color:color-mix(in_srgb,var(--vscode-errorForeground)_45%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--vscode-errorForeground)_15%,transparent)] hover:text-[color:var(--vscode-errorForeground)]",
  },
  skipped: {
    active:
      "bg-[color:var(--vscode-descriptionForeground)] text-[color:var(--gitoza-on-accent)] ring-1 ring-[color:var(--vscode-descriptionForeground)]",
    idle: "text-[color:color-mix(in_srgb,var(--vscode-descriptionForeground)_50%,transparent)] hover:text-[color:var(--vscode-descriptionForeground)] hover:bg-[color:color-mix(in_srgb,var(--vscode-foreground)_8%,transparent)]",
    segmentActive:
      "bg-[color:var(--vscode-descriptionForeground)] text-[color:var(--gitoza-on-accent)]",
    segmentIdle:
      "bg-transparent text-[color:color-mix(in_srgb,var(--vscode-descriptionForeground)_50%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--vscode-foreground)_8%,transparent)] hover:text-[color:var(--vscode-descriptionForeground)]",
  },
  pending: {
    active:
      "bg-[color:var(--vscode-editorWarning-foreground)] text-[color:var(--gitoza-on-accent)] ring-1 ring-[color:var(--vscode-editorWarning-foreground)]",
    idle: "text-[color:color-mix(in_srgb,var(--vscode-editorWarning-foreground)_50%,transparent)] hover:text-[color:var(--vscode-editorWarning-foreground)] hover:bg-[color:color-mix(in_srgb,var(--vscode-editorWarning-foreground)_15%,transparent)]",
  },
};

const RESULT_ICON_CONFIG = {
  passed: { Icon: Check, style: RESULT_STYLES.passed.active, title: "Passed" },
  failed: { Icon: XCircle, style: RESULT_STYLES.failed.active, title: "Failed" },
  skipped: { Icon: MinusCircle, style: RESULT_STYLES.skipped.active, title: "Skipped" },
  pending: { Icon: Circle, style: RESULT_STYLES.pending.active, title: "Pending" },
};

const RESULT_SEGMENT_OPTIONS = [
  {
    value: "passed",
    label: "Pass",
    Icon: Check,
    active: RESULT_STYLES.passed.segmentActive,
    idle: RESULT_STYLES.passed.segmentIdle,
  },
  {
    value: "failed",
    label: "Fail",
    Icon: X,
    active: RESULT_STYLES.failed.segmentActive,
    idle: RESULT_STYLES.failed.segmentIdle,
  },
  {
    value: "skipped",
    label: "Skip",
    Icon: Minus,
    active: RESULT_STYLES.skipped.segmentActive,
    idle: RESULT_STYLES.skipped.segmentIdle,
  },
];

const SEGMENT_BASE =
  "flex h-7 w-7 shrink-0 items-center justify-center touch-manipulation active:scale-[0.96] active:duration-0";

function normalizeResult(result) {
  if (!result || result === "pending") return "pending";
  if (RESULT_ICON_CONFIG[result]) return result;
  return "pending";
}

/**
 * Single read-only result icon (Review run list).
 */
export function CaseResultIcon({ result }) {
  const r = normalizeResult(result);
  const { Icon, style, title } = RESULT_ICON_CONFIG[r];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm p-1.5 ${style}`}
      title={title}
      aria-label={title}
    >
      <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.5} />
    </span>
  );
}

/**
 * Compact Pass / Fail / Skip segmented control for run case rows.
 */
function CaseResultButtons({ result, filePath, onSetResult }) {
  if (!onSetResult) return null;
  const handleClick = (e, value) => {
    e.stopPropagation();
    onSetResult(filePath, value);
  };
  return (
    <span
      role="radiogroup"
      aria-label="Test result"
      className="inline-flex shrink-0 overflow-hidden rounded-md border border-slate-200 divide-x divide-slate-200 dark:border-slate-600 dark:divide-slate-600"
    >
      {RESULT_SEGMENT_OPTIONS.map(({ value, label, Icon, active, idle }) => {
        const isActive = result === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={(e) => handleClick(e, value)}
            className={`${SEGMENT_BASE} ${isActive ? active : idle}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </button>
        );
      })}
    </span>
  );
}

/**
 * Result controls for a run case row: buttons or read-only icon.
 */
export function CaseResultRight({ result, filePath, onSetResult, caseResultMode = "buttons" }) {
  if (caseResultMode === "icon") {
    return <CaseResultIcon result={result} />;
  }
  return <CaseResultButtons result={result} filePath={filePath} onSetResult={onSetResult} />;
}

export default CaseResultButtons;
