import type { Url } from '../types'

export type PathNode = {
  id: string
  name: string
  children: PathNode[]
  urls: Url[]
}

export function buildPathTree(urls: Url[]): PathNode[] {
  const nodeMap = new Map<string, PathNode>()

  function getOrCreate(key: string, name: string): PathNode {
    let node = nodeMap.get(key)
    if (!node) {
      node = { id: key, name, children: [], urls: [] }
      nodeMap.set(key, node)
    }
    return node
  }

  function ensurePath(segments: string[]): PathNode {
    if (segments.length === 0) return getOrCreate('/', '/')
    const key = '/' + segments.join('/')
    const node = getOrCreate(key, segments[segments.length - 1])
    const parent = ensurePath(segments.slice(0, -1))
    if (!parent.children.includes(node)) parent.children.push(node)
    return node
  }

  for (const url of urls) {
    const parts = (url.path || '/').split('/').filter(Boolean)
    if (parts.length <= 1) {
      ensurePath([]).urls.push(url)
    } else {
      ensurePath(parts.slice(0, -1)).urls.push(url)
    }
  }

  const root = nodeMap.get('/')
  return root ? [root] : []
}

export function collectFolderIDs(nodes: PathNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.children.length > 0) {
      ids.push(node.id)
      ids.push(...collectFolderIDs(node.children))
    }
  }
  return ids
}

export function pathFileName(url: Url): string {
  const p = url.path || '/'
  const idx = p.lastIndexOf('/')
  return idx >= 0 ? p.slice(idx + 1) || '/' : p
}
