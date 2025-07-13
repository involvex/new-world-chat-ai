import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'build/icon.png',
          dest: '.'
        }
      ]
    })
  ],
  base: '/new-world-chat-ai/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
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
  }
})
