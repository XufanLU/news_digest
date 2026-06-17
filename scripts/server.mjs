#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { extname, join, normalize, relative, resolve } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createNoteRecord, parseFrontmatter, renderMarkdown } from "./content.mjs";

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "web");
const HIGHLIGHTS_PATH = join(ROOT, "data", "highlights.json");
const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? "127.0.0.1";

let runningIntake = null;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/summary") {
      return sendJson(res, await getSummary());
    }

    if (url.pathname === "/api/notes") {
      return sendJson(res, await getNotes());
    }

    const highlightsMatch = url.pathname.match(/^\/api\/notes\/(.+)\/highlights$/);
    if (highlightsMatch && req.method === "PUT") {
      const noteId = decodeURIComponent(highlightsMatch[1]);
      return sendJson(res, await saveNoteHighlights(noteId, await readRequestJson(req)));
    }

    if (url.pathname.startsWith("/api/notes/")) {
      const noteId = decodeURIComponent(url.pathname.replace("/api/notes/", ""));
      return sendJson(res, await getNote(noteId));
    }

    if (url.pathname === "/api/intake" && req.method === "POST") {
      return sendJson(res, await runIntake());
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, { error: error.message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Learning app running at http://${HOST}:${PORT}`);
});

async function getSummary() {
  const [channels, latestIntake, processed, notes] = await Promise.all([
    readJson(join(ROOT, "config", "channels.json"), { channels: [] }),
    readJson(join(ROOT, "data", "latest-intake.json"), { videos: [] }),
    readJson(join(ROOT, "data", "processed-videos.json"), { videos: {} }),
    getNotes()
  ]);

  return {
    channels: channels.channels ?? [],
    dailyLimit: channels.dailyLimit ?? 3,
    perChannelLimit: channels.perChannelLimit ?? channels.dailyLimit ?? 3,
    lookbackDays: channels.lookbackDays ?? 30,
    candidateLimit: channels.candidateLimit ?? 15,
    latestRun: latestIntake,
    processedCount: Object.keys(processed.videos ?? {}).length,
    noteCount: notes.length
  };
}

async function getNotes() {
  const notesDir = join(ROOT, "notes");
  if (!existsSync(notesDir)) return [];

  const files = (await readdir(notesDir))
    .filter((file) => file.endsWith(".md"))
    .sort()
    .reverse();

  const notes = await Promise.all(files.map(async (file) => {
    const filePath = join(notesDir, file);
    const markdown = await readFile(filePath, "utf8");
    const note = createNoteRecord(file, markdown);
    return {
      ...note,
      path: filePath,
      html: undefined
    };
  }));

  return notes;
}

async function getNote(noteId) {
  const notePath = safeJoin(join(ROOT, "notes"), noteId);
  if (!notePath.endsWith(".md") || !existsSync(notePath)) {
    throw new Error("Note not found");
  }

  const markdown = await readFile(notePath, "utf8");
  const meta = parseFrontmatter(markdown);
  let transcript = "";
  if (meta.transcript) {
    const transcriptPath = safeJoin(ROOT, meta.transcript);
    if (existsSync(transcriptPath)) {
      transcript = await readFile(transcriptPath, "utf8");
    }
  }

  return {
    id: noteId,
    markdown,
    html: renderMarkdown(markdown),
    meta,
    highlights: await getNoteHighlights(noteId),
    transcript
  };
}

async function getNoteHighlights(noteId) {
  const highlights = await readJson(HIGHLIGHTS_PATH, {});
  return Array.isArray(highlights[noteId]) ? highlights[noteId] : [];
}

async function saveNoteHighlights(noteId, payload) {
  const notePath = safeJoin(join(ROOT, "notes"), noteId);
  if (!notePath.endsWith(".md") || !existsSync(notePath)) {
    throw new Error("Note not found");
  }

  const highlights = Array.isArray(payload.highlights)
    ? payload.highlights
      .map(normalizeHighlight)
      .filter(Boolean)
      .sort((a, b) => a.start - b.start || a.end - b.end)
    : [];

  const allHighlights = await readJson(HIGHLIGHTS_PATH, {});
  if (highlights.length) {
    allHighlights[noteId] = highlights;
  } else {
    delete allHighlights[noteId];
  }
  await mkdir(join(ROOT, "data"), { recursive: true });
  await writeFile(HIGHLIGHTS_PATH, `${JSON.stringify(allHighlights, null, 2)}\n`);

  return { highlights };
}

function normalizeHighlight(highlight) {
  const start = Number(highlight.start);
  const end = Number(highlight.end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
    return null;
  }

  return { start, end, color: "yellow" };
}

async function runIntake() {
  if (runningIntake) {
    return { running: true, message: "Intake is already running." };
  }

  runningIntake = runCommand("npm", ["run", "intake"]);
  try {
    const result = await runningIntake;
    return { running: false, ...result };
  } finally {
    runningIntake = null;
  }
}

function runCommand(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd: ROOT });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", (code) => {
      resolvePromise({ code, output: output.trim() });
    });
  });
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = safeJoin(PUBLIC_DIR, requested);
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

  res.writeHead(200, { "Content-Type": type });
  res.end(await readFile(filePath));
}

function safeJoin(base, target) {
  const filePath = resolve(base, target.replace(/^\/+/, ""));
  const rel = relative(resolve(base), filePath);
  if (rel.startsWith("..") || normalize(rel).startsWith("..")) {
    throw new Error("Invalid path");
  }
  return filePath;
}

async function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(await readFile(filePath, "utf8"));
}

function readRequestJson(req) {
  return new Promise((resolvePromise, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 100_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
