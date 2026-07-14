import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Testes focados no núcleo puro (RAG threshold + wallet-lock).
// Ambiente node — nada de DOM aqui.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
