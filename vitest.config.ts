import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Os testes *.db.test.ts sobem Postgres (PGlite/WASM). Um arquivo por vez,
    // cada um em processo novo (a memória do WASM é devolvida entre arquivos),
    // e sem a recompilação otimizada do WASM em segundo plano (--liftoff-only),
    // que estoura memória em máquinas com pouca RAM.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { minForks: 1, maxForks: 1, execArgv: ["--liftoff-only"] } },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
