# Plan: Configurable Layout, Display, and Node Label Settings

## Background

This plan captures improvements made by direct file editing of the installed extension
(v1.1.1) and formalises them as proper configurable settings with updated defaults,
TypeScript source changes, and README updates.

---

## Summary of Changes Already Made (in installed extension)

| Location | Change | Status |
|---|---|---|
| `src/html/graph.html` — `getLayoutOpts()` | klay `direction` changed from `'RIGHT'` to `'DOWN'` (vertical layout) | Done (installed copy) |
| `src/html/graph.html` — `getLayoutOpts()` | klay `spacing` deduped (was set twice: 40 then 5); set to 30 | Done |
| `src/html/graph.html` — `getLayoutOpts()` | klay `borderSpacing` added: 10 | Done |
| `src/html/graph.html` — `.compound` style | Box border hidden: `'border-width': 0` | Done |
| `src/html/graph.html` — `.compound` style | Box background hidden: `'background-opacity': 0` | Done |
| `src/html/graph.html` — `.compound` style | Compound label suppressed: `'label': ''` | Done |
| `src/html/graph.html` — `.compound` style | `padding-top` reduced to 10, `text-margin-y` reduced to 5 | Done |
| `out/graph.js` — `getCyNodes()` | Inner node label now uses `formatFileLabel(n.file, config)` (respects `nodeDisplayFormat`) instead of bare function name | Done (compiled only) |
| `src/graph.ts` — `getCyNodes()` | Same change needed in TypeScript source | **Pending** |

---

## New Settings to Add

All new settings go into the `"General"` configuration block in `package.json`.

### 1. `chartographer.klayDirection`
Controls the flow direction of the klay layout.

```json
"chartographer.klayDirection": {
  "description": "Flow direction for the klay layout algorithm",
  "type": "string",
  "enum": ["DOWN", "RIGHT", "LEFT", "UP"],
  "enumDescriptions": [
    "Top-to-bottom (vertical)",
    "Left-to-right (horizontal)",
    "Right-to-left",
    "Bottom-to-top"
  ],
  "default": "DOWN"
}
```

### 2. `chartographer.klaySpacing`
Controls the spacing between nodes in the klay layout.

```json
"chartographer.klaySpacing": {
  "description": "Spacing between nodes in the klay layout algorithm",
  "type": "number",
  "default": 30
}
```

### 3. `chartographer.showFileGroupBox`
Controls whether the compound file-grouping box (border + background) is visible.

```json
"chartographer.showFileGroupBox": {
  "description": "Show a visible border and background box around nodes grouped by file",
  "type": "boolean",
  "default": false
}
```

### 4. `chartographer.showFileGroupLabel`
Controls whether the filename label appears above each node group.

```json
"chartographer.showFileGroupLabel": {
  "description": "Show the filename label above each file group in the call graph",
  "type": "boolean",
  "default": false
}
```

### 5. `chartographer.nodeLabelFormat` (rename / clarify existing `nodeDisplayFormat`)
The existing `nodeDisplayFormat` setting already controls label formatting but it was
previously only used for the *compound* (file group) label. After the `graph.ts` change
it also controls the *inner node* (function box) label. The setting remains as-is but its
description must be updated to reflect this. Its **default** should change to
`"$fileName.$fileExt"` so that boxes show e.g. `App.jsx` out of the box.

---

## Files to Change

### `src/graph.ts`

**Change:** Use `formatFileLabel` for the inner node label (fallback to `n.name` when no
`nodeDisplayFormat` is set).

```ts
// Before
const nodeName = config?.trimFunctionNames ? trimFunctionName(n.name) : n.name;
// ...
label: nodeName,

// After
const nodeName = config?.trimFunctionNames ? trimFunctionName(n.name) : n.name;
const nodeLabel = formatFileLabel(n.file, config) || nodeName;
// ...
label: nodeLabel,
```

---

### `src/html/graph.html`

#### `getLayoutOpts()` — klay block

Make `direction` and `spacing` read from `state.config`:

