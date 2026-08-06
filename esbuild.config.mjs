import * as esbuild from 'esbuild'

async function main() {
    await esbuild.build({
        entryPoints: ['src/webview/index.ts'],
        bundle: true,
        outfile: 'out/webview.js',
        platform: 'browser',
        format: 'iife',
        globalName: 'ChartographerWebview',
        sourcemap: true,
        minify: false,
    })
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})