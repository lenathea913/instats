import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Kunci port: localStorage terikat ke URL persis (localhost:5173),
    // jadi jika port pindah otomatis, data akan terlihat "hilang".
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]'
      }
    }
  },
})
