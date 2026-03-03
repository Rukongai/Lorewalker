import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'packages/web'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'packages/web/src'),
      '@lorewalker/core': resolve(__dirname, 'packages/core/src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules/@xyflow') || id.includes('node_modules/dagre') || id.includes('node_modules/@dagrejs')) {
            return 'vendor-graph'
          }
          if (id.includes('node_modules/@codemirror')) {
            return 'vendor-editor'
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'packages/web/src/test-setup.ts')],
    exclude: ['**/references/**', 'node_modules/**', '.worktrees/**'],
  },
})
