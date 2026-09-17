/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        learning: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin/index.html"),
        classroom: resolve(__dirname, "classroom.html"),
        match: resolve(__dirname, "match.html"),
        memory: resolve(__dirname, "memory.html"),
        complete: resolve(__dirname, "complete.html")
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"]
  }
});
