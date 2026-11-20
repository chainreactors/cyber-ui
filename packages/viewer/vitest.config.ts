import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Component tests import the working tree, not a previously built `dist`:
// the sibling packages are consumed as sources here, exactly as a host does
// through its own resolve aliases.
const source = (name: string) => fileURLToPath(new URL(`../${name}/src`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@cyber/aop': source('aop'),
      '@cyber/file-manager': source('file-manager'),
      '@cyber/markdown': source('markdown'),
      '@cyber/theme': source('theme'),
      '@cyber/traffic': source('traffic'),
      '@cyber/ui': source('ui'),
    },
  },
})
