import type cytoscape from 'cytoscape'

export type Direction = 'Incoming' | 'Outgoing' | 'Both'
export type LayoutAlgorithm = 'klay' | 'elk' | 'dagre'

export interface ChartographerConfig {
    highlightRoots?: boolean
    highlightLeaves?: boolean
    defaultGraphLayoutAlgorithm?: LayoutAlgorithm
    colorScheme?: string
    nodeDisplayFormat?: string
    trimFunctionPattern?: string
    wheelSensitivity?: number
    showFileGroupBox?: boolean
    showFileGroupLabel?: boolean
    colors?: {
        nodeBackgroundColor?: string
        nodeColor?: string
        nodeBorderColor?: string
        highlightedLeafNodeBackgroundColor?: string
        highlightedLeafNodeColor?: string
        highlightedRootNodeBackgroundColor?: string
        highlightedRootNodeColor?: string
        nodeGroupBackgroundColor?: string
        edgeLineColor?: string
        edgeArrowColor?: string
        searchHighlightBackgroundColor?: string
        searchHighlightColor?: string
        searchHighlightBorderColor?: string
    }
}

export interface WebviewState {
    config: ChartographerConfig
    elems: cytoscape.ElementDefinition[]
}

export type WebviewToExtensionMessage =
    | { type: 'state'; data: 'loaded' | 'ready' }
    | { type: 'goToFunction'; data: string }
    | { type: 'expandBoth'; data: { id: string; depth: number } }

export type ExtensionToWebviewMessage =
    | { type: 'setParams'; data: { config: ChartographerConfig } }
    | { type: 'addElems'; data: cytoscape.ElementDefinition[] }