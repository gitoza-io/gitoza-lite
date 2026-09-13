import { parse, stringify } from "yaml";
import type { WikiStatus, YamlWikiDetail } from "./messageTypes";

const WIKI_STATUSES: WikiStatus[] = ["draft", "published", "outdated"];
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function lowerKeyMap(map: Record<string, unknown>): Record<string, unknown> {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(map)) {
    lower[k.toLowerCase()] = v;
  }
  return lower;
}

function parseWikiStatus(value: unknown): WikiStatus {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return (WIKI_STATUSES as string[]).includes(s) ? (s as WikiStatus) : "draft";
}

function stemFromPath(filePath: string): string {
  return (
    filePath
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.replace(/\.ya?ml$/i, "") ?? ""
  );
}

export function randomWikiId(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALNUM.charAt(Math.floor(Math.random() * ALNUM.length));
  }
  return `W-${suffix}`;
}

export function parseWikiYaml(
  content: string,
  filePath: string,
): YamlWikiDetail | null {
  const stripped = content.trimStart();
  if (!stripped.startsWith("---")) {
    return null;
  }
  const rest = stripped.slice(3);
  const end = rest.indexOf("\n---");
  let frontText: string;
  let body: string;
  if (end >= 0) {
    frontText = rest.slice(0, end);
    body = rest.slice(end + 4).trimStart();
  } else {
    frontText = rest;
    body = "";
  }

  let parsed: unknown;
  try {
    parsed = parse(frontText);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const lower = lowerKeyMap(parsed as Record<string, unknown>);
  const pageId = stemFromPath(filePath);
  if (!pageId || pageId.startsWith(".")) {
    return null;
  }

  const norm = filePath.replace(/\\/g, "/");
  const directory = norm.replace(/\/[^/]+\.ya?ml$/i, "");

  return {
    page_id: pageId,
    title: lower.title != null ? String(lower.title) : undefined,
    tags: parseTags(lower.tags),
    status: parseWikiStatus(lower.status),
    file_path: norm,
    body,
    directory,
  };
}

export function parseWikiYamlFrontMatterOnly(
  content: string,
  filePath: string,
): YamlWikiDetail | null {
  const detail = parseWikiYaml(content, filePath);
  if (!detail) {
    return null;
  }
  return { ...detail, body: "" };
}

export function detailToWikiFrontMatter(
  detail: YamlWikiDetail,
): Record<string, unknown> {
  const fm: Record<string, unknown> = {};
  if (detail.title?.trim()) {
    fm.title = detail.title.trim();
  }
  if (detail.tags.length > 0) {
    fm.tags = detail.tags;
  }
  fm.status = detail.status || "draft";
  return fm;
}

export function serializeWikiYaml(detail: YamlWikiDetail): string {
  const fm = detailToWikiFrontMatter(detail);
  const ordered: Record<string, unknown> = {};
  if (fm.title !== undefined) {
    ordered.title = fm.title;
  }
  for (const [k, v] of Object.entries(fm)) {
    if (k !== "title") {
      ordered[k] = v;
    }
  }
  const yamlHeader = stringify(ordered).trimEnd();
  const body = (detail.body ?? "").trim();
  if (!body) {
    return `---\n${yamlHeader}\n---\n\n`;
  }
  return `---\n${yamlHeader}\n---\n\n${body}\n`;
}
