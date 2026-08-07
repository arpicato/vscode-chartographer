import cytoscape, { Core } from 'cytoscape'
import cytoscapeDagre from 'cytoscape-dagre'
import cytoscapeElk from 'cytoscape-elk'
import cytoscapeKlay from 'cytoscape-klay'
import { ChartographerConfig, LayoutDirection, WebviewToExtensionMessage, ExtensionToWebviewMessage, WebviewState } from '../protocol'

cytoscape.use(cytoscapeDagre)
cytoscape.use(cytoscapeElk)
cytoscape.use(cytoscapeKlay)

interface VsCodeApi {
    postMessage(message: WebviewToExtensionMessage): void
    getState(): WebviewState | null
    setState(state: WebviewState): void
}

declare function acquireVsCodeApi(): VsCodeApi

const vscode = acquireVsCodeApi()
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
let cy: Core | null = null
let hoveredNodeId: string | null = null

const t0 = performance.now()
let t1 = 0, t2 = 0, t3 = 0

const previousState = vscode.getState()
let state: WebviewState = previousState || {
    config: {},
    elems: [],
}
if (!state.elems) state.elems = []

let expandedNodes: Set<string> = new Set()

const layoutDebounce: Record<string, number> = {
    klay: 5,
    elk: 500,
    dagre: 5,
}

function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
    let timer: number | undefined
    return ((...args: unknown[]) => {
        clearTimeout(timer)
        timer = setTimeout(() => func(...args), delay) as unknown as number
    }) as T
}

const colorSchemes: Record<string, Record<string, Record<string, string>>> = {
    default: {
        node: {
            backgroundColor: '--vscode-menu-background',
            color: '--vscode-menu-foreground',
            borderColor: '--vscode-editor-foreground',
        },
        highlightedLeafNode: {
            backgroundColor: '--vscode-editorWarning-background',
            color: '--vscode-editorWarning-foreground',
        },
        highlightedRootNode: {
            backgroundColor: '--vscode-editorError-background',
            color: '--vscode-editorError-foreground',
        },
        compound: {
            backgroundColor: '--vscode-editor-background',
        },
        edge: {
            lineColor: '--vscode-editor-foreground',
            arrowColor: '--vscode-editor-foreground',
        },
        searchHighlight: {
            backgroundColor: '--vscode-editor-selectionBackground',
            color: '--vscode-editor-selectionForeground',
            borderColor: '--vscode-focusBorder',
        },
    },
    highContrast: {
        node: {
            backgroundColor: '#000000',
            color: '#FFFFFF',
            borderColor: '#FFFFFF',
        },
        highlightedLeafNode: {
            backgroundColor: '#0000FF',
            color: '#FFFFFF',
        },
        highlightedRootNode: {
            backgroundColor: '#FF0000',
            color: '#FFFFFF',
        },
        compound: {
            backgroundColor: '#000000',
        },
        edge: {
            lineColor: '#FFFFFF',
            arrowColor: '#FFFFFF',
        },
        searchHighlight: {
            backgroundColor: '#FFFF00',
            color: '#000000',
            borderColor: '#FFFFFF',
        },
    },
}

