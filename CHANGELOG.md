
# Change Log

## [1.2.0] 2026-08-07

- Hover + E/Shift+E/Del for expand and remove nodes
- Right-click context menu with remove, expand, and go to function
- User-configurable `trimFunctionPattern` regex (replaces boolean `trimFunctionNames`)
- `defaultDirection` config: horizontal or vertical layout for all algorithms
- `wheelSensitivity` config: zoom sensitivity (0.01-10)
- `showFileGroupBox` / `showFileGroupLabel` config: toggle file group visibility
- Consolidate 6 commands into 1 quickPick (direction + depth)
- esbuild bundling: faster build, smaller VSIX, type-safe webview code
- Typed message protocol between extension and webview
- Fix .gitignore pattern conversion (was commented out)
- Fix panel state restoration across restarts
- Fix crash when no editor is active
- Fix serialized URI revive on panel restore
- 25 unit tests + VS Code integration test

## [1.1.0] 2025-03-18

- Added parameterized node group name forming
- Added option to trim method name on first non alphabet character

## [1.0.18] 2025-03-17

- Added high contrast color scheme option
- Added options to override colors
- Added option to ignore files based on .gitignore

## [1.0.17] 2025-03-11

- Fix search result zooms in on the wrong part of the screen

## [1.0.16] 2025-03-11

- Add search bar
- Fix "Can't resolve entry function" when expanding graph
- Fix jump to function also expands graph
- Add options to only open/expand graphs by one level
- Fix help info overlaps with reset zoom button

## [1.0.15] 2025-03-10

- Fix issue with missing bundled library files

## [1.0.14] 2025-03-10

- Add reset zoom button
- Adjust zoom sensitivity
- Add min and max zoom
- Bundle libraries used in webview

## [1.0.13] 2023-11-02

- I don't know why this version exists

## [1.0.12] 2023-11-02

- Add command to add function to last active graph

## [1.0.11] 2023-11-01

- Add options for graph layout algorithms

## [1.0.10] 2023-10-31

- Fix missing dependency

## [1.0.9] 2023-10-30

- Fix issues with highlighting
- Allow highlighting a whole group
- Allow user to expand graph with alt click

## [1.0.8] 2023-10-26

- Fix configuration not loaded

## [1.0.7] 2023-10-26

- Fix missing dependency

## [1.0.6] 2023-10-26

- Optimize graph generation
- Add highlights for roots and leaves
- Add option to ignore files outside of workspace

## [1.0.5] 2023-10-26

- Add ignore config
- Fix webview fails to load after reloading vs code

## [1.0.3] 2023-10-25

- Add highlighting

## [1.0.0] 2023-10-22

- Initial release

