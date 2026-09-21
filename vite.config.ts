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
        interactionChoice: resolve(__dirname, "interaction-choice.html"),
        interactionOrder: resolve(__dirname, "interaction-order.html"),
        interactionFill: resolve(__dirname, "interaction-fill.html"),
        interactionPoll: resolve(__dirname, "interaction-poll.html"),
        interactionPicture: resolve(__dirname, "interaction-picture.html"),
        interactionPictureMatch: resolve(__dirname, "interaction-picture-match.html"),
        interactionSituation: resolve(__dirname, "interaction-situation.html"),
        interactionDialogue: resolve(__dirname, "interaction-dialogue.html"),
        interactionPinyinMatch: resolve(__dirname, "interaction-pinyin-match.html"),
        interactionCategory: resolve(__dirname, "interaction-category.html"),
        interactionWordBuild: resolve(__dirname, "interaction-word-build.html"),
        interactionCorrection: resolve(__dirname, "interaction-correction.html"),
        interactionListening: resolve(__dirname, "interaction-listening.html"),
        interactionReadAloud: resolve(__dirname, "interaction-read-aloud.html"),
        interactionPictureTalk: resolve(__dirname, "interaction-picture-talk.html"),
        interactionOpenQa: resolve(__dirname, "interaction-open-qa.html")
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
