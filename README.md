# Gitoza Lite — Tickets, Wiki & Tests for VS Code

Local-first companion to [Gitoza Desktop](https://gitoza.com): manage **tickets**, **wiki pages**, **releases**, and **test cases** as plain YAML + Markdown in your workspace — browse and edit from a structured UI inside [VS Code](https://code.visualstudio.com/).

Everything lives under `.gitoza-lite/` as files in your repo (git-friendly, AI-friendly).

## Try the in-repo handbook

This repository ships both **extension source** and a seeded **handbook** under `.gitoza-lite/` (wiki, tickets, test cases, and a smoke run). The handbook is **repo demo data only** — it is excluded from the published `.vsix`.

1. Clone this repository and open the folder in VS Code.
2. Install **Gitoza Lite** from the Marketplace, or press **F5** (*Run Extension*) from a development checkout — the host opens `.dev/handbook-workspace` (symlinked handbook) so it does not jump back to the parent window.
3. Run **Gitoza: Open** (or click the Gitoza Lite Activity Bar icon).
4. Start here:
   - **Wiki** → `02-getting-started` → *Welcome — open this handbook* (`W-LITE01`)
   - **Tickets** → project **Gitoza_Lite** → *Welcome — start here* (`LITE-WELCOM`)
   - **Test Repository** → project **gitoza.lite.handbook**
   - **Test Run** → **R-SMOKE1** (Handbook smoke)

## Demo

Browse the Test Repository, create a case, and run a manual Pass / Fail / Skip flow. *(Demo video covers Tests today — ticket/wiki walkthrough coming soon.)*

<video src="https://raw.githubusercontent.com/gitoza-io/gitoza-yaml-test-cases/main/media/gitoza-vscode-extension.mp4" poster="https://raw.githubusercontent.com/gitoza-io/gitoza-yaml-test-cases/main/media/screenshots/test-repository-ui.png" controls></video>

## AI-friendly workflow

Tickets, wiki pages, releases, and test cases are plain YAML in your repo — easy for AI assistants (Cursor, Copilot, ChatGPT, etc.) to read and write. Draft with chat, then refine in the UI. No built-in AI is required.

- **Draft with AI** — generate a `.yaml` file, then open and refine it in Gitoza Lite before you commit.
- **Docs and tasks as code** — every entity is a file you can `git add`, `git diff`, and merge in pull requests.
- **Same file shape everywhere** — YAML front matter + Markdown body; filename stem is the entity id.

## Getting started

**Requirements:** VS Code 1.85+ and an open workspace folder.

1. Open a repository in VS Code.
2. The **Gitoza Lite** tab opens in the editor area when the extension activates (when a `.gitoza-lite/` root exists, or after you run the open command).
3. If the tab was closed, click the **Gitoza Lite** icon in the Activity Bar, or run **Gitoza: Open** from the Command Palette.
4. Use the left icon rail to switch between **Test Repository**, **Test Run**, **Tickets**, **Releases**, and **Wiki**.
5. Create a first project (tests or tickets) or wiki page from the empty state to initialize the matching folder under `.gitoza-lite/`.

**Workspace paths:** This extension uses **`.gitoza-lite/`** only. It does not read or modify Gitoza Desktop paths under **`.gitoza/`**. Copy or move files manually if you already have Desktop data — there is no automatic migration.

| Module | Path |
|--------|------|
| Test cases | `.gitoza-lite/test/cases/` |
| Test runs | `.gitoza-lite/test/run/` |
| Tickets | `.gitoza-lite/tasks/tickets/{project}/` |
| Releases | `.gitoza-lite/tasks/tickets/{project}/releases/` |
| Wiki | `.gitoza-lite/wiki/` |

## Features

- **Tickets** — two-column project tree + detail; create tickets with auto ids (`PREFIX-XXXXXX`); edit metadata + Markdown
- **Releases** — project-scoped release YAML; link from ticket `release` field
- **Wiki** — two-column folder/page tree + detail; immutable `W-…` page ids; title/tags/status + Markdown
- **Test Repository** — three-column UI for projects, suites, and cases
- **Test Run** — YAML-backed manual runs with Pass / Fail / Skip
- **Local-first** — reads and writes YAML on disk; no SQLite or cloud dependency
- **Manual save** — Edit, then Save (no auto-save)

## File formats

### Ticket

```yaml
---
title: Fix login redirect
type: bug
status: open
priority: high
tags: [auth]
---

## Description
…
```

Path: `.gitoza-lite/tasks/tickets/{project}/{PREFIX}-{id}.yaml`. Project meta: `.project.yaml` with `ticket_prefix`.

### Release

```yaml
---
release_id: demo/1.1.0
name: 1.1.0
status: open
---
```

Path: `.gitoza-lite/tasks/tickets/{project}/releases/{stem}.yaml`.

### Wiki page

```yaml
---
title: Architecture overview
tags: [handbook]
status: published
---

Markdown body…
```

Path: `.gitoza-lite/wiki/{folders…}/W-XXXXXX.yaml`.

### Case file format

Each test case is a YAML file with front matter and a Markdown body. The extension **writes only editable fields** on create/save (`title`, `priority`, `tags`, `status`, `requirement_id`, `assigned_to`, `automated`, `params`, and the Markdown body).

```yaml
---
title: Login with valid credentials
priority: high
tags: [smoke, auth]
status: active
---

## Steps
1. Open the login page
2. Enter valid credentials

## Expected result
User is redirected to the dashboard.
```

### Test run file format

```yaml
---
title: Sprint 42 smoke
---
cases:
  - path: .gitoza-lite/test/cases/my_project/suite/login.yaml
    result: pending
  - path: .gitoza-lite/test/cases/my_project/suite/logout.yaml
    result: passed
```

Supported `result` values: `pending`, `passed`, `failed`, `skipped`.

## About Gitoza

Built by [Gitoza](https://gitoza.com) — a local-first, git-based platform for tickets, wiki, and test management as code.

This extension is **Gitoza Lite** for VS Code: edit entities in the editor with a focused subset of Desktop features. For git sync, review workflows, automation pipelines, and the full desktop experience, visit **[gitoza.com](https://gitoza.com)**.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for build, test, and packaging instructions.

## License

MIT — see [LICENSE](LICENSE).
