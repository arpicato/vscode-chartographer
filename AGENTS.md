# vscode-chartographer agent instructions

## Build pipeline

```
npm run build       # esbuild → out/extension.js + out/webview.js
npm run typecheck   # tsc --noEmit
npm run test:unit   # 19 mocha tests (fast, no VS Code)
npm run test        # VS Code integration test (requires xvfb-run)
npm run package     # vsce → .vsix
```

## Test

Run integration tests with xvfb:
```
nix-shell -p xvfb-run cups.lib --run "xvfb-run --auto-servernum npm run test"
```

## Architecture

- `src/extension.ts` — entry point, activates extension, registers commands
- `src/webview.ts` — webview panel creation, message handling (extension side)
- `src/webview/index.ts` — webview JS (bundled by esbuild, runs in browser context)
- `src/call.ts` — VS Code CallHierarchy API traversal
- `src/graph.ts` — Cytoscape element generation, node/edge formatting
- `src/html.ts` — HTML template loading + URI resolution
- `src/logger.ts` — output channel logging
- `src/protocol.ts` — shared types (Config, Direction, message protocol)

## Key conventions

- `trimFunctionPattern` config: string regex. Empty = no trimming. Set to `^[a-zA-Z_$][a-zA-Z0-9_$]*` to strip generics. User-configurable per preference.
- All message types go in `protocol.ts` — both extension and webview import from here
- No `any` types for config or messages — use `ChartographerConfig` and typed message unions
- Webview JS is TypeScript, not raw JS in HTML. Bundle with esbuild.
- `buildWebview` returns `() => Promise<void>` — used with `vscode.window.withProgress`

## Single command

All call graph variants consolidated into one `Chartographer.showCallGraph` command.
User picks direction (Both/Incoming/Outgoing) via quickPick, then enters depth.
Old redundant commands removed.

## VS Code test environment

Uses `@vscode/test-electron` — downloads VS Code, runs extension in headless mode.
The downloaded VS Code is cached in `.vscode-test/`.
`--disable-gpu` flag needed when launching standalone in container.