# Gitoza Lite — Task & Test Management in YAML

[![Install on VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/gitoza.gitoza-yaml-test-cases?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=gitoza.gitoza-yaml-test-cases)

**Install:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gitoza.gitoza-yaml-test-cases)

Manage **tickets**, **releases**, **wiki pages**, and **test cases** without leaving your repo. Everything is plain YAML under `.gitoza-lite/` — browse and edit it from a structured UI in [VS Code](https://code.visualstudio.com/), then share work with your team through **git and branches** like any other code.

Open a project, click through tickets, edit and save, search, and plan by release:

<video src="https://raw.githubusercontent.com/gitoza-io/gitoza-lite/main/media/vscode-demo-hero.mp4" controls></video>

## AI-generated tickets

Ask Cursor, Copilot, or ChatGPT to draft a ticket the same way you’d ask for a code change. The assistant writes a YAML file in the repo; open it in Gitoza Lite to refine status, release, and details — then commit and review in a PR. No built-in AI required.

<video src="https://raw.githubusercontent.com/gitoza-io/gitoza-lite/main/media/ai-generate-task-extension.mp4" controls></video>

- **Draft with AI** — generate a `.yaml` file, then open and refine it in Gitoza Lite before you commit.
- **Docs and tasks as code** — every entity is a file you can `git add`, `git diff`, and merge in pull requests.
- **Same file shape everywhere** — YAML front matter + Markdown body; filename stem is the entity id.

## Tests

Browse the Test Repository, create a case, and run a manual Pass / Fail / Skip flow:

<video src="https://raw.githubusercontent.com/gitoza-io/gitoza-yaml-test-cases/main/media/gitoza-vscode-extension.mp4" poster="https://raw.githubusercontent.com/gitoza-io/gitoza-yaml-test-cases/main/media/screenshots/test-repository-ui.png" controls></video>

## Try the in-repo handbook

This repository ships both **extension source** and a seeded **handbook** under `.gitoza-lite/` (wiki, tickets, test cases, and a smoke run). The handbook is **repo demo data only** — it is excluded from the published `.vsix`.

1. Clone this repository and open the folder in VS Code.
2. Install **Gitoza Lite** from the Marketplace, or press **F5** (*Run Extension*) from a development checkout — the host opens `.dev/handbook-workspace` (symlinked handbook) so it does not jump back to the parent window.
3. Run **Gitoza Lite: Open Tickets, Wiki & Tests** (or click the Gitoza Lite Activity Bar icon).
4. Start here:
   - **Wiki** → `02-getting-started` → *Welcome — open this handbook* (`W-LITE01`)
   - **Tickets** → project **Gitoza_Lite** → *Welcome — start here* (`LITE-WELCOM`)
   - **Test Repository** → project **gitoza.lite.handbook**
   - **Test Run** → **R-SMOKE1** (Handbook smoke)

## Getting started

**Requirements:** VS Code 1.85+ and an open workspace folder.

1. Open a repository in VS Code.
2. The **Gitoza Lite** tab opens in the editor area when the extension activates (when a `.gitoza-lite/` root exists, or after you run the open command).
3. If the tab was closed, click the **Gitoza Lite** icon in the Activity Bar, or run **Gitoza Lite: Open Tickets, Wiki & Tests** from the Command Palette.
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

Built by [Gitoza](https://gitoza.com). Tickets, wiki, releases, and tests stay the same YAML shape whether you edit them in VS Code or elsewhere.

**Gitoza Lite** is the in-editor workflow for developers. When the whole team needs to work on that same project data — including people who don’t live in git day to day — keep assets local and use **[Gitoza Desktop](https://gitoza.com)** for shared task views, sync, and progress tracking.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for build, test, and packaging instructions.

## License

MIT — see [LICENSE](LICENSE).
