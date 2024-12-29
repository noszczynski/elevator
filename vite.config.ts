import {defineConfig} from "vite";
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    include: "**/*.ts(x)",
  })],
  server: {
    watch: {
      usePolling: true
    }
  }
})