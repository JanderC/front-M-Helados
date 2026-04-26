import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://back-backend-m-helados-production.up.railway.app/', // Cambia esto por tu URL del backend
        changeOrigin: true
      }
    }
  }
})