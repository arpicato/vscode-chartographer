import * as assert from 'assert'
import * as vscode from 'vscode'

suite('Extension', () => {
    test('should activate', async () => {
        const ext = vscode.extensions.getExtension('ArpinFidel.Chartographer')
        assert.ok(ext, 'extension not found')
        await ext?.activate()
        assert.ok(ext?.isActive, 'extension did not activate')
    })

    test('should register all commands', async () => {
        const commands = await vscode.commands.getCommands(true)
        const expected = [
            'Chartographer.addHierarchy',
            'Chartographer.showAllCallGraph',
            'Chartographer.showAllIncomingCallGraph',
            'Chartographer.showAllOutgoingCallGraph',
            'Chartographer.showCallGraph',
            'Chartographer.showIncomingCallGraph',
            'Chartographer.showOutgoingCallGraph',
            'Chartographer.showCallGraphCustomDepth',
            'Chartographer.showOutputChannel',
        ]
        for (const cmd of expected) {
            assert.ok(commands.includes(cmd), `missing command: ${cmd}`)
        }
    })
})