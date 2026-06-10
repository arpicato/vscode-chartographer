import * as vscode from 'vscode'
import { CyNode, Element, getCyElems } from './graph'
import { getHtmlContent } from './html'
import { CallHierarchy, getCallHierarchy as buildGraph } from './call'
import * as path from 'path'
import * as fs from 'fs'
import { printChannelOutput } from './extension'

type State = {
    elems: Element[],
}

type Params = {
    direction: 'Incoming' | 'Outgoing' | 'Both',
    entryPoints: vscode.CallHierarchyItem[],
    maxDepth?: number,
}

export const buildWebview = (
    context: vscode.ExtensionContext,
	workspaceRoot: string,
    direction: 'Incoming' | 'Outgoing' | 'Both',
    maxDepth: number=-1,
) => {
    return async () => {
        const entries: vscode.CallHierarchyItem[] = await getSelectedFunctions()

        const webviewType = `Chartographer.previewCallGraph`
        const panel = vscode.window.createWebviewPanel(
            webviewType,
            `Chartographer Call Graph`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
            }
        )

        const { handler, html } = setupCallGraph(context, workspaceRoot, panel, {direction, entryPoints: entries, maxDepth})

        panel.webview.onDidReceiveMessage(handler)
        panel.webview.html = html
    }
}

export const registerWebviewPanelSerializer = (
    context: vscode.ExtensionContext,
	workspaceRoot: string,
) => {
    vscode.window.registerWebviewPanelSerializer(`Chartographer.previewCallGraph`,
        {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                if (!state) {
                    vscode.window.showErrorMessage(
                        'Chartographer: fail to load previous state'
                    )
                    return
                }

                const { handler, html } = setupCallGraph(context, workspaceRoot, webviewPanel, undefined, state)

                webviewPanel.webview.html = html
                webviewPanel.webview.onDidReceiveMessage(handler)
            }
        }
    )
}

export async function getSelectedFunctions() {
	const activeTextEditor = vscode.window.activeTextEditor!
	const entry: vscode.CallHierarchyItem[] = await vscode.commands.executeCommand(
		'vscode.prepareCallHierarchy',
		activeTextEditor.document.uri,
		activeTextEditor.selection.active
	)
	if (!entry || !entry[0]) {
		const msg = "Can't resolve entry function"
		vscode.window.showErrorMessage(msg)
		throw new Error(msg)
	}

	return entry
}

