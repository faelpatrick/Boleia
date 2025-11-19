import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['maplibre-gl']
  },
  build: {
    commonjsOptions: {
      include: [/maplibre-gl/, /node_modules/]
    }
  }
})