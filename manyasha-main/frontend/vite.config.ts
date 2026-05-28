import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_DEV_API_PROXY?.trim() || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    // Основная зона правок — public/mascot-design-preview.html (лендос/макет Маняши)
    open: process.env.SKIP_VITE_OPEN
      ? false
      : '/mascot-design-preview.html',
    proxy: {
      '/api': apiProxyTarget,
    },
  },
  preview: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
})