export let lastFocusedPanel: {
	panel: vscode.WebviewPanel,
	addElems: (elems: Element[]) => void,
	addEdge: (edge: CallHierarchy) => void,
} | undefined = undefined
export function setupCallGraph(
    context: vscode.ExtensionContext,
	workspaceRoot: string,
    panel: vscode.WebviewPanel,
    params?: Params,
    state?: State,
) {
    const libsPath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'libs'));
    const libsURI = panel.webview.asWebviewUri(libsPath);
    var html = getHtmlContent(context);
    html = html.replace(/{{libsURI}}/g, libsURI.toString());

    const configs = vscode.workspace.getConfiguration('chartographer')
    const config = {
        highlightRoots: configs.get<boolean>('highlightRoots'),
        highlightLeaves: configs.get<boolean>('highlightLeaves'),
        defaultGraphLayoutAlgorithm: configs.get<string>('defaultGraphLayoutAlgorithm'),
        colorScheme: configs.get<string>('colorScheme'),
        nodeDisplayFormat: configs.get<string>('nodeDisplayFormat'),
        trimFunctionNames: configs.get<boolean>('trimFunctionNames'),
        defaultKlayDirection: configs.get<string>('defaultKlayDirection'),
        klaySpacing: configs.get<number>('klaySpacing'),
        showFileGroupBox: configs.get<boolean>('showFileGroupBox'),
        showFileGroupLabel: configs.get<boolean>('showFileGroupLabel'),
        showFunctionFileSubtitle: configs.get<boolean>('showFunctionFileSubtitle'),
        colors: {
            nodeBackgroundColor: configs.get<string>('colors.nodeBackgroundColor'),
            nodeColor: configs.get<string>('colors.nodeColor'),
            nodeBorderColor: configs.get<string>('colors.nodeBorderColor'),
            highlightedLeafNodeBackgroundColor: configs.get<string>('colors.highlightedLeafNodeBackgroundColor'),
            highlightedLeafNodeColor: configs.get<string>('colors.highlightedLeafNodeColor'),
            highlightedRootNodeBackgroundColor: configs.get<string>('colors.highlightedRootNodeBackgroundColor'),
            highlightedRootNodeColor: configs.get<string>('colors.highlightedRootNodeColor'),
            nodeGroupBackgroundColor: configs.get<string>('colors.nodeGroupBackgroundColor'),
            edgeLineColor: configs.get<string>('colors.edgeLineColor'),
            edgeArrowColor: configs.get<string>('colors.edgeArrowColor'),
            searchHighlightBackgroundColor: configs.get<string>('colors.searchHighlightBackgroundColor'),
            searchHighlightColor: configs.get<string>('colors.searchHighlightColor'),
            searchHighlightBorderColor: configs.get<string>('colors.searchHighlightBorderColor')
        }
    }
    printChannelOutput("config:")
    printChannelOutput(JSON.stringify(config, null, 4))

	// panel.onDidChangeViewState((e) => {
	// 	if (panel.visible) {
	// 		lastFocusedPanel = panel
	// 	}
	// })

    const nodes: { [key: string]: Element}  = {}
    const addElems = (elems: Element[]) => {
        for (const node of elems) {
            if (nodes[node.data.id]) continue
            nodes[node.data.id] = node
        }
        panel.webview.postMessage({
            type: 'addElems',
            data: elems,
        })
    }
    const addEdge = (edge: CallHierarchy) => {
        const elems = getCyElems(workspaceRoot, edge, config)
        addElems(elems)
    }

    const handler = async (msg: any) => {
        switch (msg.type) {
            case 'state':
                switch (msg.data) {
                    case 'loaded':
                        panel.webview.postMessage({
                            type: 'setParams',
                            data: {
                                config,
                            },
                        })
                        break

                    case 'ready':
                        lastFocusedPanel = {
							panel,
							addElems,
							addEdge,
						}

                        if (params) {
							Promise.all(params.entryPoints.map(async (entry) => {
								await buildGraph(params.direction, entry, addEdge, params.maxDepth)
							}))
                        }
                        if (state) {
                            for (const node of state.elems) {
                                if (nodes[node.data.id]) continue
                                nodes[node.data.id] = node
                            }
                            panel.webview.postMessage({
                                type: 'addElems',
                                data: state.elems,
                            })
                        }
                        break
                }

            case 'goToFunction':
                var node = nodes[msg.data] as CyNode
                if (!node) return

                const range = new vscode.Range(
                    node.data.line,
                    node.data.character,
                    node.data.line,
                    node.data.character,
                )
                vscode.window.showTextDocument(node.data.uri, {
                    selection: range,
                    preview: true,
                    viewColumn: vscode.ViewColumn.One,
                })
                break

            case 'expandBoth':
                // const uri = vscode.Uri.file(msg.data.uri.fsPath)
                var node = nodes[msg.data.id] as CyNode
                if (!node) return
                const position = new vscode.Position(node.data.line, node.data.character)
                const item: vscode.CallHierarchyItem[] =
                    await vscode.commands.executeCommand(
                        'vscode.prepareCallHierarchy',
                        node.data.uri,
                        position,
                    )
                if (!item || !item[0]) {
                    const msg = "Can't resolve entry function"
                    vscode.window.showErrorMessage(msg)
                    throw new Error(msg)
                }

                await buildGraph('Both', item[0], addEdge, msg.data.depth)
                break
        }
    }
    return { handler, html }
}
