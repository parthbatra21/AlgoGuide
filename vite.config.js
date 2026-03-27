import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        // Keep the /api prefix when proxying so backend route '/api/ask-mentor' is preserved.
        rewrite: (path) => path,
      },
    },
  },
});
