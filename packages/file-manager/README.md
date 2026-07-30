# @cyber/file-manager

Reusable React file manager for POSIX, Windows drive, UNC, and virtual file spaces.
The package owns file navigation and interaction state. Host applications provide
their transport, permissions, persistence, notifications, preview, and business
actions through explicit adapters.

## Install

```bash
pnpm add @cyber/file-manager
```

Import the published component styles once in the host application:

```ts
import '@cyber/file-manager/styles.css'
```

The package supports React 18 and React 19.

## Basic Usage

```tsx
import {
  FileManager,
  type FileManagerAdapter,
} from '@cyber/file-manager'

const adapter: FileManagerAdapter = {
  pathStyle: 'posix',
  async list(path, { signal }) {
    const response = await api.listFiles(path, { signal })
    return {
      path,
      entries: response.files.map((file) => ({
        id: file.path,
        path: file.path,
        name: file.name,
        kind: file.directory ? 'directory' : 'file',
        sizeBytes: file.size,
        modifiedAt: file.modifiedAt,
      })),
    }
  },
  createDirectory: (path, context) => api.mkdir(path, context),
  upload: (file, targetPath, context) => api.upload(file, targetPath, context),
}

export function WorkspaceFiles() {
  return (
    <FileManager
      adapter={adapter}
      initialPath="/workspace"
      locale="en"
      scopeKey="app:account:user:workspace"
    />
  )
}
```

`path`, `FileListing.path`, and every `FileEntry.path` must be canonical for the
adapter's `pathStyle`. File sizes are byte counts and modification times are Unix
timestamps in milliseconds.

## Host Integration

- Optional adapter methods determine which write operations appear.
- Mutation methods must resolve only after the backing data source confirms the
  operation completed. Job-based transports must wait for terminal success and
  reject terminal errors instead of resolving when a job is merely submitted.
- Overlapping mutation paths are locked while an operation is pending. Mutations
  on unrelated paths remain available and may run concurrently.
- `cache` accepts a versioned persistence adapter, or `false` to disable persistence.
- `getActions` adds platform actions without importing platform concepts into the package.
- `renderPreview` or `slots.preview` renders the host's file viewer.
- `notify`, `onEvent`, `onOperationError`, and `onOperationSuccess` bridge host feedback.
- `messages` overrides the complete English or Simplified Chinese catalog.
- `scopeKey` must include application, account/user, and data-source boundaries.
- Layout follows the component container: widths below 768 px use the compact
  toolbar and a directory-only tree sheet contained within the file manager,
  while wider containers show the persistent directory tree.
- Menus, sheets, and dialogs consume their own `Escape` keypress before it reaches
  an enclosing host modal.

Use the `--cyber-file-manager-*` CSS custom properties to map host theme tokens.
The same variables apply to `.cyber-file-manager-portal`, which covers menus,
dialogs, tooltips, and compact-layout sheets rendered outside the component root.
