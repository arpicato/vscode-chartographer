import * as vscode from 'vscode'
import { printChannelOutput } from './logger'
import { minimatch } from 'minimatch'
import * as fs from 'fs'
import * as path from 'path'

function getGitignorePatterns(workspaceRoot: string): string[] {
    const gitignorePath = path.join(workspaceRoot, '.gitignore')
    if (!fs.existsSync(gitignorePath)) {
        return []
    }

    const content = fs.readFileSync(gitignorePath, 'utf8')
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(pattern => {
            if (pattern.startsWith('/')) {
                pattern = pattern.slice(1)
            }
            if (pattern.endsWith('/')) {
                pattern = pattern + '**'
            }
            if (!pattern.startsWith('*') && !pattern.includes('/')) {
                pattern = '**/' + pattern
            }
            return pattern
        })
}

export interface CallHierarchy {
    item: vscode.CallHierarchyItem
    from?: vscode.CallHierarchyItem
    to?: vscode.CallHierarchyItem
    fromRanges: vscode.Range[]
}

export async function getCallHierarchy(
    direction: 'Incoming' | 'Outgoing' | 'Both',
    root: vscode.CallHierarchyItem,
    addEdge: (edge: CallHierarchy) => void,
    maxDepth: number = -1,
) {
    if (direction === 'Both') {
        await getCallHierarchy('Incoming', root, addEdge, maxDepth)
        await getCallHierarchy('Outgoing', root, addEdge, maxDepth)
        return
    }

    const configs = vscode.workspace.getConfiguration()
    const ignoreGlobs = configs.get<string[]>('chartographer.ignoreOnGenerate') ?? []
    const ignoreNonWorkspaceFiles = configs.get<boolean>('chartographer.ignoreNonWorkspaceFiles') ?? false
    const respectGitignore = configs.get<boolean>('chartographer.respectGitignore') ?? false

    // Get workspace root from the root item's URI
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(root.uri)
    const workspaceRoot = workspaceFolder?.uri.fsPath ?? ''

    // Combine ignore patterns
    let allIgnoreGlobs = [...ignoreGlobs]
    if (respectGitignore && workspaceRoot) {
        const gitignorePatterns = getGitignorePatterns(workspaceRoot)
        allIgnoreGlobs.push(...gitignorePatterns)
    }

    const command = direction === 'Outgoing' ? 'vscode.provideOutgoingCalls' : 'vscode.provideIncomingCalls'
    const visited: { [key: string]: boolean } = {};

    const traverse = async (node: vscode.CallHierarchyItem, depth: number = 0) => {
        // Stop traversal if we've reached the maximum depth
        if (maxDepth !== -1 && depth >= maxDepth) {
            return;
        }

        const id  = `"${node.uri}#${node.name}@${node.selectionRange.start.line}:${node.selectionRange.start.character}"`

        if (visited[id]) return
        visited[id] = true

        const calls:
            | vscode.CallHierarchyOutgoingCall[]
            | vscode.CallHierarchyIncomingCall[] = await vscode.commands.executeCommand(command, node)

        await Promise.all(calls.map(async (call) => {
            let next: vscode.CallHierarchyItem
            let edge: CallHierarchy
            if (call instanceof vscode.CallHierarchyOutgoingCall) {
                edge = { item: node, to: call.to, fromRanges: call.fromRanges }
                next = call.to
            } else {
                edge = { item: node, from: call.from, fromRanges: call.fromRanges }
                next = call.from
            }

            printChannelOutput(JSON.stringify(next, null, 2))

            let skip = false
            for (const glob of allIgnoreGlobs) {
                // Make the path relative to workspace root for gitignore pattern matching
                const relativePath = workspaceRoot ? path.relative(workspaceRoot, next.uri.fsPath) : next.uri.fsPath
                if (minimatch(relativePath, glob)) {
                    skip = true
                    break
                }
            }
            if (ignoreNonWorkspaceFiles) {
                let isInWorkspace = false
                for (const workspace of vscode.workspace.workspaceFolders ?? []) {
                    if (next.uri.fsPath.startsWith(workspace.uri.fsPath)) {
                        isInWorkspace = true
                        break
                    }
                }
                if (!isInWorkspace) {
                    skip = true
                }
            }
            if (skip) return

            addEdge(edge)
            await traverse(next, depth + 1)
        }))
    }

    await traverse(root)
}
