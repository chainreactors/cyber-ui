import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'tailwind-preset': 'src/tailwind-preset.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entry) => {
        const ext = format === 'es' ? 'js' : 'cjs'
        return entry === 'index' ? `theme.${ext}` : `${entry}.${ext}`
      },
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'tailwindcss', 'tailwindcss-animate'],
    },
  },
})
