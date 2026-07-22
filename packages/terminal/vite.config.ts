import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es', 'cjs'],
      fileName: (format) => `terminal.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'react', 'react-dom', 'react/jsx-runtime',
        '@cyber/theme',
        '@xterm/addon-fit',
        '@xterm/xterm',
        '@xterm/xterm/css/xterm.css',
        'lucide-react',
      ],
    },
  },
})
