// Vite builds the client into client/dist, which the Express application serves, so CivicConnect stays one
// deployable unit (ADR-001). In development, /api is proxied to the Express server on port 3000, so the
// browser talks to one origin and the session cookie works the same way it does when deployed.

import { defineConfig } from "vite";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.API_ORIGIN ?? "http://localhost:3000", changeOrigin: false } },
  },
  build: { outDir: "dist", sourcemap: true },
});
