# Contributing

Thanks for your interest in **Gitoza Lite** for VS Code.

## Development setup

```bash
# Install dependencies
npm install
cd webview && npm install && cd ..

# Build extension host + webview
npm run build

# Run extension host tests
npm run test:ext

# Launch Extension Development Host (F5 in VS Code)
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/` | Extension host (TypeScript) — YAML I/O for cases, runs, tickets, releases, wiki; message bridge |
| `webview/` | React UI (vendored desktop patterns + VS Code adapter) |
| `dist/` | Built extension and webview bundle |

## Packaging

```bash
npm run package
```

This produces a `.vsix` in the project root via `@vscode/vsce`.
