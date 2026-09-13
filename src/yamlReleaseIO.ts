import { parse, stringify } from "yaml";
import type { ReleaseStatus, YamlReleaseDetail } from "./messageTypes";

const RELEASE_STATUSES: ReleaseStatus[] = ["open", "shipped", "cancelled"];

function lowerKeyMap(map: Record<string, unknown>): Record<string, unknown> {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(map)) {
    lower[k.toLowerCase()] = v;
  }
  return lower;
}

function parseReleaseStatus(value: unknown): ReleaseStatus {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return (RELEASE_STATUSES as string[]).includes(s)
    ? (s as ReleaseStatus)
    : "open";
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

export function projectFromReleasePath(filePath: string): string | undefined {
  const norm = filePath.replace(/\\/g, "/");
  const parts = norm.split("/");
  // .gitoza-lite/tasks/tickets/{project}/releases/{stem}.yaml
  const ticketsIdx = parts.indexOf("tickets");
  if (ticketsIdx >= 0 && parts.length > ticketsIdx + 2) {
    return parts[ticketsIdx + 1];
  }
  return undefined;
}

export function slugifyReleaseStem(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "release";
}

export function parseReleaseYaml(
  content: string,
  filePath: string,
): YamlReleaseDetail | null {
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
  const stem = stemFromPath(filePath);
  if (!stem) {
    return null;
  }
  const project = projectFromReleasePath(filePath);
  const releaseId =
    lower.release_id != null
      ? String(lower.release_id).trim()
      : project
        ? `${project}/${stem}`
        : stem;

  return {
    release_id: releaseId,
    name:
      lower.name != null
        ? String(lower.name)
        : stem.replace(/-/g, " "),
    status: parseReleaseStatus(lower.status),
    file_path: filePath.replace(/\\/g, "/"),
    body,
    project,
    stem,
  };
}

export function detailToReleaseFrontMatter(
  detail: YamlReleaseDetail,
): Record<string, unknown> {
  return {
    release_id: detail.release_id,
    name: detail.name,
    status: detail.status || "open",
  };
}

export function serializeReleaseYaml(detail: YamlReleaseDetail): string {
  const fm = detailToReleaseFrontMatter(detail);
  const yamlHeader = stringify(fm).trimEnd();
  const body = (detail.body ?? "").trim();
  if (!body) {
    return `---\n${yamlHeader}\n---\n\n`;
  }
  return `---\n${yamlHeader}\n---\n\n${body}\n`;
}
