import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Read-only live smoke test against the real Sheet. Not part of `npm run test` / `verify`.
 * Loads server env from `.env.local` etc. (never committed). Prints counts only.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./tests/support/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/live/**/*.smoke.ts"],
    env: loadEnv("development", process.cwd(), ""),
    testTimeout: 30_000,
  },
});
