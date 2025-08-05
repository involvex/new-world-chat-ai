import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/new-world-chat-ai/',
  build: {
    outDir: 'docs',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index-web.tsx')
      },
      external: ['robotjs', 'electron', 'fs', 'path', 'os'],
      output: {
        globals: {
          'robotjs': 'robotjs',
          'electron': 'electron',
          'fs': 'fs',
          'path': 'path',
          'os': 'os'
        }
      }
    },
    copyPublicDir: false,
  },
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_IS_WEB': 'true',
    'global': 'globalThis',
  },
  optimizeDeps: {
    exclude: ['robotjs', 'electron']
  },
  server: {
    port: 3000,
    open: true
  }
})