```js
// Before (hardcoded)
klay: {
    addUnnecessaryBendpoints: false,
    direction: 'RIGHT',
    layoutHierarchy: true,
    spacing: 40,
    compactComponents: true,
    spacing: 5,           // ← duplicate key (bug)
    thoroughness: 10,
    edgeSpacingFactor: 0.5,
    inLayerSpacingFactor: 2,
},

// After (config-driven, defaults match new settings)
klay: {
    addUnnecessaryBendpoints: false,
    direction: state.config.klayDirection ?? 'DOWN',
    layoutHierarchy: true,
    spacing: state.config.klaySpacing ?? 30,
    compactComponents: true,
    thoroughness: 10,
    edgeSpacingFactor: 0.5,
    inLayerSpacingFactor: 2,
    borderSpacing: 10,
},
```

#### `.compound` style block

Make box visibility and label driven by config:

```js
// Before (hardcoded invisible)
{
    selector: '.compound',
    style: {
        'font-size': '10px',
        'padding-top': 10,
        'background-opacity': 0,
        'border-width': 0,
        'shape': 'roundrectangle',
        'label': '',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': 5,
    }
},

// After (config-driven)
{
    selector: '.compound',
    style: {
        'font-size': '10px',
        'padding-top': state.config.showFileGroupLabel ? 25 : 10,
        'background-color': getColor(colors.compound.backgroundColor, overrides.nodeGroupBackgroundColor),
        'background-opacity': state.config.showFileGroupBox ? 1 : 0,
        'border-width': state.config.showFileGroupBox ? 1 : 0,
        'shape': 'roundrectangle',
        'label': state.config.showFileGroupLabel ? 'data(label)' : '',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': state.config.showFileGroupLabel ? 15 : 5,
    }
},
```

---

### `src/html.ts` (or `src/webview.ts` — wherever config is assembled and sent to the webview)

The new settings (`klayDirection`, `klaySpacing`, `showFileGroupBox`, `showFileGroupLabel`)
must be read from VS Code config and forwarded into `state.config` that is passed to the
webview. Check the existing pattern for how `defaultGraphLayoutAlgorithm` etc. are passed
and add the new keys in the same way.

> **Action:** Read `src/html.ts` and `src/webview.ts` to find the config assembly point,
> then add the four new keys.

---

### `package.json`

1. Add the four new settings described above to the `"General"` configuration block.
2. Update `chartographer.nodeDisplayFormat` description to clarify it now controls both
   the inner node label and the (optional) file group label.
3. Change `chartographer.nodeDisplayFormat` default to `"$fileName.$fileExt"`.
4. Change `chartographer.defaultGraphLayoutAlgorithm` default from `"dagre"` to `"klay"`.

---

### `README.md`

Add a new **Settings** section documenting all settings (existing + new), including:
- A table of all `chartographer.*` settings with type, default, and description.
- A note that `nodeDisplayFormat` now controls the inner function node label.
- A note about the new layout/display settings with before/after screenshot references.
- Remove `dim test files` from "Upcoming Features" (now implemented via `ignoreOnGenerate`).
- Move `export as image` up in the "Upcoming Features" list (still pending).

---

## Implementation Order

1. **`src/graph.ts`** — inner node label change (pure TypeScript, no config wiring needed).
2. **`src/html.ts` / `src/webview.ts`** — read new config keys and pass to webview.
3. **`src/html/graph.html`** — wire `getLayoutOpts()` and `.compound` style to config.
4. **`package.json`** — add new settings + update defaults + update `nodeDisplayFormat` description.
5. **`README.md`** — add Settings table, update feature list.
6. **Build** (`yarn compile`) and smoke-test in Extension Development Host.
7. **Bump version** to `1.2.0` in `package.json`.
8. **PR** back to `arpinfidel/vscode-chartographer` upstream.

---

## Default Behaviour After This Change (with no user settings)

| Setting | Old default | New default |
|---|---|---|
| `defaultGraphLayoutAlgorithm` | `dagre` | `klay` |
| `klayDirection` | n/a (hardcoded `RIGHT`) | `DOWN` (vertical) |
| `klaySpacing` | n/a (hardcoded `5` after bug) | `30` |
| `showFileGroupBox` | n/a (hardcoded visible) | `false` (invisible wrapper) |
| `showFileGroupLabel` | n/a (hardcoded visible) | `false` (no filename above box) |
| `nodeDisplayFormat` | `""` (path shown; function name in inner node) | `"$fileName.$fileExt"` |

Users who want the original behaviour can set `showFileGroupBox: true`,
`showFileGroupLabel: true`, `defaultGraphLayoutAlgorithm: "dagre"`, and clear
`nodeDisplayFormat`.
