import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Compiled to dist-electron/main.js
        entry: 'electron/main.ts',
      },
      preload: {
        // Compiled to dist-electron/preload.mjs
        input: 'electron/preload.ts',
      },
    }),
  ],
})
