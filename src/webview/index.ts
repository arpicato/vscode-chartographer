import cytoscape, { Core, EventObject, NodeSingular } from 'cytoscape'
import cytoscapeDagre from 'cytoscape-dagre'
import cytoscapeElk from 'cytoscape-elk'
import cytoscapeKlay from 'cytoscape-klay'

cytoscape.use(cytoscapeDagre)
cytoscape.use(cytoscapeElk)
cytoscape.use(cytoscapeKlay)

interface Config {
    highlightRoots?: boolean
    highlightLeaves?: boolean
    defaultGraphLayoutAlgorithm?: 'klay' | 'elk' | 'dagre'
    colorScheme?: string
    nodeDisplayFormat?: string
    trimFunctionNames?: boolean
    colors?: Record<string, string>
}

interface WebviewState {
    config: Config
    elems: cytoscape.ElementDefinition[]
}

interface VsCodeApi {
    postMessage(message: unknown): void
    getState(): WebviewState | null
    setState(state: WebviewState): void
}

declare function acquireVsCodeApi(): VsCodeApi

const vscode = acquireVsCodeApi()
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
let cy: Core | null = null

const previousState = vscode.getState()
let state: WebviewState = previousState || {
    config: {},
    elems: [],
}

const layoutDebounce: Record<string, number> = {
    klay: 5,
    elk: 500,
    dagre: 5,
}

function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
    let timer: ReturnType<typeof setTimeout> | undefined
    return ((...args: unknown[]) => {
        clearTimeout(timer)
        timer = setTimeout(() => func(...args), delay)
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

function getCyStyle(): cytoscape.Stylesheet[] {
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
                'padding-top': 25,
                'background-color': getColor(colors.compound.backgroundColor, overrides.nodeGroupBackgroundColor),
                shape: 'roundrectangle',
                label: 'data(label)',
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

        const matchingNodes = cy?.nodes().filter(node => {
            const label = node.data('label') || ''
            return label.toLowerCase().includes(query)
        }) || cy.collection()

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
    const base: Record<string, unknown> = {
        name: state.config.defaultGraphLayoutAlgorithm,
        animate: true,
        animationDuration: 250,
        klay: {
            addUnnecessaryBendpoints: false,
            direction: 'RIGHT',
            layoutHierarchy: true,
            spacing: 5,
            compactComponents: true,
            thoroughness: 10,
            edgeSpacingFactor: 0.5,
            inLayerSpacingFactor: 2,
        },
        elk: {
            algorithm: 'layered',
        },
        rankDir: 'LR',
        rankSep: 15,
        nodeSep: 15,
        edgeSep: 15,
        ranker: 'network-simplex',
    }
    return base as cytoscape.LayoutOptions
}

const debouncedLayout = debounce(() => {
    if (!cy) return
    cy.layout(getLayoutOpts()).run()
    vscode.setState(state)
}, layoutDebounce[state.config.defaultGraphLayoutAlgorithm || 'dagre'])

const methods: Record<string, (data: unknown) => void> = {
    setParams(newParams: unknown) {
        state = { ...state, ...(newParams as Partial<WebviewState>) }
        vscode.postMessage({ type: 'state', data: 'ready' })
        start()
    },
    addElems(newElems: unknown) {
        const elems = newElems as cytoscape.ElementDefinition[]
        state.elems = state.elems.concat(elems)
        cy?.add(elems)
        resetRootHighlights()
        resetLeafHighlights()
        resetHighlights()
        debouncedLayout()
    },
}

window.addEventListener('message', event => {
    const message = event.data as { type: string; data: unknown }
    const handler = methods[message.type]
    if (handler) {
        handler(message.data)
    }
})

function isCtrlClick(event: EventObject): boolean {
    const e = event.originalEvent as MouseEvent | undefined
    if (!e) return false
    if (isMac) return e.metaKey
    return e.ctrlKey
}

function isAltClick(event: EventObject): boolean {
    const e = event.originalEvent as MouseEvent | undefined
    return e?.altKey || false
}

function isShiftClick(event: EventObject): boolean {
    const e = event.originalEvent as MouseEvent | undefined
    return e?.shiftKey || false
}

function start(): void {
    const container = document.getElementById('cy')
    if (!container) return

    cy = cytoscape({
        container,
        style: getCyStyle(),
        elements: state.elems,
        wheelSensitivity: 0.5,
        minZoom: 0.075,
        maxZoom: 7.5,
    })

    cy.layout(getLayoutOpts()).run()

    setupSearch()

    cy.on('tap', function (e) {
        if (e.target === cy) {
            resetHighlights()
        }
    })

    cy.on('tap', 'node', function (e) {
        const node = e.target

        if (isCtrlClick(e)) {
            vscode.postMessage({
                type: 'goToFunction',
                data: node.id(),
            })
            return
        }

        if (isAltClick(e)) {
            if (isShiftClick(e)) {
                vscode.postMessage({
                    type: 'expandBoth',
                    data: { id: node.id(), depth: -1 },
                })
            } else {
                vscode.postMessage({
                    type: 'expandBoth',
                    data: { id: node.id(), depth: 1 },
                })
            }
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

            cy.nodes().not('.highlightedNode').addClass('dimmedNode')
            cy.edges().not('.highlightedEdge').addClass('dimmedEdge')
        } else {
            node.data('isHighlighted', false)
            node.parent().data('isHighlighted', false)
            node.children().data('isHighlighted', false)
            cy.nodes().removeClass(['highlightedNode', 'dimmedNode'])
            cy.edges().removeClass(['highlightedEdge', 'dimmedEdge'])
        }
    })
}

document.addEventListener('DOMContentLoaded', function () {
    vscode.postMessage({ type: 'state', data: 'loaded' })
})