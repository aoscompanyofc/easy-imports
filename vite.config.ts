import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-ui': ['react-hot-toast', 'clsx', 'tailwind-merge'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['date-fns', 'zustand'],
        },
      },
    },
  },
})
