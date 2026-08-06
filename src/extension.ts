import * as vscode from 'vscode'
import { buildWebview, getSelectedFunctions, lastFocusedPanel, registerWebviewPanelSerializer } from './webview'
import { getCyNodes, getNode } from './graph'
import { initLogger, printChannelOutput } from './logger'
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
                    trimFunctionNames: configs.get<boolean>('trimFunctionNames'),
                }
                lastFocusedPanel.addElems(
                    entries.flatMap((entry) => getCyNodes(getNode(workspaceRoot, entry), config))
                )
            }
        }
    )
    context.subscriptions.push(addHierarchy)

    const allDisposable = vscode.commands.registerCommand(
        'Chartographer.showAllCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Both')
            )
        }
    )
    context.subscriptions.push(allDisposable)

    const allIncomingDisposable = vscode.commands.registerCommand(
        'Chartographer.showAllIncomingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Incoming')
            )
        }
    )
    context.subscriptions.push(allIncomingDisposable)

    const allOutgoingDisposable = vscode.commands.registerCommand(
        'Chartographer.showAllOutgoingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Outgoing')
            )
        }
    )
    context.subscriptions.push(allOutgoingDisposable)


    const disposable = vscode.commands.registerCommand(
        'Chartographer.showCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Both', 1)
            )
        }
    )
    context.subscriptions.push(disposable)

    const incomingDisposable = vscode.commands.registerCommand(
        'Chartographer.showIncomingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Incoming', 1)
            )
        }
    )
    context.subscriptions.push(incomingDisposable)

    const outgoingDisposable = vscode.commands.registerCommand(
        'Chartographer.showOutgoingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Outgoing', 1)
            )
        }
    )
    context.subscriptions.push(outgoingDisposable)

    // Add new command for custom depth
    const customDepthDisposable = vscode.commands.registerCommand(
        'Chartographer.showCallGraphCustomDepth',
        async () => {
            // Ask user for input
            const depthInput = await vscode.window.showInputBox({
                prompt: 'Enter maximum depth for call graph (-1 for unlimited)',
                placeHolder: 'e.g., 2',
                validateInput: (value) => {
                    const num = parseInt(value);
                    return isNaN(num) ? 'Please enter a valid number' : null;
                }
            });

            // If user cancels, depthInput will be undefined
            if (depthInput === undefined) {
                return;
            }

            const maxDepth = parseInt(depthInput);

            // Show progress and build webview with custom depth
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph with custom depth'),
                buildWebview(context, workspaceRoot, 'Both', maxDepth)
            )
        }
    )
    context.subscriptions.push(customDepthDisposable)

    // Add command to show output channel
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

    registerWebviewPanelSerializer(context, workspaceRoot)

    registerCommands(context, workspaceRoot)
}

export function deactivate() {}
