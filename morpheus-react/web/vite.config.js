import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  root: "web",
  base: "./",
  build: {
    outDir: "../assets/res/www/web",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { 
    proxy: {
      "/file": "http://127.0.0.1:3000",
    },
  },
});
