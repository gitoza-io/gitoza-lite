/** localStorage key for webview UI scale. */
export const UI_SCALE_STORAGE_KEY = "gitoza.webview.uiScale";

export const UI_SCALE_MIN = 0.75;
export const UI_SCALE_MAX = 1.5;
export const UI_SCALE_STEP = 0.05;
export const UI_SCALE_DEFAULT = 1;

/**
 * Clamp a scale value into the allowed range.
 * @param {unknown} value
 * @returns {number}
 */
export function clampUiScale(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return UI_SCALE_DEFAULT;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, n));
}

/**
 * Round to two decimals to avoid float drift from repeated steps.
 * @param {number} value
 * @returns {number}
 */
export function roundUiScale(value) {
  return Math.round(clampUiScale(value) * 100) / 100;
}

/**
 * Step the scale up or down by UI_SCALE_STEP.
 * @param {number} current
 * @param {1 | -1} direction
 * @returns {number}
 */
export function stepUiScale(current, direction) {
  const dir = direction >= 0 ? 1 : -1;
  return roundUiScale(clampUiScale(current) + dir * UI_SCALE_STEP);
}

/**
 * Parse a stored scale string into a clamped number.
 * @param {string | null | undefined} raw
 * @returns {number}
 */
export function parseUiScale(raw) {
  if (raw == null || raw === "") return UI_SCALE_DEFAULT;
  return roundUiScale(Number(raw));
}

/**
 * Read UI scale from localStorage.
 * @returns {number}
 */
export function readUiScale() {
  try {
    return parseUiScale(localStorage.getItem(UI_SCALE_STORAGE_KEY));
  } catch (_) {
    return UI_SCALE_DEFAULT;
  }
}

/**
 * Persist UI scale to localStorage.
 * @param {number} scale
 */
export function writeUiScale(scale) {
  const next = roundUiScale(scale);
  try {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, String(next));
  } catch (_) {}
  return next;
}

/**
 * Apply scale to the document root CSS variable.
 * @param {number} scale
 * @param {Document} [doc]
 */
export function applyUiScale(scale, doc = typeof document !== "undefined" ? document : null) {
  if (!doc?.documentElement) return roundUiScale(scale);
  const next = roundUiScale(scale);
  doc.documentElement.style.setProperty("--gitoza-ui-scale", String(next));
  return next;
}
