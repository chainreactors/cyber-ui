export type PathStyle = 'posix' | 'windows'

export interface FilePathStrategy {
  readonly style: PathStyle
  isAbsolute(path: string): boolean
  join(parent: string, child: string): string
  name(path: string): string
  normalize(path: string): string
  parent(path: string): string
  root(path: string): string
}

function collapseSegments(segments: string[], minimumLength = 0): string[] {
  const result: string[] = []

  for (const segment of segments) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (result.length > minimumLength) result.pop()
      continue
    }
    result.push(segment)
  }

  return result
}

const posixStrategy: FilePathStrategy = {
  style: 'posix',
  isAbsolute: (path) => path.startsWith('/'),
  normalize: (path) => {
    const value = path.trim() || '/'
    const absolute = value.startsWith('/')
    const segments = collapseSegments(value.split('/'))
    if (absolute) return segments.length ? `/${segments.join('/')}` : '/'
    return segments.join('/') || '.'
  },
  join(parent, child) {
    if (this.isAbsolute(child)) return this.normalize(child)
    const base = this.normalize(parent)
    return this.normalize(base === '/' ? `/${child}` : `${base}/${child}`)
  },
  parent(path) {
    const normalized = this.normalize(path)
    if (normalized === '/') return '/'
    const index = normalized.lastIndexOf('/')
    if (index <= 0) return normalized.startsWith('/') ? '/' : '.'
    return normalized.slice(0, index)
  },
  root: () => '/',
  name(path) {
    const normalized = this.normalize(path)
    if (normalized === '/') return '/'
    return normalized.slice(normalized.lastIndexOf('/') + 1)
  },
}

function windowsRoot(path: string): string {
  const value = path.replace(/\\/g, '/')
  if (value.startsWith('//')) {
    const [server, share] = value.slice(2).split('/').filter(Boolean)
    if (!server) return '//'
    if (!share) return `//${server}`
    return `//${server}/${share}`
  }

  const drive = value.match(/^([A-Za-z]):/)
  return drive ? `${drive[1].toUpperCase()}:/` : ''
}

const windowsStrategy: FilePathStrategy = {
  style: 'windows',
  isAbsolute: (path) => /^[A-Za-z]:(?:[\\/]|$)/.test(path) || /^[/\\]{2}/.test(path),
  normalize: (path) => {
    const value = path.trim().replace(/\\/g, '/') || 'C:/'
    const root = windowsRoot(value)

    if (root.startsWith('//')) {
      const rootSegments = root.slice(2).split('/').filter(Boolean)
      const allSegments = value.slice(2).split('/').filter(Boolean)
      const tail = collapseSegments(allSegments.slice(rootSegments.length))
      return tail.length ? `${root}/${tail.join('/')}` : root
    }

    if (root) {
      const tail = collapseSegments(value.slice(2).split('/'))
      return tail.length ? `${root}${tail.join('/')}` : root
    }

    return collapseSegments(value.split('/')).join('/') || '.'
  },
  join(parent, child) {
    if (this.isAbsolute(child)) return this.normalize(child)
    const base = this.normalize(parent)
    return this.normalize(base.endsWith('/') ? `${base}${child}` : `${base}/${child}`)
  },
  parent(path) {
    const normalized = this.normalize(path)
    const root = this.root(normalized)
    if (normalized.toLowerCase() === root.toLowerCase()) return root
    const index = normalized.lastIndexOf('/')
    const candidate = index < 0 ? root : normalized.slice(0, index)
    return candidate.length < root.length ? root : candidate
  },
  root(path) {
    return windowsRoot(this.normalize(path)) || '.'
  },
  name(path) {
    const normalized = this.normalize(path)
    const root = this.root(normalized)
    if (normalized.toLowerCase() === root.toLowerCase()) return root
    return normalized.slice(normalized.lastIndexOf('/') + 1)
  },
}

export function getPathStrategy(style: PathStyle): FilePathStrategy {
  return style === 'windows' ? windowsStrategy : posixStrategy
}

function comparablePath(path: string, style: PathStyle): string {
  const normalized = getPathStrategy(style).normalize(path)
  return style === 'windows' ? normalized.toLowerCase() : normalized
}

export function pathsEqual(left: string, right: string, style: PathStyle): boolean {
  return comparablePath(left, style) === comparablePath(right, style)
}

export function isSameOrDescendantPath(
  path: string,
  directory: string,
  style: PathStyle,
): boolean {
  const normalizedPath = comparablePath(path, style)
  const normalizedDirectory = comparablePath(directory, style)
  return normalizedPath === normalizedDirectory
    || normalizedPath.startsWith(
      normalizedDirectory.endsWith('/') ? normalizedDirectory : `${normalizedDirectory}/`,
    )
}

export function pathsOverlap(left: string, right: string, style: PathStyle): boolean {
  return isSameOrDescendantPath(left, right, style)
    || isSameOrDescendantPath(right, left, style)
}
