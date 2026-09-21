/**
 * Map Tailwind color utilities onto --gitoza-* aliases (backed by --vscode-*).
 * Uses color-mix so opacity modifiers (/15, /20, /50) keep working.
 */

/** @param {string} varName CSS custom property name, e.g. "--gitoza-slate-50" */
export function vscodeColor(varName) {
  return `color-mix(in srgb, var(${varName}) calc(100% * <alpha-value>), transparent)`;
}

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** @param {string} name palette name without shade, e.g. "slate" */
function palette(name) {
  /** @type {Record<string, string>} */
  const scale = {};
  for (const shade of SHADES) {
    scale[shade] = vscodeColor(`--gitoza-${name}-${shade}`);
  }
  return scale;
}

/** Full Tailwind color overrides for VS Code-native theming. */
export const vscodeColors = {
  white: vscodeColor("--gitoza-white"),
  black: vscodeColor("--gitoza-black"),
  slate: palette("slate"),
  indigo: palette("indigo"),
  blue: palette("blue"),
  sky: palette("sky"),
  cyan: palette("cyan"),
  green: palette("green"),
  emerald: palette("emerald"),
  lime: palette("lime"),
  teal: palette("teal"),
  amber: palette("amber"),
  orange: palette("orange"),
  yellow: palette("yellow"),
  red: palette("red"),
  rose: palette("rose"),
  violet: palette("violet"),
  purple: palette("purple"),
  fuchsia: palette("fuchsia"),
  pink: palette("pink"),
  primary: {
    DEFAULT: vscodeColor("--gitoza-primary"),
    dark: vscodeColor("--gitoza-primary-dark"),
  },
  panel: vscodeColor("--gitoza-panel"),
  ink: vscodeColor("--gitoza-ink"),
  muted: vscodeColor("--gitoza-muted"),
  reading: vscodeColor("--gitoza-prose"),
  "list-selected": vscodeColor("--gitoza-list-selected"),
  "list-hover": vscodeColor("--gitoza-list-hover"),
};
