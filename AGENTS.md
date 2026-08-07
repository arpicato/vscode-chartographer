# vscode-chartographer agent instructions

## Build pipeline

```
npm run build       # esbuild → out/extension.js + out/webview.js
npm run typecheck   # tsc --noEmit
npm run test:unit   # 25 mocha tests (fast, no VS Code)
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

## Interaction model

- Click node → highlight connected neighborhood
- Shift+Click node → shortest directed path from last clicked node
- Ctrl+Click node → go to function definition
- Click edge (1 call site) → navigate to call site
- Click edge (N call sites) → quickPick to choose
- Right-click node → context menu (remove, expand, find path from here, go to)
- Hover + E → expand one level, Hover + Shift+E → expand recursively, Hover + Del → remove
- "Find path from here" → enters selection mode, click destination node, Esc to cancel
- Path indicator: floating bar shows source → target · N hops, × to clear
- Path computation uses Cytoscape's built-in Dijkstra (directed, unweighted)

## Edge call sites

- `CallHierarchy.fromRanges` stored in edge data as `callSites[]` (URI + line/col)
- `call.ts` `CallHierarchy` interface includes `fromRanges: vscode.Range[]`
- `graph.ts` `CyEdge.data.callSites?: CallSite[]`

All call graph variants consolidated into one `Chartographer.showCallGraph` command.
User picks direction (Both/Incoming/Outgoing) via quickPick, then enters depth.
Old redundant commands removed.

## VS Code test environment

Uses `@vscode/test-electron` — downloads VS Code, runs extension in headless mode.
The downloaded VS Code is cached in `.vscode-test/`.
`--disable-gpu` flag needed when launching standalone in container.

## Gotchas & learnings

### Publishing
- Publisher is `ArpinFidel` (can't rename on marketplace). Repo remote is `arpicato/vscode-chartographer`.
- `vsce publish` fails with "Access Denied" if PAT org doesn't match publisher. Create PAT under **All accessible organizations** to avoid org mismatch.
- Azure DevOps org must use **Microsoft account** (not "Default Directory") or PAT permissions break.
- **Must bump `version` in `package.json` BEFORE creating a release.** The workflow builds VSIX + publishes using the version from `package.json`. If you tag first and bump later, the VSIX will have the wrong version.
- If version already exists on marketplace, publish fails with "already exists".
- `.github/workflows/publish.yml` triggers on `release: [published]` or manual `workflow_dispatch`.
- On `workflow_dispatch`, `GITHUB_REF_NAME` is the branch name (e.g. `main`), not the version tag. The VSIX filename will be `chartographer-main.vsix` — this is fine for the publish step but the release upload step is skipped (guarded by `if: github.event_name == 'release'`).

### Changelog popup
- Changelog-on-update is custom extension behavior in `src/extension.ts`; it is not the Marketplace Changelog tab.
- `checkChangelog()` only runs after extension activation. Keep `onStartupFinished` in `activationEvents` or an update alone will not trigger the popup.
- Read the current version from `context.extension.packageJSON.version`; do not look up the extension by a hard-coded ID.
- `vsce` packages `CHANGELOG.md` as lowercase `changelog.md`. Resolve it with `vscode.Uri.joinPath(context.extensionUri, 'changelog.md')` so installed Linux builds work.
- Keep `Chartographer.showChangelog` contributed and registered so the popup content can be tested manually before publishing.

### Path finding
- Cytoscape `dijkstra().pathTo()` returns root-only collection when no path exists (not empty). Check `path.nodes().filter(n => n.id() === targetId).length > 0` instead of `path.length === 0`.
- `directed: false` lets reverse paths work but also finds paths through sink nodes (a→b←c would find a path from a to c).
- `cy.getElementById()` returns `CollectionReturnValue`. Pass `.first()` to `dijkstra()` root param for type safety.
- `computePath` must call `resetHighlights()` first to clear any existing neighborhood highlight state.

### Workspace symbol search
- Use `vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', query)` to search all symbols.
- Use `vscode.commands.executeCommand('vscode.prepareCallHierarchy', uri, position)` to get `CallHierarchyItem` from a symbol.
- When adding a workspace symbol to the graph, just add the node with `getCyElems` + `addElems` — don't expand it (surprises the user).
- `getCyElems` needs `fromRanges` to be optional — handle `undefined` with `(edge.fromRanges || []).map(...)`.

### Unit tests
- Test file uses `suite`/`test` (TDD interface). Mocha must be created with `{ ui: 'tdd' }` or it fails with "suite is not defined".
- Tests inline functions from source rather than importing them (avoids `vscode` module dependency).
- 25 tests across 3 suites: `formatFileLabel`, `trimFunctionName`, `findLongestCommonPrefix`.

### Cytoscape edge data
- Edge `callSites[]` stored in `CyEdge.data.callSites`. Created from `CallHierarchy.fromRanges` in `getCyElems`.
- `CallSite` shape: `{ uri: { scheme, authority, path, query, fragment }, line, character }`.
- Edge click handler: 1 call site → navigate directly, N call sites → send `selectCallSite` to extension for quickPick.

### Context menu
- "Find path to..." sends `findPathTo` message to extension. Extension builds quickPick from `nodes` dict + workspace search option.
- "Find path from here" (click-mode) was removed in favor of quickPick — more reliable and searchable.
