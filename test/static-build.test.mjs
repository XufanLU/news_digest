import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildStaticSite } from "../scripts/build-static.mjs";

test("static build exports generated content without private runtime data", async () => {
  const root = await mkdtemp(join(tmpdir(), "daily-digest-site-"));
  await Promise.all([
    mkdir(join(root, "web"), { recursive: true }),
    mkdir(join(root, "notes"), { recursive: true }),
    mkdir(join(root, "config"), { recursive: true }),
    mkdir(join(root, "data"), { recursive: true })
  ]);

  await Promise.all([
    writeFile(join(root, "web", "index.html"), fixtureIndex()),
    writeFile(join(root, "web", "app.js"), "console.log('site')\n"),
    writeFile(join(root, "web", "styles.css"), "body {}\n"),
    writeFile(join(root, "notes", "generated.md"), fixtureNote("generated")),
    writeFile(join(root, "notes", "draft.md"), fixtureNote("draft")),
    writeFile(join(root, "config", "channels.json"), JSON.stringify({ channels: [{ name: "Test", url: "https://youtube.com/test" }] })),
    writeFile(join(root, "data", "latest-intake.json"), JSON.stringify({ createdAt: "2026-06-17T10:00:00Z", videos: [{}] })),
    writeFile(join(root, "data", "processed-videos.json"), JSON.stringify({ videos: { one: {} } }))
  ]);

  const outputDir = join(root, "public");
  const result = await buildStaticSite({ root, outputDir });
  const data = JSON.parse(await readFile(join(outputDir, "data", "site.json"), "utf8"));
  const index = await readFile(join(outputDir, "index.html"), "utf8");

  assert.equal(result.noteCount, 1);
  assert.equal(data.notes.length, 1);
  assert.equal(data.notes[0].status, "generated");
  assert.doesNotMatch(JSON.stringify(data), /transcripts\/clean|TODO|status":"draft/);
  assert.doesNotMatch(data.notes[0].html, /Transcript:/);
  assert.match(index, /data-app-mode="static"/);
  assert.doesNotMatch(index, /id="run-intake"|id="transcript-panel"/);
});

function fixtureNote(status) {
  return `---
title: "Fixture"
channel: "Test"
video_url: "https://www.youtube.com/watch?v=abc123"
published: "2026-06-17T10:00:00Z"
transcript: "transcripts/clean/abc123.txt"
status: "${status}"
---

# Fixture

## What This Is About

Public learning content.

## Useful Examples, Tools, Or Links

- Transcript: \`transcripts/clean/abc123.txt\`
`;
}

function fixtureIndex() {
  return `<!doctype html><html><body>
    <button id="run-intake" class="local-only"><span>Run</span></button>
    <p id="run-status" class="local-only"></p>
    <p>Generated learning notes and transcript previews will appear here.</p>
    <details id="transcript-panel"><summary>Transcript</summary></details>
  </body></html>`;
}
