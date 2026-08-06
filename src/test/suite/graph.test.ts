import * as assert from 'assert'

suite('formatFileLabel', () => {
    function formatFileLabel(filePath: string, config?: any): string {
        if (!config || !config.nodeDisplayFormat) {
            return filePath
        }

        const format = config.nodeDisplayFormat
        const pathParts = filePath.split('/')
        const pathWithoutFile = pathParts.slice(0, -1).join('/')
        const fileNameWithoutExt = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, '')
        const fileExt = pathParts[pathParts.length - 1].match(/\.[^/.]+$/)?.[0]?.slice(1) || ''

        return format
            .replace(/\$fullPath/g, filePath)
            .replace(/\$fileName/g, fileNameWithoutExt)
            .replace(/\$fileExt/g, fileExt)
            .replace(/\$path\{(\d+)\}/g, (_match: string, count: string): string => {
                const segments = parseInt(count, 10)
                if (isNaN(segments) || segments <= 0) {
                    return pathWithoutFile
                }
                const dirParts = pathParts.slice(0, -1)
                return dirParts.slice(-Math.min(segments, dirParts.length)).join('/')
            })
            .replace(/\$path/g, pathWithoutFile)
    }

    test('default: returns filePath unchanged', () => {
        assert.strictEqual(formatFileLabel('src/foo.ts'), 'src/foo.ts')
    })

    test('$fullPath token', () => {
        const result = formatFileLabel('src/foo.ts', { nodeDisplayFormat: '$fullPath' })
        assert.strictEqual(result, 'src/foo.ts')
    })

    test('$fileName token', () => {
        const result = formatFileLabel('src/foo.ts', { nodeDisplayFormat: '$fileName' })
        assert.strictEqual(result, 'foo')
    })

    test('$fileExt token', () => {
        const result = formatFileLabel('src/foo.ts', { nodeDisplayFormat: '$fileExt' })
        assert.strictEqual(result, 'ts')
    })

    test('$path token', () => {
        const result = formatFileLabel('src/foo.ts', { nodeDisplayFormat: '$path' })
        assert.strictEqual(result, 'src')
    })

    test('$path{N} token with valid count', () => {
        const result = formatFileLabel('a/b/c/foo.ts', { nodeDisplayFormat: '$path{2}' })
        assert.strictEqual(result, 'b/c')
    })

    test('$path{N} token with count exceeding parts', () => {
        const result = formatFileLabel('a/b/foo.ts', { nodeDisplayFormat: '$path{10}' })
        assert.strictEqual(result, 'a/b')
    })

    test('$path{N} token with invalid count', () => {
        const result = formatFileLabel('a/b/foo.ts', { nodeDisplayFormat: '$path{0}' })
        assert.strictEqual(result, 'a/b')
    })

    test('combined tokens', () => {
        const result = formatFileLabel('src/components/button.tsx', {
            nodeDisplayFormat: '$fileName.$fileExt — $path',
        })
        assert.strictEqual(result, 'button.tsx — src/components')
    })
})

suite('trimFunctionName', () => {
    function trimFunctionName(name: string): string {
        const match = name.match(/^[a-zA-Z]+/);
        return match ? match[0] : name;
    }

    test('trims at first non-alpha character', () => {
        assert.strictEqual(trimFunctionName('getDataAsync'), 'getDataAsync')
    })

    test('strips generic parameters', () => {
        assert.strictEqual(trimFunctionName('process<T>'), 'process')
    })

    test('strips parenthesized suffix', () => {
        assert.strictEqual(trimFunctionName('handleClick (event)'), 'handleClick')
    })

    test('returns unchanged when no non-alpha prefix', () => {
        assert.strictEqual(trimFunctionName('123abc'), '123abc')
    })

    test('handles empty string', () => {
        assert.strictEqual(trimFunctionName(''), '')
    })
})

suite('findLongestCommonPrefix', () => {
    function findLongestCommonPrefix(strs: string[]): string {
        if (strs.length === 0) {
            return ""
        }

        const sorted = [...strs].sort()
        const firstStr = sorted[0]
        const lastStr = sorted[sorted.length - 1]
        let prefix = ""

        for (let i = 0; i < firstStr.length; i++) {
            if (firstStr.charAt(i) === lastStr.charAt(i)) {
                prefix += firstStr.charAt(i)
            } else {
                break
            }
        }

        return prefix
    }

    test('common prefix among strings', () => {
        assert.strictEqual(findLongestCommonPrefix(['file:///a/b/c', 'file:///a/b/d', 'file:///a/b/e']), 'file:///a/b/')
    })

    test('empty array returns empty string', () => {
        assert.strictEqual(findLongestCommonPrefix([]), '')
    })

    test('single element returns entire string', () => {
        assert.strictEqual(findLongestCommonPrefix(['file:///workspace']), 'file:///workspace')
    })

    test('no common prefix returns empty string', () => {
        assert.strictEqual(findLongestCommonPrefix(['abc', 'xyz']), '')
    })

    test('does not mutate input array', () => {
        const input = ['c', 'a', 'b']
        const original = [...input]
        findLongestCommonPrefix(input)
        assert.deepStrictEqual(input, original)
    })
})