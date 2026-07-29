import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // music-metadata-browser pulls in readable-stream, which expects Node's
  // `global` to exist.
  define: {
    global: 'globalThis',
  },
})
