# Changelog

All notable changes to this extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Copy ticket path** — button next to the ticket ID copies the repo-relative YAML path

## [0.3.1] - 2026-09-21

### Added

- **Debounced auto-save** (≈2s) for tickets, wiki, releases, test cases, and run editors — Save button removed; View flushes pending changes
- **Webview UI zoom** — `Ctrl`/`Cmd` + mouse wheel and a bottom-right zoom bar (`−` / percent / `+`); scale persists in `gitoza.webview.uiScale`
- **Open-focus navigation** — double-click a project, release, or run to focus that branch; back chevron steps out one level (Tickets, Releases, Test Repository, Test Run)
- **Pin ticket projects** — hover pin on project rows; pinned projects stay at the top (shared by Tickets and Releases)
- **Query search with frontmatter chips** — type `status: open` (Tab autocompletes keys/values); free text becomes a `q` chip (Tickets, Releases, Wiki, Test Repository)
- **Quick filters** — Tickets project focus: Open / Blocked / Backlog; Releases: release-status then ticket-status filters when focused
- **Create ticket from a release** — right-click a release → Create ticket with `release` pre-filled
- **Add cases to a run** — right-click a run to pick cases with preview before confirming

### Fixed

- Case search **priority** value dropdown (High / Medium / Low) after selecting the priority key
- Custom fields searchable as their own frontmatter keys (not a synthetic “Custom field” key)
- Dark-mode / theme contrast for icons and UI chrome

### Changed

- Switching between tickets (or cases, wiki pages, releases of the same type) while editing keeps edit mode and flushes the previous draft safely

## [0.3.0] - 2026-09-17

### Added

- **Tickets** — YAML tickets under `.gitoza-lite/tasks/tickets/` with metadata + Markdown editor
- **Releases** — project-scoped release YAML under `{project}/releases/`
- **Wiki** — nested folders and `W-…` pages under `.gitoza-lite/wiki/`

### Changed

- Marketplace listing title is **Gitoza Lite — Task & Test Management in YAML**; short description targets task/test management in YAML search
- Extension identity remains `gitoza.gitoza-yaml-test-cases`; publisher remains `gitoza`
- Command palette entry is **Gitoza Lite: Open Tickets, Wiki & Tests**; Activity Bar and editor tab use Gitoza Lite branding
- **Tickets** and **Wiki** use a Desktop-style two-column tree + detail layout (Kanban board removed)
- README covers Tickets, Wiki, Releases, and Tests

## [0.2.1] - 2026-07-28

### Added

- **Rename** projects and suites from the Test Repository tree
- Project, suite, and run names can include spaces (shown with spaces; stored safely on disk)

### Fixed

- Creating a project, suite, or run with spaces no longer leaves the sidebar stuck on loading
- Project case-count badges no longer show double the real number
- **Add cases** to a run hides cases already in the run, and hides suites/projects that have nothing left to add

## [0.2.0] - 2026-07-01

### Added

- **Delete** test cases, suites (folders), and projects — with confirmation and warnings when test runs still reference deleted cases
- Test Run **context menu** — rename and delete runs from the folder tree
- README **demo video** — `<video>` walkthrough on the Marketplace listing

### Fixed

- **Test Run case list** — cases under `.gitoza-lite/test/cases/` now appear in the run browser (previously only Desktop `.gitoza/test/cases/` paths were recognized)
- **Run title** — YAML `title` in run front matter displays correctly instead of "Unnamed run"

### Changed

- Test Run UI — unified three-column browse (runs, cases, detail) aligned with Test Repository layout; removed separate run sidebar list
- Activity Bar icon opens or focuses the Gitoza Test Repository editor tab instead of showing a sidebar launcher button
- Export hierarchy reuses shared case-path parsing for `.gitoza-lite` runs

## [0.1.1] - 2026-06-30

### Changed

- Marketplace listing — keyword-focused title and description for test case / QA search
- README — AI-friendly workflow moved up; screenshots stacked full-width for readability

## [0.1.0] - 2026-06-30

### Added

- Test Repository UI — browse projects, suites, and cases in a three-column editor tab
- YAML case create, edit, and manual save under `.gitoza-lite/test/cases/`
- Test Run workflow — create runs, add cases, mark Pass / Fail / Skip
- YAML run files under `.gitoza-lite/test/run/`
- Activity Bar launcher and **Gitoza: Open Test Repository** command
- Pending run-result updates with unsaved-changes prompt before save

[0.3.1]: https://github.com/gitoza-io/gitoza-yaml-test-cases/releases/tag/v0.3.1
[0.3.0]: https://github.com/gitoza-io/gitoza-yaml-test-cases/releases/tag/v0.3.0
[0.2.1]: https://github.com/gitoza-io/gitoza-yaml-test-cases/releases/tag/v0.2.1
[0.2.0]: https://github.com/gitoza-io/gitoza-yaml-test-cases/releases/tag/v0.2.0
[0.1.1]: https://github.com/gitoza-io/gitoza-yaml-test-cases/releases/tag/v0.1.1
[0.1.0]: https://github.com/gitoza-io/gitoza-yaml-test-cases/releases/tag/v0.1.0
