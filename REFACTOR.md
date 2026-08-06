# Refactoring Plan: vscode-chartographer

## Phase 1: Fix structural issues (no behavior change)

**1.1 Break circular dependency** (`extension.ts` ↔ `webview.ts` ↔ `call.ts` ↔ `extension.ts`)
- Move `printChannelOutput` to its own `logger.ts` module
- `call.ts` and `webview.ts` import from `logger.ts` instead of `extension.ts`

**1.2 Remove dead code and unused dependencies**
- Strip commented-out gitignore pattern conversion block (`call.ts:20-35`)
- Remove unused `EventEmitter` import (`call.ts:5`)
- Remove unused `concat-map` from `package.json` dependencies
- Remove commented-out `panel.onDidChangeViewState` block (`webview.ts:128-132`)
- Remove commented-out `console.log` lines (`graph.html:554-560`)
- Remove commented-out layout options (`graph.html:195-197, 216-222`)

**1.3 Fix `var` → `const`/`let`**
- `webview.ts:98`: `var html` → `const html`
- `webview.ts:189,207`: `var node` → `const node`
- `webview.ts:192,209`: `var range` / `var position` → `const`
- `graph.html:124,180,189,477`: `var` → `const`/`let`

**1.4 Fix `sort()` mutation side-effect**
- `extension.ts:20`: `findLongestCommonPrefix` sorts input array in place. Copy before sort: `const sorted = [...strs].sort()`

**1.5 Fix `throw` in async context**
- `webview.ts:78,218-219`: Replace `throw new Error(...)` with `return` after `showErrorMessage` — these crash the extension host

**1.6 Fix `.gitignore` pattern conversion**
- `call.ts:20-35`: Uncomment and fix the pattern conversion logic. Raw `.gitignore` patterns like `/build/`, `*.log`, `node_modules/` need proper glob conversion before passing to `minimatch`

## Phase 2: Type safety

**2.1 Typed message protocol**
- Define shared message types (e.g., `WebviewMessage = { type: 'addElems' | 'setParams' | 'goToFunction' | 'expandBoth', data: ... }`)
- Replace `msg: any` in `webview.ts:150` with the typed union
- Replace `config?: any` in `graph.ts` with proper `Config` interface

**2.2 Typed config object**
- Define `ChartographerConfig` interface with all properties from `setupCallGraph` config block
- Use it everywhere instead of `any`

## Phase 3: Webview JS extraction & build pipeline

**3.1 Extract JS from `graph.html` into separate TypeScript files**
- Move Cytoscape setup, layout, interaction, search, color scheme logic into `src/webview/graph-ui.ts`
- Bundle with esbuild (VS Code's recommended approach for webviews)
- `graph.html` becomes thin template (just `<div id="cy">` + script tag loading bundled JS)

**3.2 Or at minimum: extract JS into separate `.js` files**
- `src/webview/cytoscape-setup.js`
- `src/webview/search.js`
- `src/webview/interactions.js`
- Kept in `src/` so they get bundled into VSIX via `.vscodeignore`
- `graph.html` only has `<script src>` tags and minimal HTML

**3.3 Use `esbuild` for webview bundling**
- Add `esbuild` devDependency
- Add build script to `package.json`: `"build:webview": "esbuild src/webview/*.ts --bundle --outfile=out/webview.js"`
- Update `html.ts` to inject the bundled script

## Phase 4: Reduce duplication & consolidate

**4.1 Consolidate 6 nearly-identical commands into 1**
- `extension.ts:74-139`: `showAllCallGraph`, `showAllIncomingCallGraph`, `showAllOutgoingCallGraph`, `showCallGraph`, `showIncomingCallGraph`, `showOutgoingCallGraph` are all the same pattern with different `direction`/`maxDepth` args
- Register one command `Chartographer.showCallGraph` with a `quickPick` to choose direction + depth
- Or keep as separate commands but extract the shared logic

**4.2 Shared constants for message types**
- `const MSG_LOADED = 'state:loaded'`, `MSG_READY = 'state:ready'`, `MSG_ADD_ELEMS = 'addElems'`, etc.
- Single source of truth shared between TS and webview JS

**4.3 Extract `isCtrlDown`/`isAltDown`/`isShiftDown`**
- `graph.html:531-552`: Defined inside `cy.on('tap', 'node', ...)` handler — recreated on every click
- Move to module scope as standalone functions

## Phase 5: Edge case hardening

**5.1 Graceful handling when no editor is active**
- `webview.ts:69`: `activeTextEditor!` will crash if no editor is open
- Check `if (!activeTextEditor)` → show message + return

**5.2 Webview panel serializer workspaceRoot staleness**
- `webview.ts:45-65`: `workspaceRoot` captured at `activate()` time. If workspace folders change between sessions, stored state is stale
- Re-derive workspace root from stored state or re-read from `vscode.workspace.workspaceFolders`

## Phase 6: Test infrastructure

**6.1 Unit tests for non-VS Code logic**
- `graph.ts`: `formatFileLabel`, `trimFunctionName`, `getNode`, `getCyNodes` — pure functions, testable with mocha
- `extension.ts`: `findLongestCommonPrefix`

**6.2 Integration tests for call hierarchy traversal**
- `call.ts`: `getCallHierarchy` — can test with mock language server

---

### Priority order

1. **Phase 1** (structural fixes) — low risk, high payoff, immediate safety
2. **Phase 3** (extract webview JS) — biggest code quality win, enables linting/typechecking of webview code
3. **Phase 2** (type safety) — catches bugs at compile time
4. **Phase 4** (consolidation) — reduces surface area
5. **Phase 5** (edge cases) — robustness
6. **Phase 6** (tests) — regression safety for everything above