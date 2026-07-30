import React, { useMemo, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  FileManager,
  getPathStrategy,
  type FileEntry,
  type FileManagerAdapter,
  type FileManagerNotification,
} from '../src'
import './style.css'

type DemoNode = FileEntry & { content?: string }
const paths = getPathStrategy('posix')

const initialNodes: DemoNode[] = [
  directory('/workspace', 'workspace'),
  directory('/workspace/docs', 'docs'),
  file('/workspace/docs/architecture.md', '# Architecture\n\nThe shared manager is adapter-driven.'),
  file('/workspace/docs/release-notes.md', '# Release notes\n\n- File manager moved into cyber-ui.'),
  directory('/workspace/src', 'src'),
  file('/workspace/src/main.ts', "export const hello = 'cyber-ui'\n"),
  file('/workspace/src/adapter.ts', 'export interface Adapter { list(path: string): Promise<unknown> }\n'),
  file('/workspace/README.md', '# Cyber File Manager\n\nRight-click anywhere to explore file operations.'),
  file('/workspace/package.json', '{\n  "name": "file-manager-demo"\n}\n'),
]

function Demo() {
  const nodesRef = useRef(new Map(initialNodes.map((node) => [node.path, node])))
  const scopeKey = useMemo(() => `cyber-file-manager-demo-${performance.timeOrigin}`, [])
  const [notifications, setNotifications] = useState<FileManagerNotification[]>([])
  const [revision, setRevision] = useState(0)

  const adapter = useMemo<FileManagerAdapter>(() => {
    const commit = () => setRevision((value) => value + 1)
    const find = (path: string) => nodesRef.current.get(clean(path))
    return {
      pathStyle: 'posix',
      list: async (path) => {
        const normalized = clean(path)
        if (find(normalized)?.kind !== 'directory') throw new Error(`Directory not found: ${normalized}`)
        return {
          path: normalized,
          entries: [...nodesRef.current.values()]
            .filter((node) => node.path !== normalized && paths.parent(node.path) === normalized)
            .map(cloneNode),
        }
      },
      roots: async () => [{ path: '/workspace', label: 'Demo workspace' }],
      createDirectory: async (path) => {
        const normalized = clean(path)
        nodesRef.current.set(normalized, directory(normalized))
        commit()
      },
      createFile: async (path) => {
        const normalized = clean(path)
        nodesRef.current.set(normalized, file(normalized, ''))
        commit()
      },
      upload: async (upload, targetPath) => {
        const normalized = clean(targetPath)
        nodesRef.current.set(normalized, file(normalized, await upload.text()))
        commit()
      },
      download: async (entry) => {
        setNotifications((items) => [{ title: `Downloaded ${entry.name}` }, ...items].slice(0, 6))
      },
      remove: async (entry) => {
        const target = clean(entry.path)
        for (const path of [...nodesRef.current.keys()]) {
          if (path === target || path.startsWith(`${target}/`)) nodesRef.current.delete(path)
        }
        commit()
      },
      rename: async (entry, destination) => {
        const source = clean(entry.path)
        const target = clean(destination)
        const affected = [...nodesRef.current.entries()].filter(([path]) => path === source || path.startsWith(`${source}/`))
        for (const [path] of affected) nodesRef.current.delete(path)
        for (const [path, node] of affected) {
          const nextPath = `${target}${path.slice(source.length)}`
          nodesRef.current.set(nextPath, { ...node, id: nextPath, path: nextPath, name: basename(nextPath) })
        }
        commit()
      },
      copy: async (entry, destination) => {
        const source = find(entry.path)
        if (!source) throw new Error('Source not found')
        const target = clean(destination)
        nodesRef.current.set(target, { ...source, id: target, path: target, name: basename(target) })
        commit()
      },
      chmod: async (entry, mode) => {
        const path = clean(entry.path)
        const node = find(path)
        if (node) nodesRef.current.set(path, { ...node, mode })
        commit()
      },
    }
  }, [])

  return (
    <main className="flex h-full flex-col p-5" data-revision={revision}>
      <header className="mb-4 flex shrink-0 items-end justify-between gap-6">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.28em] text-primary">cyber-ui / demo</div>
          <h1 className="m-0 text-2xl font-semibold">Cyber File Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">A reusable file manager powered by an in-memory adapter.</p>
        </div>
        <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary" data-testid="demo-status">interactive adapter</div>
      </header>
      <section className="min-h-0 flex-1">
        <FileManager
          adapter={adapter}
          className="rounded-xl border border-border bg-card shadow-2xl"
          initialPath="/workspace"
          scopeKey={scopeKey}
          historyKey="cyber.fileManager.demo.history"
          notify={(notification) => setNotifications((items) => [notification, ...items].slice(0, 6))}
          renderPreview={(entry) => (
            <div className="flex h-full flex-col bg-[#071016]">
              <div className="border-b border-border px-4 py-3 font-mono text-sm text-primary">{entry.path}</div>
              <pre className="m-0 flex-1 overflow-auto p-5 text-sm leading-6 text-foreground">{findContent(nodesRef.current, entry.path)}</pre>
            </div>
          )}
        />
      </section>
      <aside className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2" aria-live="polite">
        {notifications.map((notification, index) => (
          <div key={`${notification.title}-${index}`} className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-sm shadow-xl">
            <div className="font-medium">{notification.title}</div>
            {notification.description && <div className="mt-0.5 text-xs text-muted-foreground">{notification.description}</div>}
          </div>
        ))}
      </aside>
    </main>
  )
}

function directory(path: string, name = basename(path)): DemoNode {
  return {
    id: path,
    path,
    name,
    kind: 'directory',
    mode: '0755',
    modifiedAt: Date.parse('2026-07-22T10:00:00Z'),
  }
}

function file(path: string, content: string): DemoNode {
  return {
    id: path,
    path,
    name: basename(path),
    kind: 'file',
    sizeBytes: new TextEncoder().encode(content).length,
    mode: '0644',
    modifiedAt: Date.parse('2026-07-22T10:00:00Z'),
    content,
  }
}

function cloneNode(node: DemoNode): FileEntry {
  const { content: _content, ...entry } = node
  return entry
}

function clean(path: string): string {
  return paths.normalize(path || '/')
}

function basename(path: string): string {
  return path.replace(/\/+$/, '').split('/').pop() || '/'
}

function findContent(nodes: Map<string, DemoNode>, path: string): string {
  return nodes.get(clean(path))?.content || '(empty file)'
}

declare global {
  interface Window {
    __cyberFileManagerDemoRoot?: Root
  }
}

const container = document.getElementById('root')!
const demoRoot = window.__cyberFileManagerDemoRoot || createRoot(container)
window.__cyberFileManagerDemoRoot = demoRoot
demoRoot.render(<Demo />)