function getCyStyle(): cytoscape.StylesheetStyle[] {
    const style = getComputedStyle(document.body)
    const getStyle = (name: string): string => style.getPropertyValue(name).trim()

    const selectedScheme = state.config.colorScheme || 'default'
    const colors = colorSchemes[selectedScheme]
    const overrides = state.config.colors || {}

    const getColor = (colorValue: string, overrideValue?: string): string => {
        if (overrideValue) return overrideValue
        return colorValue.startsWith('--') ? getStyle(colorValue) : colorValue
    }

    return [
        {
            selector: 'node',
            style: {
                'font-size': '12px',
                'background-color': getColor(colors.node.backgroundColor, overrides.nodeBackgroundColor),
                color: getColor(colors.node.color, overrides.nodeColor),
                width: 'label',
                padding: '5px',
                'border-color': getColor(colors.node.borderColor, overrides.nodeBorderColor),
                'border-width': 1,
                shape: 'roundrectangle',
                label: 'data(label)',
                'text-halign': 'center',
                'text-valign': 'center',
            },
        },
        {
            selector: '.dimmedNode',
            style: { opacity: 0.5 },
        },
        {
            selector: '.highlightedNode',
            style: { opacity: 1 },
        },
        {
            selector: '.highlightedLeafNode',
            style: {
                'background-color': getColor(colors.highlightedLeafNode.backgroundColor, overrides.highlightedLeafNodeBackgroundColor),
                color: getColor(colors.highlightedLeafNode.color, overrides.highlightedLeafNodeColor),
            },
        },
        {
            selector: '.highlightedRootNode',
            style: {
                'background-color': getColor(colors.highlightedRootNode.backgroundColor, overrides.highlightedRootNodeBackgroundColor),
                color: getColor(colors.highlightedRootNode.color, overrides.highlightedRootNodeColor),
            },
        },
        {
            selector: '.compound',
            style: {
                'font-size': '10px',
                'padding-top': '25px',
                'background-color': state.config.showFileGroupBox
                    ? getColor(colors.compound.backgroundColor, overrides.nodeGroupBackgroundColor)
                    : 'transparent',
                'border-width': state.config.showFileGroupBox ? 1 : 0,
                'border-color': getColor(colors.node.borderColor, overrides.nodeBorderColor),
                shape: 'roundrectangle',
                label: state.config.showFileGroupLabel ? 'data(label)' : '',
                'text-valign': 'top',
                'text-halign': 'center',
                'text-margin-y': 15,
            },
        },
        {
            selector: 'edge',
            style: {
                'curve-style': 'unbundled-bezier',
                'target-arrow-shape': 'triangle',
                'line-color': getColor(colors.edge.lineColor, overrides.edgeLineColor),
                'target-arrow-color': getColor(colors.edge.arrowColor, overrides.edgeArrowColor),
                opacity: 0.5,
            },
        },
        {
            selector: '.dimmedEdge',
            style: { opacity: 0.2 },
        },
        {
            selector: '.highlightedEdge',
            style: { opacity: 1 },
        },
        {
            selector: '.searchHighlight',
            style: {
                'background-color': getColor(colors.searchHighlight.backgroundColor, overrides.searchHighlightBackgroundColor),
                color: getColor(colors.searchHighlight.color, overrides.searchHighlightColor),
                'border-width': 2,
                'border-color': getColor(colors.searchHighlight.borderColor, overrides.searchHighlightBorderColor),
            },
        },
    ]
}

function resetRootHighlights(): void {
    if (state.config.highlightRoots && cy) {
        cy.nodes().removeClass('highlightedRootNode')
        cy.nodes().roots().not(':parent').addClass('highlightedRootNode')
    }
}

function resetLeafHighlights(): void {
    if (state.config.highlightLeaves && cy) {
        cy.nodes().removeClass('highlightedLeafNode')
        cy.nodes().leaves().not(':parent').addClass('highlightedLeafNode')
    }
}

function resetHighlights(): void {
    if (!cy) return
    cy.nodes().removeClass(['dimmedNode', 'highlightedNode', 'searchHighlight'])
    cy.edges().removeClass(['dimmedEdge', 'highlightedEdge'])
    cy.nodes().data('isHighlighted', false)
}

function toggleInstructions(): void {
    const instructions = document.getElementById('instructions')
    if (!instructions) return
    if (instructions.style.display === 'none' || instructions.style.display === '') {
        instructions.style.display = 'block'
    } else {
        instructions.style.display = 'none'
    }
}

function setupSearch(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null
    const searchResults = document.getElementById('search-results')
    if (!searchInput || !searchResults) return

    const debouncedSearch = debounce(() => {
        const query = searchInput.value.toLowerCase().trim()
        if (query.length < 2) {
            searchResults.style.display = 'none'
            resetHighlights()
            return
        }

        const matchingNodes = cy!.nodes().filter(node => {
            const label = node.data('label') || ''
            return label.toLowerCase().includes(query)
        })

        searchResults.innerHTML = ''
        if (matchingNodes.length > 0) {
            searchResults.style.display = 'block'
            matchingNodes.forEach(node => {
                const resultItem = document.createElement('div')
                resultItem.className = 'search-result-item'
                resultItem.textContent = node.data('label')
                resultItem.addEventListener('click', () => {
                    resetHighlights()
                    node.addClass('searchHighlight')
                    cy?.animate({
                        fit: { eles: node, padding: 50 },
                        zoom: 1.5,
                        duration: 200,
                    } as cytoscape.AnimationOptions)
                    searchResults.style.display = 'none'
                })
                searchResults.appendChild(resultItem)
            })
        } else {
            searchResults.style.display = 'none'
        }
    }, 300)

    searchInput.addEventListener('input', debouncedSearch)

    document.addEventListener('click', event => {
        if (!searchResults.contains(event.target as Node) && event.target !== searchInput) {
            searchResults.style.display = 'none'
        }
    })
}

