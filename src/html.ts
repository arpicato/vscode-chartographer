import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function getHtmlContent(context: vscode.ExtensionContext): string {
    const filePath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'html', 'graph.html'))
    return fs.readFileSync(filePath.fsPath, 'utf8')
}

export function resolveHtml(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    let html = getHtmlContent(context)

    const webviewScriptPath = vscode.Uri.file(path.join(context.extensionPath, 'out', 'webview.js'))
    const webviewScriptURI = panel.webview.asWebviewUri(webviewScriptPath)

    html = html.replace(/{{webviewScriptURI}}/g, webviewScriptURI.toString())

    return html
}