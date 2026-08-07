# Chartographer

Initially based on [Call Graph](https://github.com/beicause/call-graph)

![chartographer](https://raw.githubusercontent.com/arpinfidel/vscode-chartographer/master/assets/call-graph.png)

vscode extension to generate call graph using [Cytoscape.js](https://js.cytoscape.org/) based on vscode call hierarchy language feature.

## Features

* works on any language with a language server
* show functions and methods grouped by file
* **Hover + `E`** to expand a node one level
* **Hover + `Shift+E`** to expand recursively
* **Hover + `Del`** to remove a node
* **Ctrl/Cmd+Click** to jump to function location
* **Right-click** context menu with remove, expand, and go to function
* ignore files by glob pattern (test files, etc)
* trim function names with user-configurable regex
* add a function to an existing graph
* search for functions by name
* configurable layout algorithm (klay, dagre, elk)
* panel state persists across VS Code restarts
* supports color themes

## Quick start

1. Move your editor cursor over a function name
2. Run `Chartographer: Show Call Graph` via `Ctrl+Shift+P` or right-click context menu
3. Pick direction (Both/Incoming/Outgoing) and enter max depth (blank = unlimited)
4. **Hover** a node + press `E` to expand, `Del` to remove, or right-click for context menu

## Requirements

Chartographer relies on the "call hierarchy" feature of an LSP server. So, to use Chartographer for your project analysis, you must have a language server extension that supports "call hierarchy."

## Development

### Prerequisites

- Node.js 18+
- npm

### Build

```bash
npm install
npm run build       # esbuild → out/extension.js + out/webview.js
npm run typecheck   # tsc --noEmit
npm run test:unit   # 25 unit tests
```

### Package

```bash
npm run package     # produces chartographer-<version>.vsix
```

### Release

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build: `npm run build && npm run package`
4. Install the VSIX locally to verify: `code --install-extension chartographer-<version>.vsix --force`
5. Publish to marketplace: `vsce publish`
6. Create a GitHub release with the VSIX attached

## For more information

* [GitHub](https://github.com/arpinfidel/vscode-chartographer)

**Enjoy!**