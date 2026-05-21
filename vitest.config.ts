import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node"
  },
  resolve: {
    alias: {
      "@eco-era/game-core": fileURLToPath(new URL("./packages/game-core/src/index.ts", import.meta.url)),
      "@eco-era/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url))
    }
  }
});
