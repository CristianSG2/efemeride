/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // jsdom solo expone localStorage con un origen http válido (con el
    // "about:blank" por defecto queda undefined)
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    setupFiles: './src/test/setup.ts',
  },
})
