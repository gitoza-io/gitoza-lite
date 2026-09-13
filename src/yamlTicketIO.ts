import { parse, stringify } from "yaml";
import type {
  TicketStatus,
  TicketType,
  YamlTicketDetail,
} from "./messageTypes";

const TICKET_TYPES: TicketType[] = ["bug", "story", "task", "spike"];
const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "in_testing",
  "blocked",
  "done",
  "cancelled",
];

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

function parseParams(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = String(k).trim();
    const val = String(v ?? "").trim();
    if (key && val) {
      out[key] = val;
    }
  }
  return out;
}

function lowerKeyMap(map: Record<string, unknown>): Record<string, unknown> {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(map)) {
    lower[k.toLowerCase()] = v;
  }
  return lower;
}

function parseTicketType(value: unknown): TicketType {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return (TICKET_TYPES as string[]).includes(s) ? (s as TicketType) : "task";
}

function parseTicketStatus(value: unknown): TicketStatus {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return (TICKET_STATUSES as string[]).includes(s)
    ? (s as TicketStatus)
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

export function projectFromTicketPath(filePath: string): string | undefined {
  const norm = filePath.replace(/\\/g, "/");
  const parts = norm.split("/");
  // .gitoza-lite/tasks/tickets/{project}/{id}.yaml
  const ticketsIdx = parts.indexOf("tickets");
  if (ticketsIdx >= 0 && parts.length > ticketsIdx + 2) {
    return parts[ticketsIdx + 1];
  }
  return undefined;
}

export function parseTicketYaml(
  content: string,
  filePath: string,
): YamlTicketDetail | null {
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
  const ticketId = stemFromPath(filePath);
  if (!ticketId || ticketId.startsWith(".")) {
    return null;
  }

  return {
    ticket_id: ticketId,
    title: lower.title != null ? String(lower.title) : undefined,
    tags: parseTags(lower.tags),
    type: parseTicketType(lower.type),
    status: parseTicketStatus(lower.status),
    priority: lower.priority != null ? String(lower.priority) : undefined,
    assigned_to:
      lower.assigned_to != null ? String(lower.assigned_to) : undefined,
    reporter: lower.reporter != null ? String(lower.reporter) : undefined,
    sprint: lower.sprint != null ? String(lower.sprint) : undefined,
    release: lower.release != null ? String(lower.release) : undefined,
    params: parseParams(lower.params),
    file_path: filePath.replace(/\\/g, "/"),
    body,
    project: projectFromTicketPath(filePath),
  };
}

export function parseTicketYamlFrontMatterOnly(
  content: string,
  filePath: string,
): YamlTicketDetail | null {
  const detail = parseTicketYaml(content, filePath);
  if (!detail) {
    return null;
  }
  return { ...detail, body: "" };
}

export function detailToTicketFrontMatter(
  detail: YamlTicketDetail,
): Record<string, unknown> {
  const fm: Record<string, unknown> = {};
  if (detail.title?.trim()) {
    fm.title = detail.title.trim();
  }
  if (detail.tags.length > 0) {
    fm.tags = detail.tags;
  }
  fm.type = detail.type || "task";
  fm.status = detail.status || "open";
  if (detail.priority?.trim()) {
    fm.priority = detail.priority.trim().toLowerCase();
  }
  if (detail.assigned_to?.trim()) {
    fm.assigned_to = detail.assigned_to.trim();
  }
  if (detail.reporter?.trim()) {
    fm.reporter = detail.reporter.trim();
  }
  if (detail.sprint?.trim()) {
    fm.sprint = detail.sprint.trim();
  }
  if (detail.release?.trim()) {
    fm.release = detail.release.trim();
  }
  if (Object.keys(detail.params).length > 0) {
    fm.params = detail.params;
  }
  return fm;
}

export function serializeTicketYaml(detail: YamlTicketDetail): string {
  const fm = detailToTicketFrontMatter(detail);
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

export function parseProjectYaml(content: string): { ticket_prefix: string } {
  try {
    const parsed = parse(content) as Record<string, unknown> | null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const lower = lowerKeyMap(parsed);
      const prefix = String(lower.ticket_prefix ?? "")
        .trim()
        .toUpperCase();
      if (prefix) {
        return { ticket_prefix: prefix };
      }
    }
  } catch {
    // fall through
  }
  return { ticket_prefix: "TICK" };
}

export function serializeProjectYaml(ticketPrefix: string): string {
  return stringify({ ticket_prefix: ticketPrefix.trim().toUpperCase() });
}

export function deriveTicketPrefix(projectName: string): string {
  const cleaned = projectName
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  if (cleaned.length >= 4) {
    return cleaned.slice(0, 4);
  }
  if (cleaned.length > 0) {
    return (cleaned + "XXXX").slice(0, 4);
  }
  return "TICK";
}

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function randomTicketSuffix(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALNUM.charAt(Math.floor(Math.random() * ALNUM.length));
  }
  return out;
}
