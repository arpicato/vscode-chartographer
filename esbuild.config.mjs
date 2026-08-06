import * as esbuild from 'esbuild'

async function main() {
    await Promise.all([
        esbuild.build({
            entryPoints: ['src/extension.ts'],
            bundle: true,
            outfile: 'out/extension.js',
            platform: 'node',
            format: 'cjs',
            external: ['vscode'],
            sourcemap: true,
            minify: true,
        }),
        esbuild.build({
            entryPoints: ['src/webview/index.ts'],
            bundle: true,
            outfile: 'out/webview.js',
            platform: 'browser',
            format: 'iife',
            globalName: 'ChartographerWebview',
            sourcemap: true,
            minify: true,
        }),
    ])
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})