import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [react(), tailwindcss(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => `file-manager.${format === 'es' ? 'js' : 'cjs'}`,
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [
        'react', 'react-dom', 'react/jsx-runtime',
        'lucide-react',
      ],
    },
  },
})
