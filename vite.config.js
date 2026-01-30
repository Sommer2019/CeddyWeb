import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If deploying to GitHub Pages under a repo like https://username.github.io/repo/ set BASE to '/repo/'
const BASE = process.env.BASE_URL || '/'

export default defineConfig({
  base: BASE,
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  }
})
