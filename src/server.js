import "./lib/env.js";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { createDependencies } from "./wiring.js";

// The built client (npm run build in client/) is served by the same server when it exists.
const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");

const deps = await createDependencies({ prisma, clientDir: existsSync(clientDir) ? clientDir : undefined });
const app = createApp(deps);
const port = Number(process.env.PORT || 3000);
const named = deps.release ? `, release ${deps.release}` : "";

// NFR-006: with TLS_CERT_FILE and TLS_KEY_FILE the server answers only over HTTPS, and HTTP_REDIRECT_PORT, if
// set, answers plain HTTP with a permanent redirect to the HTTPS address, so nothing is served in the clear.
if (deps.https) {
  const tls = { cert: readFileSync(process.env.TLS_CERT_FILE), key: readFileSync(process.env.TLS_KEY_FILE) };
  https.createServer(tls, app).listen(port, () => console.log(`CivicConnect listening over HTTPS on port ${port}${named}`));
  const redirectPort = Number(process.env.HTTP_REDIRECT_PORT);
  if (redirectPort) {
    http
      .createServer((req, res) => {
        const host = (req.headers.host ?? "localhost").replace(/:\d+$/, "");
        res.writeHead(301, { Location: `https://${host}:${port}${req.url}` }).end();
      })
      .listen(redirectPort, () => console.log(`Redirecting HTTP on port ${redirectPort} to HTTPS`));
  }
} else {
  app.listen(port, () => console.log(`CivicConnect listening on port ${port}${named}`));
}
