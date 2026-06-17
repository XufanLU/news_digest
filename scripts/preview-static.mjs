#!/usr/bin/env node
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, relative, resolve } from "node:path";

const ROOT = join(process.cwd(), "dist");
const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? "127.0.0.1";

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const filePath = safeJoin(ROOT, requested);

    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const type = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    }[extname(filePath)] ?? "text/plain; charset=utf-8";

    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(await readFile(filePath));
  } catch (error) {
    res.writeHead(500);
    res.end(error.message);
  }
}).listen(PORT, HOST, () => {
  console.log(`Static site preview running at http://${HOST}:${PORT}`);
});

function safeJoin(base, target) {
  const filePath = resolve(base, target);
  const rel = relative(resolve(base), filePath);
  if (rel.startsWith("..") || normalize(rel).startsWith("..")) throw new Error("Invalid path");
  return filePath;
}
