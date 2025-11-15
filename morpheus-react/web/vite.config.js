import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 환경변수에서 설정 가져오기
const VITE_PORT = parseInt(process.env.VITE_PORT || '5175', 10);
const VITE_API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001';

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
    port: VITE_PORT,
    proxy: {
      "/api": {
        target: VITE_API_PROXY_TARGET,
        changeOrigin: true,
      },
      "/file": {
        target: VITE_API_PROXY_TARGET,
        changeOrigin: true,
      },
      "/profile": {
        target: VITE_API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
});