function getLayoutOpts(): cytoscape.LayoutOptions {
    const algo = state.config.defaultGraphLayoutAlgorithm || 'klay'
    const dir = state.config.defaultDirection || 'horizontal'
    const klayDir = dir === 'horizontal' ? 'RIGHT' : 'DOWN'
    const dagreDir = dir === 'horizontal' ? 'LR' : 'TB'

    const base: Record<string, unknown> = {
        name: algo,
        animate: true,
        animationDuration: 250,
        klay: {
            addUnnecessaryBendpoints: false,
            direction: klayDir,
            layoutHierarchy: true,
            spacing: 5,
            compactComponents: true,
            thoroughness: 10,
            edgeSpacingFactor: 0.5,
            inLayerSpacingFactor: 2,
        },
        elk: {
            algorithm: 'layered',
            'elk.direction': dir === 'horizontal' ? 'RIGHT' : 'DOWN',
        },
        rankDir: dagreDir,
        rankSep: 15,
        nodeSep: 15,
        edgeSep: 15,
        ranker: 'network-simplex',
    }
    return base as unknown as cytoscape.LayoutOptions
}

const debouncedLayout = debounce(() => {
    if (!cy) return
    cy.layout(getLayoutOpts()).run()
    vscode.setState(state)
}, layoutDebounce[state.config.defaultGraphLayoutAlgorithm || 'dagre'])

const methods: {
    [K in ExtensionToWebviewMessage['type']]: (msg: Extract<ExtensionToWebviewMessage, { type: K }>) => void
} = {
    setParams(msg) {
        t1 = performance.now()
        state = { ...state, config: msg.data.config }
        vscode.postMessage({ type: 'state', data: 'ready' })
        start()
    },
addElems(msg) {
        t2 = performance.now()
        state.elems = state.elems.concat(msg.data)
        cy?.add(msg.data)
        vscode.setState(state)
        resetRootHighlights()
        resetLeafHighlights()
        resetHighlights()
        debouncedLayout()
        t3 = performance.now()
        vscode.postMessage({
            type: 'timing',
            data: {
                scriptLoad: t1 - t0,
                toReady: t2 - t1,
                render: t3 - t2,
                total: t3 - t0,
            },
        } as any)
    },
}

window.addEventListener('message', event => {
    const message = event.data as ExtensionToWebviewMessage
    const handler = methods[message.type]
    if (handler) {
        handler(message as any)
    }
})

function isCtrlClick(evt: cytoscape.EventObject): boolean {
    const e = evt.originalEvent as MouseEvent | undefined
    if (!e) return false
    if (isMac) return e.metaKey
    return e.ctrlKey
}

function isAltClick(evt: cytoscape.EventObject): boolean {
    const e = evt.originalEvent as MouseEvent | undefined
    return e?.altKey || false
}

function isShiftClick(evt: cytoscape.EventObject): boolean {
    const e = evt.originalEvent as MouseEvent | undefined
    return e?.shiftKey || false
}

function removeNode(id: string): void {
    if (!cy) return
    const node = cy.getElementById(id)
    if (node.length === 0) return
    cy.remove(node)
    state.elems = state.elems.filter(e => e.data?.id !== id)
    vscode.setState(state)
}

function removeSubtree(id: string, direction: 'descendants' | 'ancestors'): void {
    if (!cy) return
    const node = cy.getElementById(id)
    if (node.length === 0) return

    const nodes = direction === 'descendants'
        ? node.successors()
        : node.predecessors()
    const all = nodes as cytoscape.CollectionReturnValue
    const ids = all.map(n => n.id())

    cy.remove(all)
    state.elems = state.elems.filter(e => e.data?.id && !ids.includes(e.data.id))
    expandedNodes.forEach((_, k) => { if (ids.includes(k)) expandedNodes.delete(k) })
    vscode.setState(state)
    debouncedLayout()
}

function showContextMenu(x: number, y: number, nodeId: string): void {
    const menu = document.getElementById('context-menu')
    if (!menu) return

    const label = cy?.getElementById(nodeId).data('label') || nodeId

    menu.innerHTML = `
        <div class="context-menu-item" data-action="remove">Remove "${label}" <span class="shortcut">Del</span></div>
        <div class="context-menu-item" data-action="removeDescendants">Remove descendants</div>
        <div class="context-menu-item" data-action="removeAncestors">Remove ancestors</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="expand">Expand one level <span class="shortcut">E</span></div>
        <div class="context-menu-item" data-action="expandAll">Expand recursively <span class="shortcut">Shift+E</span></div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="goTo">Go to function <span class="shortcut">Ctrl+Click</span></div>
    `

    menu.style.display = 'block'
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    menu.dataset.nodeId = nodeId

    const close = () => {
        menu.style.display = 'none'
        document.removeEventListener('click', closeOutside)
    }
    const closeOutside = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
            close()
        }
    }
    setTimeout(() => document.addEventListener('click', closeOutside), 0)
}

