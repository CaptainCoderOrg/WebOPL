import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  resolve: {
    alias: {
      // Provide polyfill for Node.js 'util' module
      'util': path.resolve(__dirname, './src/utils/util-polyfill.ts')
    }
  },
  optimizeDeps: {
    include: ['opl3/lib/opl3'],  // Force pre-bundle with alias
    exclude: ['@malvineous/opl']
  },
  server: {
    fs: {
      // Allow serving files from node_modules
      allow: ['..']
    }
  }
})
