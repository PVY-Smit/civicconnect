import "./lib/env.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { createDependencies } from "./wiring.js";

// The built client (npm run build in client/) is served by the same server when it exists.
const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");

const deps = await createDependencies({ prisma, clientDir: existsSync(clientDir) ? clientDir : undefined });
const app = createApp(deps);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`CivicConnect listening on port ${port}${deps.release ? `, release ${deps.release}` : ""}`);
});
