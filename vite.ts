import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ensure assets are emitted with relative paths so the site works when deployed
export default defineConfig({
  base: './',
  plugins: [react()],
})
