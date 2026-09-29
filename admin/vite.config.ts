import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development, /api calls are forwarded to the NestJS server (no CORS setup needed).
// In production, set VITE_API_URL to the deployed API, e.g. https://api.fixmate.lk/api/v1
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
})
