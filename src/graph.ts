import { CallHierarchy } from "./call"
import * as vscode from 'vscode'
import * as path from 'path'
import { ChartographerConfig, CallSite } from './protocol'

export const getNode = (workspaceRoot: string, n: vscode.CallHierarchyItem) => {
    // Create a node with a name based on the URI, item name, and range.
    const uri = n.uri.toString().replace(workspaceRoot, '')
    return {
        id: `"${uri}#${n.name}@${n.selectionRange.start.line}:${n.selectionRange.start.character}"`,
        name: n.name,
        file: uri,
        uri: n.uri,
        line: n.selectionRange.start.line, //`${n.selectionRange.start.line}:${n.selectionRange.start.character}`,
        character: n.selectionRange.start.character,
    } as Node;
}

function trimFunctionName(name: string, pattern: string): string {
    if (!pattern) return name
    try {
        const re = new RegExp(pattern)
        const match = name.match(re)
        return match ? match[0] : name
    } catch {
        return name
    }
}

export const getCyNodes = (n: Node, config?: ChartographerConfig) => {
    const nodeName = config?.trimFunctionPattern
        ? trimFunctionName(n.name, config.trimFunctionPattern)
        : n.name;
    return [
        {
            group: 'nodes',
            data: {
                id: `node:${n.id}`,
                label: nodeName,
                parent: `file:${n.file}`,
                uri: n.uri,
                line: n.line,
                character: n.character,
            }
        } as CyNode,
        {
            group: 'nodes',
            data: {
                id: `file:${n.file}`,
                label: formatFileLabel(n.file, config),
                uri: n.uri,
                line: 0,
                character: 0,
            },
            classes: 'compound'
        } as CyNode,
    ]
}

/**
 * Format a file path using token replacement
 * Supported tokens:
 * - $path: The relative path (same as default)
 * - $path{N}: The last N segments of the path
 * - $fullPath: The full path
 * - $fileName: Just the file name
 * - $fileExt: Just the file extension
 */
export function formatFileLabel(filePath: string, config?: ChartographerConfig): string {
    // If no config or no nodeDisplayFormat, return the original path
    if (!config || !config.nodeDisplayFormat) {
        return filePath;
    }

    const format = config.nodeDisplayFormat;
    const parsedPath = path.parse(filePath);
    const pathParts = filePath.split('/');
    const pathWithoutFile = pathParts.slice(0, -1).join('/');
    const fileNameWithoutExt = parsedPath.name;
    const fileExt = parsedPath.ext.slice(1); // Remove the leading dot

    // Replace tokens
    return format
        .replace(/\$fullPath/g, filePath)
        .replace(/\$fileName/g, fileNameWithoutExt)
        .replace(/\$fileExt/g, fileExt)
        .replace(/\$path\{(\d+)\}/g, (match: string, count: string): string => {
            const segments = parseInt(count, 10);
            if (isNaN(segments) || segments <= 0) {
                return pathWithoutFile;
            }
            const dirParts = pathParts.slice(0, -1);
            return dirParts.slice(-Math.min(segments, dirParts.length)).join('/');
        })
        .replace(/\$path/g, pathWithoutFile);
}

export function getCyElems(workspaceRoot: string, edge: CallHierarchy, config?: ChartographerConfig) {
    const elems: Element[] = []

    const node = getNode(workspaceRoot, edge.item);
    elems.push(...getCyNodes(node, config))

    const callSites: CallSite[] = (edge.fromRanges || []).map(r => {
        const siteUri = edge.from ? edge.from.uri : edge.item.uri
        return {
            uri: { scheme: siteUri.scheme, authority: siteUri.authority, path: siteUri.path, query: siteUri.query, fragment: siteUri.fragment },
            line: r.start.line,
            character: r.start.character,
        }
    })

    if (edge.from) {
        const from = getNode(workspaceRoot, edge.from);
        elems.push(...getCyNodes(from, config))
        elems.push({
            group: 'edges',
            data: {
                id: `edge:${from.id}:${node.id}`,
                source: `node:${from.id}`,
                target: `node:${node.id}`,
                callSites,
            }
        })
    } else if (edge.to) {
        const to = getNode(workspaceRoot, edge.to);
        elems.push(...getCyNodes(to, config))
        elems.push({
            group: 'edges',
            data: {
                id: `edge:${node.id}:${to.id}`,
                source: `node:${node.id}`,
                target: `node:${to.id}`,
                callSites,
            }
        })
    }

    return elems;
}


export type CyNode = {
    group: 'nodes';
    data: {
        id: string;
        label: string;
        parent?: string;
        uri: vscode.Uri;
        line: number;
        character: number;
    };
    classes?: string;
};

export type CyEdge = {
    group: 'edges';
    data: {
        id: string;
        source: string;
        target: string;
        callSites?: CallSite[];
    };
};

export type Element = CyNode | CyEdge;


export type Node = {
    id: string
    name: string,
    file: string,
    uri: vscode.Uri,
    line: number,
    character: number,
}
