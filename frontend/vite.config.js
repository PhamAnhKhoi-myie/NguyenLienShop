import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react'
          }

          if (
            id.includes('/@tanstack/react-query/') ||
            id.includes('/axios/')
          ) {
            return 'query'
          }

          if (id.includes('/recharts/')) {
            return 'charts'
          }

          return 'vendor'
        },
      },
    },
  },
})
