#!/usr/bin/env node
// Shows the app's shared screens in a browser, for when there is no simulator at hand (a
// cloud session, CI). It serves the web export and forwards API calls to a local Worker as
// if they came from the app. A preview only: platform code under src/platform does not run
// here, and what ships is the iOS and Android builds.
//
//   npm run preview            (builds the web export, then serves it on :8099)
//   WORKER=http://localhost:8787 PORT=8099 node scripts/preview-web.mjs
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const worker = new URL(process.env.WORKER ?? "http://localhost:8787");
const port = Number(process.env.PORT ?? 8099);
const root = resolve(fileURLToPath(import.meta.url), "../../dist/web");
if (!existsSync(join(root, "index.html"))) {
  console.error("No web export found. Run `npm run preview`, which builds it first.");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".css": "text/css",
  ".ico": "image/x-icon",
};
const API = /^\/(health|__build|api|rpc)(\/|$|\?)/;

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  if (API.test(url.pathname)) {
    // A browser names this preview's address as the Origin, which the Worker would refuse as
    // another site. The native app is trusted by its URL scheme instead; here the request is
    // passed on as the Worker's own.
    const headers = new Headers();
    if (request.headers.origin) headers.set("origin", worker.origin);
    for (const [name, value] of Object.entries(request.headers)) {
      if (
        typeof value === "string" &&
        !["host", "origin", "referer", "connection", "content-length"].includes(name) &&
        !name.startsWith("sec-")
      ) {
        headers.set(name, value);
      }
    }
    const body = ["GET", "HEAD"].includes(request.method ?? "GET")
      ? undefined
      : await new Response(request).arrayBuffer();
    const upstream = await fetch(new URL(url.pathname + url.search, worker), {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
    const out = {};
    upstream.headers.forEach((value, name) => {
      // The page here is the app's own bundle, not one the Worker rendered.
      if (!["content-encoding", "content-length", "content-security-policy", "set-cookie"].includes(name))
        out[name] = value;
    });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) out["set-cookie"] = cookies;
    response.writeHead(upstream.status, out);
    response.end(Buffer.from(await upstream.arrayBuffer()));
    return;
  }
  const file = join(root, normalize(url.pathname));
  const target = file.startsWith(root) && existsSync(file) && statSync(file).isFile() ? file : join(root, "index.html");
  response.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" });
  createReadStream(target).pipe(response);
}).listen(port, () => console.log(`Mobile preview on http://localhost:${port} → API at ${worker.origin}`));
