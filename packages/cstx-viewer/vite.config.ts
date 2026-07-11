import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: [
      {
        find: '@cyber/cstx',
        replacement: fileURLToPath(new URL('../cstx/src', import.meta.url)),
      },
      {
        find: '@cyber/graph',
        replacement: fileURLToPath(new URL('../graph/src', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-graphics': [
            'sigma',
            'graphology',
            'graphology-layout',
            'graphology-layout-forceatlas2',
          ],
          'vendor-charts': ['recharts'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: true,
    port: 5174,
  },
})