function handleContextAction(action: string, nodeId: string): void {
    switch (action) {
        case 'remove':
            removeNode(nodeId)
            break
        case 'removeDescendants':
            removeSubtree(nodeId, 'descendants')
            break
        case 'removeAncestors':
            removeSubtree(nodeId, 'ancestors')
            break
        case 'expand':
            vscode.postMessage({ type: 'expandBoth', data: { id: nodeId, depth: 1 } })
            break
        case 'expandAll':
            vscode.postMessage({ type: 'expandBoth', data: { id: nodeId, depth: -1 } })
            break
        case 'goTo':
            vscode.postMessage({ type: 'goToFunction', data: nodeId })
            break
    }
}

function start(): void {
    const container = document.getElementById('cy')
    if (!container) return

    container.addEventListener('contextmenu', e => e.preventDefault())
    container.addEventListener('mousedown', () => {
        document.body.focus()
    })

    cy = cytoscape({
        container,
        style: getCyStyle(),
        elements: state.elems,
        wheelSensitivity: state.config.wheelSensitivity ?? 0.5,
        minZoom: 0.075,
        maxZoom: 7.5,
    })

    cy!.layout(getLayoutOpts()).run()

    setupSearch()

    document.getElementById('reset-zoom')?.addEventListener('click', () => cy?.fit())

    cy!.on('mouseover', 'node', function (e) {
        hoveredNodeId = e.target.id()
    })
    cy!.on('mouseout', 'node', function () {
        hoveredNodeId = null
    })

    document.addEventListener('keydown', function (e) {
        if (!hoveredNodeId) return
        const node = cy?.getElementById(hoveredNodeId)
        if (!node || node.length === 0) return

        if (e.key === 'e' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault()
            vscode.postMessage({ type: 'expandBoth', data: { id: hoveredNodeId, depth: 1 } })
        } else if (e.key === 'e' && e.shiftKey) {
            e.preventDefault()
            vscode.postMessage({ type: 'expandBoth', data: { id: hoveredNodeId, depth: -1 } })
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault()
            removeNode(hoveredNodeId)
        }
    })

    cy!.on('tap', function (e) {
        if (e.target === cy) {
            resetHighlights()
        }
    })

    cy!.on('tap', 'node', function (e) {
        const node = e.target

        if (isCtrlClick(e)) {
            vscode.postMessage({
                type: 'goToFunction',
                data: node.id(),
            })
            return
        }

        if (!node.data('isHighlighted')) {
            resetHighlights()

            node.data('isHighlighted', true)
            node.parent().data('isHighlighted', true)
            if (node.children().size() === 1) {
                node.children().data('isHighlighted', true)
            }

            let neighborhood: cytoscape.CollectionReturnValue = node
            neighborhood = neighborhood.add(node.children())
            neighborhood = neighborhood.add(neighborhood.neighborhood())
            neighborhood = neighborhood.add(neighborhood.parent())

            neighborhood.nodes().addClass('highlightedNode')
            neighborhood.edges().addClass('highlightedEdge')

            cy!.nodes().not('.highlightedNode').addClass('dimmedNode')
            cy!.edges().not('.highlightedEdge').addClass('dimmedEdge')
        } else {
            node.data('isHighlighted', false)
            node.parent().data('isHighlighted', false)
            node.children().data('isHighlighted', false)
            cy!.nodes().removeClass(['highlightedNode', 'dimmedNode'])
            cy!.edges().removeClass(['highlightedEdge', 'dimmedEdge'])
        }
    })

    cy!.on('cxttap', 'node', function (e) {
        const rendered = e.target.renderedPosition()
        showContextMenu(rendered.x, rendered.y, e.target.id())
    })

    document.getElementById('context-menu')?.addEventListener('click', function (e) {
        const item = (e.target as HTMLElement).closest('.context-menu-item') as HTMLElement | null
        if (!item) return
        const action = item.dataset.action
        const nodeId = this.dataset.nodeId
        if (!action || !nodeId) return
        this.style.display = 'none'
        handleContextAction(action, nodeId)
    })
}

document.addEventListener('DOMContentLoaded', function () {
    document.body.setAttribute('tabindex', '0')
    document.body.focus()
    vscode.postMessage({ type: 'state', data: 'loaded' })
})