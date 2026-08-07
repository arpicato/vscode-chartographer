import * as vscode from 'vscode'
import { buildWebview, getSelectedFunctions, lastFocusedPanel, registerWebviewPanelSerializer } from './webview'
import { getCyNodes, getNode } from './graph'
import { initLogger, printChannelOutput } from './logger'
import { Direction } from './protocol'

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

function showChangelog(context: vscode.ExtensionContext) {
    const changelogUri = vscode.Uri.joinPath(context.extensionUri, "changelog.md");
    return vscode.commands.executeCommand("markdown.showPreview", changelogUri);
}

async function checkChangelog(context: vscode.ExtensionContext) {
    const currentVersion = context.extension.packageJSON.version as string;
    const lastVersion = context.globalState.get<string>("lastVersion");

    if (lastVersion !== currentVersion) {
        await showChangelog(context);
        await context.globalState.update("lastVersion", currentVersion);
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

    const showChangelogDisposable = vscode.commands.registerCommand(
        'Chartographer.showChangelog',
        () => showChangelog(context)
    )
    context.subscriptions.push(showChangelogDisposable)
}

export function activate(context: vscode.ExtensionContext) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.toString()) ?? []
    const workspaceRoot = findLongestCommonPrefix(roots)

    initLogger(context)

    void checkChangelog(context)

    registerWebviewPanelSerializer(context)

    registerCommands(context, workspaceRoot)
}

export function deactivate() {}
