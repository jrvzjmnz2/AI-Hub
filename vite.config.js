import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base is './' so the built site also works when served from a sub-path.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true,
    // In dev, `npm run dev` (this server, 5173) and `npm run dev:server`
    // (the Express API, 8787) run side by side. Proxying /api here means
    // the browser only ever talks to one origin, so the session cookie set
    // by the API is visible to it without any CORS setup. In production
    // there's no proxy needed - server/index.js serves the built app and
    // the API from the same port.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
})
