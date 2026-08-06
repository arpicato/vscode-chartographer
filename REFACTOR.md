# Refactoring Plan: vscode-chartographer

## ✅ Completed

### Phase 1: Fix structural issues
- Break circular dependency (`extension.ts` ↔ `webview.ts` ↔ `call.ts` ↔ `extension.ts`)
- Remove dead code and unused dependencies (`concat-map`, `EventEmitter`, `isEqual`)
- Fix `var` → `const`/`let`
- Fix `sort()` mutation side-effect
- Fix `throw` in async context
- Fix `.gitignore` pattern conversion

### Phase 2: Type safety
- Typed message protocol (`protocol.ts`): `WebviewToExtensionMessage`, `ExtensionToWebviewMessage`
- `ChartographerConfig` interface replaces `config?: any` everywhere
- Discriminated union type for webview message handlers

### Phase 3: Webview JS extraction & esbuild bundling
- Single `esbuild.config.mjs` builds both extension (`out/extension.js`, 31K) and webview (`out/webview.js`, 2.4M)
- Webview JS extracted from `graph.html` into `src/webview/index.ts` (TypeScript)
- Vendored libs removed from `src/libs/`, pulled from npm
- `graph.html` is now a thin template (60 lines)
- Minification enabled (5.4MB → 2.4MB)

### Phase 4: Consolidation
- 6 near-identical commands replaced with 1 quickPick-based `Chartographer.showCallGraph`
- User picks direction (Both/Incoming/Outgoing) then enters depth

### Phase 5: Edge cases
- `getSelectedFunctions` handles missing active editor (shows error, returns `[]`)
- `registerWebviewPanelSerializer` re-derives `workspaceRoot` from current workspace folders

### Phase 6: Test infrastructure
- 19 unit tests: `formatFileLabel`, `trimFunctionName`, `findLongestCommonPrefix`
- VS Code integration test: activation + command registration
- `npm run test:unit` for fast unit tests (8ms)
- `npm run test` for full integration

## Build Pipeline

```
npm run build       # esbuild → out/extension.js + out/webview.js
npm run typecheck   # tsc --noEmit
npm run test:unit   # 19 mocha tests
npm run test        # VS Code integration test
npm run package     # vsce → .vsix
```

---

### Priority order

1. **Phase 1** (structural fixes) — low risk, high payoff, immediate safety
2. **Phase 3** (extract webview JS) — biggest code quality win, enables linting/typechecking of webview code
3. **Phase 2** (type safety) — catches bugs at compile time
4. **Phase 4** (consolidation) — reduces surface area
5. **Phase 5** (edge cases) — robustness
6. **Phase 6** (tests) — regression safety for everything above