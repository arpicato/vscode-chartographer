import * as vscode from 'vscode'

let outputChannel: vscode.OutputChannel

export function initLogger(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel("Chartographer");
    context.subscriptions.push(outputChannel)
}

export function printChannelOutput(content: string, reveal = false): void {
    if (!outputChannel) return
    outputChannel.appendLine(content);
    if (reveal) {
        outputChannel.show(true);
    }
}