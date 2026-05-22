import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:6789',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:6789',
        ws: true,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:6789',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: true, // cleans up existing files in public/ on build
  }
})
