import * as vscode from 'vscode'
import { buildWebview, getSelectedFunctions, lastFocusedPanel, registerWebviewPanelSerializer } from './webview'
import { getCyNodes, getNode } from './graph'
import { initLogger, printChannelOutput } from './logger'
import { Direction } from './protocol'
import * as path from "path";

const getDefaultProgressOptions = (title: string): vscode.ProgressOptions => {
    return {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
    }
}

function findLongestCommonPrefix(strs: string[]): string {
    if (strs.length === 0) {
        return "";
    }

    const sorted = [...strs].sort();

    const firstStr = sorted[0];
    const lastStr = sorted[sorted.length - 1];
    let prefix = "";

    for (let i = 0; i < firstStr.length; i++) {
        if (firstStr.charAt(i) === lastStr.charAt(i)) {
            prefix += firstStr.charAt(i);
        } else {
            break;
        }
    }

    return prefix;
}

function showChangelog() {
    const changelogUri = vscode.Uri.file(path.join(__dirname, "..", "CHANGELOG.md"));

    // Open the Markdown file in preview mode
    vscode.commands.executeCommand("markdown.showPreview", changelogUri);
}

function checkChangelog(context: vscode.ExtensionContext) {
    const currentVersion = vscode.extensions.getExtension("ArpinFidel.Chartographer")?.packageJSON.version;
    const lastVersion = context.globalState.get<string>("lastVersion");


    if (currentVersion && lastVersion !== currentVersion) {
        context.globalState.update("lastVersion", currentVersion);
        showChangelog();
    }
}

function registerCommands(context: vscode.ExtensionContext, workspaceRoot: string) {
    const addHierarchy = vscode.commands.registerCommand(
        'Chartographer.addHierarchy',
        async () => {
            const entries = await getSelectedFunctions()
            if (lastFocusedPanel) {
                const configs = vscode.workspace.getConfiguration('chartographer')
                const config = {
                    nodeDisplayFormat: configs.get<string>('nodeDisplayFormat'),
                    trimFunctionPattern: configs.get<string>('trimFunctionPattern'),
                }
                lastFocusedPanel.addElems(
                    entries.flatMap((entry) => getCyNodes(getNode(workspaceRoot, entry), config))
                )
            }
        }
    )
    context.subscriptions.push(addHierarchy)

    const showCallGraph = vscode.commands.registerCommand(
        'Chartographer.showCallGraph',
        async () => {
            const direction = await vscode.window.showQuickPick(
                [
                    { label: 'Both', description: 'Show incoming and outgoing calls' },
                    { label: 'Incoming', description: 'Show calls to this function' },
                    { label: 'Outgoing', description: 'Show calls from this function' },
                ],
                { placeHolder: 'Select call direction' }
            )
            if (!direction) return

            const depth = await vscode.window.showInputBox({
                prompt: 'Maximum depth (leave empty for unlimited)',
                placeHolder: 'e.g., 2',
                validateInput: (value) => {
                    if (value === '') return null
                    const num = parseInt(value)
                    return isNaN(num) ? 'Enter a number' : null
                }
            })
            if (depth === undefined) return

            const maxDepth = depth === '' ? -1 : parseInt(depth)

            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, direction.label as Direction, maxDepth)
            )
        }
    )
    context.subscriptions.push(showCallGraph)

    const showOutputChannelDisposable = vscode.commands.registerCommand(
        'Chartographer.showOutputChannel',
        () => {
            printChannelOutput('Chartographer output channel', true)
        }
    )
    context.subscriptions.push(showOutputChannelDisposable)
}

export function activate(context: vscode.ExtensionContext) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.toString()) ?? []
    const workspaceRoot = findLongestCommonPrefix(roots)

    initLogger(context)

    checkChangelog(context)

    registerWebviewPanelSerializer(context)

    registerCommands(context, workspaceRoot)
}

export function deactivate() {}
