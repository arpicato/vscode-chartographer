# Chartographer

Initially based on [Call Graph](https://github.com/beicause/call-graph)

![chartographer](https://raw.githubusercontent.com/arpinfidel/vscode-chartographer/master/assets/call-graph.png)
vscode extension to generate call graph using [Cytoscape.js](https://js.cytoscape.org/) based on vscode call hierarchy language feature.

## Features

* works on any language with a language server
* show functions and methods grouped by file
* jump to function location on `Ctrl/Cmd+LClick`
* supports color themes
* **ignore files by glob pattern** (e.g. exclude test files via `chartographer.ignoreOnGenerate`)
* **configurable layout direction and spacing** (vertical top-to-bottom by default)
* **configurable file group box and label visibility**
* **configurable file labels** shown beneath function names or above file groups, with an option to hide function subtitles
* **per-graph klay direction control** that relayouts the current graph immediately
* `Alt+LClick` on a node to expand connections by one level
* `Alt+Shift+LClick` to recursively expand connections
* add a function to an existing graph
* Searching for a function

## Quick start

1. Move your editor cursor over a function name (LClick it)
2. Run `Chartographer: Show all call graph` command using `Ctrl+Shift+P` or context menu (RClick) to show calls
3. Run `Chartographer: Add function to existing graph` to add function to last opened graph
4. `Alt/Opt+LClick` on a node to fetch calls for that function

## Requirements

Chartographer relies on the "call hierarchy" feature of an LSP server. So, to use Chartographer for your project analysis, you must have a language server extension that supports "call hierarchy."

## Settings

### General

| Setting | Type | Default | Description |
|---|---|---|---|
| `chartographer.ignoreOnGenerate` | `string[]` | `[]` | Glob patterns of files to ignore when fetching call hierarchy. Use this to exclude test files, e.g. `["**/*.test.*", "**/__tests__/**"]`. |
| `chartographer.highlightRoots` | `boolean` | `true` | Color root nodes in the call graph. |
| `chartographer.highlightLeaves` | `boolean` | `false` | Color leaf nodes in the call graph. |
| `chartographer.ignoreNonWorkspaceFiles` | `boolean` | `true` | Ignore files outside the current workspace. |
| `chartographer.respectGitignore` | `boolean` | `false` | Respect `.gitignore` patterns when generating call graphs. |
| `chartographer.defaultGraphLayoutAlgorithm` | `string` | `"klay"` | Layout algorithm: `klay` (default, hierarchical), `elk`, or `dagre`. |
| `chartographer.defaultKlayDirection` | `string` | `"DOWN"` | Initial flow direction for new klay graphs: `DOWN` (top-to-bottom), `RIGHT` (left-to-right), `LEFT`, or `UP`. |
| `chartographer.klaySpacing` | `number` | `1` | Spacing between nodes in the klay layout. |
| `chartographer.wheelSensitivity` | `number` | `0.1` | Sensitivity of mouse-wheel and trackpad zooming in the call graph. |
| `chartographer.showFileGroupBox` | `boolean` | `false` | Show a visible border and background box around each file group. When `false`, file grouping is used only for layout; no box is rendered. |
| `chartographer.showFileGroupLabel` | `boolean` | `false` | Show the formatted filename above each file group. When enabled, the duplicate file subtitle beneath each function name is hidden. |
| `chartographer.showFunctionFileSubtitle` | `boolean` | `false` | Show the formatted file name beneath each function name. File subtitles remain hidden when file-group labels are enabled. |
| `chartographer.nodeDisplayFormat` | `string` | `"$fileName.$fileExt"` | Format for file labels beneath function names or above file groups. Tokens: `$fileName`, `$fileExt`, `$path`, `$path{N}`, `$fullPath`. |
| `chartographer.trimFunctionNames` | `boolean` | `false` | Trim function names at the first non-alphabetic character (experimental). |
| `chartographer.colorScheme` | `string` | `"default"` | Color scheme: `default` (follows VS Code theme) or `highContrast`. |

### Colors

All color overrides accept any CSS color value (hex, `rgb()`, named colors, etc.).

| Setting | Description |
|---|---|
| `chartographer.colors.nodeBackgroundColor` | Node background |
| `chartographer.colors.nodeColor` | Node text |
| `chartographer.colors.nodeBorderColor` | Node border |
| `chartographer.colors.highlightedLeafNodeBackgroundColor` | Highlighted leaf node background |
| `chartographer.colors.highlightedLeafNodeColor` | Highlighted leaf node text |
| `chartographer.colors.highlightedRootNodeBackgroundColor` | Highlighted root node background |
| `chartographer.colors.highlightedRootNodeColor` | Highlighted root node text |
| `chartographer.colors.nodeGroupBackgroundColor` | File group box background (when `showFileGroupBox` is `true`) |
| `chartographer.colors.edgeLineColor` | Edge line color |
| `chartographer.colors.edgeArrowColor` | Edge arrow color |
| `chartographer.colors.searchHighlightBackgroundColor` | Search highlight background |
| `chartographer.colors.searchHighlightColor` | Search highlight text |
| `chartographer.colors.searchHighlightBorderColor` | Search highlight border |

### Per-graph direction

Klay graphs include a **Direction** dropdown above the graph. Changing it immediately relayouts only the current graph and does not modify `chartographer.defaultKlayDirection`. The selected direction is retained in that webview's saved state.

### Restoring the original appearance

If you prefer the original left-to-right layout with visible file group boxes and no file subtitle:

```json
{
  "chartographer.defaultGraphLayoutAlgorithm": "dagre",
  "chartographer.defaultKlayDirection": "RIGHT",
  "chartographer.showFileGroupBox": true,
  "chartographer.showFileGroupLabel": true,
  "chartographer.showFunctionFileSubtitle": false
}
```

## Development

### Package manager

This project uses [Yarn 1](https://classic.yarnpkg.com/) for dependency management and scripts.

```bash
yarn install
```

`yarn.lock` is the authoritative dependency lockfile. Do not generate or commit
`package-lock.json`; npm and Yarn lockfiles should not be maintained together.

### Build and validation

```bash
# Compile TypeScript
yarn compile

# Run ESLint
yarn lint

# Compile and run the extension test suite
yarn test

# Compile and build an installable VSIX
yarn package
```

The packaged extension is written to the repository root as
`chartographer-<version>.vsix`.

### Test a packaged extension

After running `yarn package`, reinstall the generated VSIX in VS Code or VS Code
Insiders. For example:

```bash
code-insiders --install-extension "./chartographer-1.2.0.vsix" --force
```

Reload the editor before testing the updated commands, settings, and call-graph
webview.

### Implementation map

The main files involved in graph generation and display are:

- `src/call.ts`: call-hierarchy generation, glob ignores, and `.gitignore` filtering.
- `src/graph.ts`: Cytoscape node data and configurable file-label formatting.
- `src/webview.ts`: VS Code configuration collection and webview messaging.
- `src/html/graph.html`: Cytoscape layout, styling, controls, and graph-local state.
- `plans/configurable-layout-and-display.md`: design and implementation history for the configurable graph features.

## Upcoming Features

* select multiple functions
* change graph layout algorithm on the fly
* export as image
* group by directory configuration

### For more information

* [GitHub](https://github.com/arpinfidel/vscode-chartographer)

**Enjoy!**
